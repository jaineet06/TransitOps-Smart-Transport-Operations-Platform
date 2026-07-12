import { useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon } from 'lucide-react';
import { authApi } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import { ROLE_LABELS } from '../../lib/constants';

export default function Topbar({ title }) {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // swallow — clear anyway
    }
    clearAuth();
    navigate('/login');
  };

  return (
    <header className="h-14 border-b border-base-700 bg-base-950 flex items-center justify-between px-6 shrink-0">
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
