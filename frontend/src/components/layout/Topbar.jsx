import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon, Bell, Mail, Loader2, Check } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { notificationsApi } from '../../api/notifications.api';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { ROLE_LABELS } from '../../lib/constants';
import { cn, formatDate } from '../../lib/utils';

export default function Topbar({ title }) {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const [notifications, setNotifications] = useState({
    licenseAlerts: [],
    maintenanceAlerts: [],
    tripDelayAlerts: [],
    utilizationAlerts: [],
    totalCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingEmailFor, setSendingEmailFor] = useState(null);
  const [sentDrivers, setSentDrivers] = useState(new Set());

  const panelRef = useRef(null);
  const isSafetyOfficer = user?.role === 'SafetyOfficer';

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await notificationsApi.getNotifications();
      setNotifications(data.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch initial notifications on mount for badge count
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Refetch notifications on open
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Handle clicking outside to close panel
  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // swallow — clear anyway
    }
    clearAuth();
    navigate('/login');
  };

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const { data } = await notificationsApi.sendLicenseReminders();
      toast.success(`Reminders sent to ${data.sent} drivers`);
      if (notifications.licenseAlerts) {
        setSentDrivers((prev) => {
          const next = new Set(prev);
          notifications.licenseAlerts.forEach((a) => next.add(a.driverId));
          return next;
        });
      }
      fetchNotifications();
    } catch (err) {
      console.error('Failed to send reminders:', err);
      const errMsg = err.response?.data?.error || 'Failed to send reminder email';
      toast.error(errMsg);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendIndividualEmail = async (driverId) => {
    setSendingEmailFor(driverId);
    try {
      await notificationsApi.sendLicenseReminders({ driverId });
      toast.success('Reminder sent directly to driver');
      setSentDrivers((prev) => {
        const next = new Set(prev);
        next.add(driverId);
        return next;
      });
      fetchNotifications();
    } catch (err) {
      console.error('Failed to send reminder:', err);
      const errMsg = err.response?.data?.error || 'Failed to send reminder';
      toast.error(errMsg);
    } finally {
      setSendingEmailFor(null);
    }
  };

  return (
    <header className="h-14 border-b border-base-700 bg-base-950 flex items-center justify-between px-6 shrink-0 relative">
      {/* Page title */}
      <h1 className="text-base font-semibold text-ink">{title}</h1>

      {/* User info + logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <p className="text-sm font-medium text-ink leading-none">{user?.name}</p>
            <p className="text-2xs text-ink-subtle mt-0.5">{ROLE_LABELS[user?.role] ?? user?.role}</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-accent-muted border border-accent flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-accent">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        </div>

        <div className="w-px h-5 bg-base-700" />

        {/* Notification Bell + Dropdown */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setIsOpen(prev => !prev)}
            className="relative flex items-center justify-center w-8 h-8 rounded text-ink-muted hover:text-ink hover:bg-base-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {notifications.totalCount > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[9px] font-bold text-white ring-2 ring-base-950">
                {notifications.totalCount}
              </span>
            )}
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[480px] overflow-y-auto rounded-lg border border-base-700 bg-base-900/95 backdrop-blur-md shadow-modal z-50 flex flex-col p-4 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-base-700 mb-3 shrink-0">
                <span className="text-sm font-semibold text-ink">Alert Center</span>
                {notifications.totalCount > 0 && (
                  <span className="bg-base-700 text-ink-muted text-2xs font-semibold px-2 py-0.5 rounded-full">
                    {notifications.totalCount} active
                  </span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pr-1">
                {loading ? (
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <div className="h-3 w-20 skeleton-shimmer" />
                      <div className="h-14 w-full skeleton-shimmer" />
                      <div className="h-14 w-full skeleton-shimmer" />
                    </div>
                  </div>
                ) : (
                  <>
                    {/* License Expiry Section */}
                    {notifications.licenseAlerts.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">License Expiry</h4>
                          {isSafetyOfficer && (
                            <button
                              onClick={handleSendEmail}
                              disabled={sendingEmail}
                              className="flex items-center gap-1 text-[10px] font-semibold text-ink-muted hover:text-ink transition-colors disabled:opacity-50"
                              title="Send reminder to all affected drivers"
                            >
                              {sendingEmail ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Mail className="w-2.5 h-2.5" />}
                              <span>Send All</span>
                            </button>
                          )}
                        </div>
                        <div className="divide-y divide-base-800">
                          {notifications.licenseAlerts.map(alert => {
                            const isSent = sentDrivers.has(alert.driverId);
                            return (
                              <div
                                key={alert.id}
                                onClick={() => {
                                  setIsOpen(false);
                                  navigate('/drivers');
                                }}
                                className="py-2.5 flex items-center justify-between gap-3 hover:bg-base-900/40 transition-colors cursor-pointer text-left"
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <span className={cn(
                                    "w-1.5 h-1.5 rounded-full shrink-0 mt-1.5",
                                    alert.severity === 'expired' ? "bg-danger" : "bg-warning"
                                  )} />
                                  <div className="min-w-0">
                                    <p className="text-xs text-ink leading-normal font-medium">{alert.text}</p>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-subtle font-mono">
                                      <span>No: {alert.licenseNumber}</span>
                                      <span>•</span>
                                      <span>Expires: {formatDate(alert.licenseExpiryDate)}</span>
                                    </div>
                                  </div>
                                </div>
                                {isSafetyOfficer && (
                                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                                    {isSent ? (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/10">
                                        <Check className="w-2.5 h-2.5" />
                                        <span>Sent</span>
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleSendIndividualEmail(alert.driverId)}
                                        disabled={sendingEmailFor === alert.driverId}
                                        className="p-1 rounded bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 transition-colors disabled:opacity-50"
                                        title="Send reminder to this driver"
                                      >
                                        {sendingEmailFor === alert.driverId ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <Mail className="w-3.5 h-3.5" />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Maintenance Section */}
                    {notifications.maintenanceAlerts.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider mb-2">Maintenance Due</h4>
                        <div className="divide-y divide-base-800">
                          {notifications.maintenanceAlerts.map(alert => (
                            <div
                              key={alert.id}
                              onClick={() => {
                                setIsOpen(false);
                                navigate('/maintenance');
                              }}
                              className="py-2.5 flex items-start gap-2.5 hover:bg-base-900/40 transition-colors cursor-pointer text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0 mt-1.5" />
                              <div className="min-w-0">
                                <p className="text-xs text-ink leading-normal font-medium">{alert.text}</p>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-ink-subtle font-mono">
                                  <span>Reg: {alert.registrationNumber}</span>
                                  <span>•</span>
                                  <span>{alert.daysSinceService} days since service</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Trip Delays Section */}
                    {notifications.tripDelayAlerts && notifications.tripDelayAlerts.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider mb-2">Trip Delays</h4>
                        <div className="divide-y divide-base-800">
                          {notifications.tripDelayAlerts.map(alert => (
                            <div
                              key={alert.id}
                              onClick={() => {
                                setIsOpen(false);
                                navigate('/trips');
                              }}
                              className="py-2.5 flex items-start gap-2.5 hover:bg-base-900/40 transition-colors cursor-pointer text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-warning shrink-0 mt-1.5" />
                              <div className="min-w-0">
                                <p className="text-xs text-ink leading-normal font-medium">{alert.text}</p>
                                <div className="text-[10px] text-ink-subtle font-mono mt-1">
                                  <span>Active Transit Alert</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fleet Warnings Section */}
                    {notifications.utilizationAlerts && notifications.utilizationAlerts.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider mb-2">Fleet Warnings</h4>
                        <div className="divide-y divide-base-800">
                          {notifications.utilizationAlerts.map(alert => (
                            <div
                              key={alert.id}
                              onClick={() => {
                                setIsOpen(false);
                                navigate('/analytics');
                              }}
                              className="py-2.5 flex items-start gap-2.5 hover:bg-base-900/40 transition-colors cursor-pointer text-left"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0 mt-1.5" />
                              <div className="min-w-0">
                                <p className="text-xs text-ink leading-normal font-medium">{alert.text}</p>
                                <div className="text-[10px] text-ink-subtle font-mono mt-1">
                                  <span>Low Performance Warning</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {notifications.totalCount === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success mb-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <p className="text-sm font-semibold text-ink">No alerts right now</p>
                        <p className="text-2xs text-ink-subtle mt-0.5">All drivers and vehicles are compliant.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-px h-5 bg-base-700" />

        <button
          onClick={toggleTheme}
          className="flex items-center justify-center w-8 h-8 rounded text-ink-muted hover:text-ink hover:bg-base-800 transition-colors"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-warning" /> : <Moon className="w-4 h-4" />}
        </button>

        <div className="w-px h-5 bg-base-700" />

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm text-ink-muted hover:text-danger hover:bg-danger/10 transition-colors"
          title="Logout"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </header>
  );
}

