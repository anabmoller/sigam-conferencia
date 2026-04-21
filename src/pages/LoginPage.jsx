import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth-context.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardBody } from '../components/ui/Card.jsx';

export default function LoginPage() {
  const { session, loading } = useAuth();
  const loc = useLocation();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (loading) return null;
  if (session) return <Navigate to={loc.state?.from?.pathname || '/'} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const u = username.trim().toLowerCase();
    if (!u) {
      setError('Ingresá tu usuario.');
      return;
    }
    if (!/^\d{6}$/.test(pin)) {
      setError('El PIN debe ser de 6 dígitos.');
      return;
    }
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: `${u}@sigam.internal`,
      password: pin,
    });
    setSubmitting(false);
    if (err) {
      const msg = err.message?.toLowerCase() ?? '';
      if (msg.includes('invalid') || msg.includes('credentials')) {
        setError('Usuario o PIN incorrecto.');
      } else if (msg.includes('rate') || msg.includes('too many')) {
        setError('Demasiados intentos. Esperá 1 minuto.');
      } else {
        setError(err.message);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sigam-bg px-4">
      <Link to="/" className="font-headline text-4xl text-navy mb-2">
        <span className="text-mustard">AM</span> SIGAM Trazabilidad
      </Link>
      <p className="text-sm text-sigam-muted mb-6">Ingresá con tu usuario y PIN.</p>

      <Card className="w-full max-w-sm">
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="block text-sm font-medium text-navy mb-1">Usuario</span>
              <input
                type="text"
                name="username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                className="w-full rounded-lg border border-sigam-border bg-white px-3 py-2 text-sm text-sigam-text placeholder-sigam-muted focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
                placeholder="tu usuario"
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-navy mb-1">PIN</span>
              <input
                type="tel"
                name="pin"
                inputMode="numeric"
                autoComplete="current-password"
                pattern="\d{6}"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-lg border border-sigam-border bg-white px-3 py-2 text-xl font-mono tracking-[0.4em] text-center text-sigam-text focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
                placeholder="••••••"
              />
            </label>

            {error && <p className="text-sm text-burgundy">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
