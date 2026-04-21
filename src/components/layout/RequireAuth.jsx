import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.jsx';

export function RequireAuth({ children }) {
  const { session, loading } = useAuth();
  const loc = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sigam-muted text-sm">
        Cargando sesión…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}
