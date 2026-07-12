import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { NAV_ITEMS } from '../../lib/constants';
import useAuthStore from '../../store/authStore';

export default function Sidebar() {
  const role = useAuthStore((s) => s.user?.role);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="fixed top-0 left-0 h-screen w-56 bg-base-900 border-r border-base-700 flex flex-col z-40">
      {/* Logo / Brand */}
      <div className="px-5 py-5 border-b border-base-700">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-accent rounded flex items-center justify-center shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v1h12.438l-1.657 6H4v2h9.5a1 1 0 00.97-.757l2-7.5A1 1 0 0015.5 5H3V4z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink leading-none">TransitOps</p>
            <p className="text-2xs text-ink-subtle mt-0.5">Operations Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-2 mb-2 text-2xs font-semibold text-ink-subtle uppercase tracking-widest">
          Navigation
        </p>
        <ul className="space-y-0.5">
          {visibleItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center px-3 py-2 rounded text-sm transition-colors duration-100',
                    isActive
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-ink-muted hover:text-ink hover:bg-base-800',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer version indicator */}
      <div className="px-5 py-3 border-t border-base-700">
        <p className="text-2xs text-ink-subtle">v1.0 MVP</p>
      </div>
    </aside>
  );
}
