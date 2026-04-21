import { Navigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context.jsx';

export function RequireAdmin({ children }) {
  const { operador, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sigam-muted text-sm">
        Verificando permisos…
      </div>
    );
  }
  if (!operador || operador.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}
