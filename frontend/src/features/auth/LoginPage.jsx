import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import useAuthStore from '../../store/authStore';
import { extractError, zodErrorMap } from '../../lib/utils';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, isAuthenticated, isLoading } = useAuthStore();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-base-950">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse(form);
    if (!result.success) {
      setErrors(zodErrorMap(result.error));
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.login(result.data);
      setAuth({
        user: data.data.user,
        accessToken: data.data.accessToken,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 bg-accent rounded-md flex items-center justify-center">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                <path d="M3 4a1 1 0 00-1 1v1h12.438l-1.657 6H4v2h9.5a1 1 0 00.97-.757l2-7.5A1 1 0 0015.5 5H3V4z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-ink leading-none">TransitOps</p>
              <p className="text-xs text-ink-subtle mt-0.5">Transport Operations Platform</p>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-ink">Sign in</h1>
          <p className="text-sm text-ink-muted mt-1">Access your operational dashboard</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate id="login-form">
          <Input
            id="email"
            name="email"
            label="Email address"
            type="email"
            autoComplete="email"
            placeholder="you@transitops.com"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
          />
          <Input
            id="password"
            name="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />

          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="w-full mt-2"
            id="login-submit"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        {/* Demo credentials hint */}
        <div className="mt-8 p-3 rounded bg-base-900 border border-base-700">
          <p className="text-2xs font-semibold text-ink-subtle uppercase tracking-wider mb-2">
            Demo accounts (Password123!)
          </p>
          <div className="space-y-1 text-xs text-ink-muted font-mono">
            <p>fleetmanager@transitops.com</p>
            <p>dispatcher@transitops.com</p>
            <p>safetyofficer@transitops.com</p>
            <p>financialanalyst@transitops.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
