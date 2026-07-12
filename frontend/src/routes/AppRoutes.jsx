import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';
import AppShell from '../components/layout/AppShell';
import LoginPage from '../features/auth/LoginPage';
import NotAuthorized from '../features/auth/NotAuthorized';
import DashboardPage from '../features/dashboard/DashboardPage';
import VehiclesPage from '../features/vehicles/VehiclesPage';
import DriversPage from '../features/drivers/DriversPage';
import TripsPage from '../features/trips/TripsPage';
import MaintenancePage from '../features/maintenance/MaintenancePage';
import FuelExpensesPage from '../features/fuelExpenses/FuelExpensesPage';
import AnalyticsPage from '../features/analytics/AnalyticsPage';

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
          
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/fuel-expenses" element={<FuelExpensesPage />} />
          
          {/* Restricted to FinancialAnalyst & FleetManager */}
          <Route element={<RoleRoute roles={['FinancialAnalyst', 'FleetManager']} />}>
            <Route path="/analytics" element={<AnalyticsPage />} />
          </Route>
        </Route>
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

