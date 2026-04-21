import { Link, NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useAuth } from '../../lib/auth-context.jsx';

const NAV = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/scan', label: 'Escanear' },
  { to: '/conferencias', label: 'Conferencias' },
];

export function Navbar() {
  const { session } = useAuth();

  return (
    <header className="bg-navy text-white">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-headline text-2xl text-mustard">AM</span>
          <span className="font-headline text-lg">SIGAM Trazabilidad</span>
        </Link>
        <nav className="flex items-center gap-1 ml-4">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm transition ${
                  isActive ? 'bg-mustard text-navy' : 'text-white/80 hover:text-white hover:bg-white/10'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs">
          {session ? (
            <>
              <span className="text-white/60">{session.user?.email}</span>
              <button
                onClick={() => supabase.auth.signOut()}
                className="px-3 py-1.5 rounded-md border border-white/20 hover:bg-white/10"
              >
                Salir
              </button>
            </>
          ) : (
            <Link to="/login" className="px-3 py-1.5 rounded-md bg-mustard text-navy font-medium">
              Ingresar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
