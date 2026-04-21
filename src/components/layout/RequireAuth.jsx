import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.jsx';

export function RequireAuth({ children }) {
  const { session, operador, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sigam-muted text-sm">
        Cargando sesión…
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }
  if (operador?.pin_debe_cambiar && loc.pathname !== '/cambiar-pin') {
    return <Navigate to="/cambiar-pin" replace />;
  }
  return children;
}
