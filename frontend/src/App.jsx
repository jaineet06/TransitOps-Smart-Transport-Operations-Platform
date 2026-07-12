import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { authApi } from './api/auth.api';
import useAuthStore from './store/authStore';
import useThemeStore from './store/themeStore';
import AppRoutes from './routes/AppRoutes';

function AuthBootstrap({ children }) {
  const { setAuth, clearAuth } = useAuthStore();
  const initTheme = useThemeStore((s) => s.initTheme);

  useEffect(() => {
    initTheme();
    const restoreSession = async () => {
      try {
        // Call /auth/refresh — it uses the httpOnly cookie and returns
        // { accessToken, user } in data.data. We get both in one round-trip.
        const { data } = await authApi.refresh();
        setAuth({
          accessToken: data.data.accessToken,
          user: data.data.user,          // refresh endpoint returns sanitized user
        });
      } catch {
        // No valid cookie → not logged in. clearAuth sets isLoading: false.
        clearAuth();
      }
    };
    restoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#161B27',
              color: '#E8EDF5',
              border: '1px solid #252D3D',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: { primary: '#2ABF6F', secondary: '#0D2B1E' },
            },
            error: {
              iconTheme: { primary: '#E0504A', secondary: '#2B0E0D' },
            },
          }}
        />
      </AuthBootstrap>
    </BrowserRouter>
  );
}
