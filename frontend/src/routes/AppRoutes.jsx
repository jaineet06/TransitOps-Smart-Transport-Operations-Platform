import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AppShell from '../components/layout/AppShell';
import LoginPage from '../features/auth/LoginPage';
import NotAuthorized from '../features/auth/NotAuthorized';
import DashboardPage from '../features/dashboard/DashboardPage';
import VehiclesPage from '../features/vehicles/VehiclesPage';
import DriversPage from '../features/drivers/DriversPage';
import TripsPage from '../features/trips/TripsPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/not-authorized" element={<NotAuthorized />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/vehicles" element={<VehiclesPage />} />
          <Route path="/drivers" element={<DriversPage />} />
          <Route path="/trips" element={<TripsPage />} />
          {/* Placeholders for future pages */}
          <Route path="/maintenance" element={<ComingSoon title="Maintenance Logs" />} />
          <Route path="/fuel-expenses" element={<ComingSoon title="Fuel &amp; Expenses" />} />
          <Route path="/analytics" element={<ComingSoon title="Analytics" />} />
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function ComingSoon({ title }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="text-sm text-ink-muted">This page will be available in the next sprint.</p>
    </div>
  );
}
