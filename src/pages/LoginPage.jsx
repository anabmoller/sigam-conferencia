import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth-context.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardBody } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';

export default function LoginPage() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus('sending');
    setError(null);
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (err) {
      setError(err.message);
      setStatus('idle');
    } else {
      setStatus('sent');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sigam-bg px-4">
      <Link to="/" className="font-headline text-4xl text-navy mb-2">
        <span className="text-mustard">AM</span> SIGAM Trazabilidad
      </Link>
      <p className="text-sm text-sigam-muted mb-6">Ingresá con tu correo para acceder al sistema.</p>

      <Card className="w-full max-w-sm">
        <CardBody>
          {status === 'sent' ? (
            <div className="text-center space-y-3">
              <h2 className="font-headline text-xl">Revisá tu correo</h2>
              <p className="text-sm text-sigam-muted">
                Te enviamos un enlace mágico a <span className="font-mono">{email}</span>. Tocá el botón del
                correo para entrar.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <Input
                label="Correo electrónico"
                type="email"
                name="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
              />
              {error && <p className="text-sm text-burgundy">{error}</p>}
              <Button type="submit" className="w-full" disabled={status === 'sending'}>
                {status === 'sending' ? 'Enviando…' : 'Enviar enlace'}
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
