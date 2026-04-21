import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../lib/auth-context.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardBody } from '../components/ui/Card.jsx';

async function extractFunctionError(err, fallback) {
  try {
    const body = await err?.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    // body may not be JSON or may have been consumed — fall through
  }
  return err?.message ?? fallback;
}

export default function CambiarPinPage() {
  const { operador, refreshOperador } = useAuth();
  const navigate = useNavigate();
  const pinInicialPrefill = operador?.pin_debe_cambiar ? '123456' : '';
  const [pinActual, setPinActual] = useState(pinInicialPrefill);
  const [pinNuevo, setPinNuevo] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(pinActual) || !/^\d{6}$/.test(pinNuevo) || !/^\d{6}$/.test(pinConfirm)) {
      setError('Los tres PINs deben ser de 6 dígitos.');
      return;
    }
    if (pinNuevo !== pinConfirm) {
      setError('El PIN nuevo y la confirmación no coinciden.');
      return;
    }
    if (pinNuevo === pinActual) {
      setError('El PIN nuevo no puede ser igual al actual.');
      return;
    }

    setSubmitting(true);
    const { data, error: err } = await supabase.functions.invoke('cambiar-pin', {
      body: { pin_actual: pinActual, pin_nuevo: pinNuevo },
    });
    setSubmitting(false);

    if (err) {
      setError(await extractFunctionError(err, 'Error al cambiar el PIN.'));
      return;
    }
    if (data && data.error) {
      setError(data.error);
      return;
    }

    await refreshOperador();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sigam-bg px-4">
      <h1 className="font-headline text-3xl text-navy mb-2">Cambiar PIN</h1>
      {operador?.pin_debe_cambiar && (
        <p className="text-sm text-burgundy mb-4 text-center max-w-sm">
          Es tu primer ingreso. El PIN inicial{' '}
          <span className="font-mono">123456</span> debe ser cambiado por uno propio de 6 dígitos.
        </p>
      )}
      <Card className="w-full max-w-sm">
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <PinField label="PIN actual" value={pinActual} onChange={setPinActual} autoFocus />
            <PinField
              label="PIN nuevo"
              value={pinNuevo}
              onChange={setPinNuevo}
              hint="Elegí un PIN propio de 6 dígitos que puedas recordar."
            />
            <PinField label="Confirmar PIN nuevo" value={pinConfirm} onChange={setPinConfirm} />
            {error && <p className="text-sm text-burgundy">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Actualizando…' : 'Guardar PIN nuevo'}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

function PinField({ label, value, onChange, autoFocus = false, hint }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-navy mb-1">{label}</span>
      <input
        type="tel"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        required
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="w-full rounded-lg border border-sigam-border bg-white px-3 py-2 text-xl font-mono tracking-[0.4em] text-center text-sigam-text focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
        placeholder="••••••"
      />
      {hint && <span className="block text-xs text-sigam-muted mt-1">{hint}</span>}
    </label>
  );
}
