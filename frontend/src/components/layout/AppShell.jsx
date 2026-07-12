import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

// Map paths to page titles
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/vehicles': 'Vehicle Registry',
  '/drivers': 'Driver Management',
  '/trips': 'Trip Dispatcher',
  '/maintenance': 'Maintenance Logs',
  '/fuel-expenses': 'Fuel & Expenses',
  '/analytics': 'Analytics',
};

export default function AppShell() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? 'TransitOps';

  return (
    <div className="flex h-screen bg-base-950 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-56 min-w-0">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
