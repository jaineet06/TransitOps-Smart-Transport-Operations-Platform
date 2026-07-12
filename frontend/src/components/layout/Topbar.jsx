import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';
import { ROLE_LABELS } from '../../lib/constants';
import { extractError } from '../../lib/utils';
import Badge from '../ui/Badge';

export default function Topbar({ title }) {
  const navigate = useNavigate();
  const { user, clearAuth } = useAuthStore();

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
          <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-accent">
              {user?.name?.[0]?.toUpperCase() ?? '?'}
            </span>
          </div>
        </div>
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
