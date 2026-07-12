import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';

export default function NotAuthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-base-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <p className="text-5xl font-mono text-ink-subtle mb-4">403</p>
        <h1 className="text-xl font-semibold text-ink mb-2">Access Restricted</h1>
        <p className="text-sm text-ink-muted mb-6">
          You don&apos;t have permission to view this page. Contact your administrator if you believe this is an error.
        </p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
