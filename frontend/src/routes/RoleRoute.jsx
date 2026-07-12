import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import Spinner from '../components/ui/Spinner';

export default function RoleRoute({ roles }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const role = user?.role;

  if (!role) return <Navigate to="/login" replace />;
  if (!roles.includes(role)) return <Navigate to="/not-authorized" replace />;

  return <Outlet />;
}
