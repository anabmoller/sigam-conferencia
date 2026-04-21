import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardBody } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';

const ROLES = [
  { value: 'capataz', label: 'Capataz' },
  { value: 'trazabilidad', label: 'Trazabilidad' },
  { value: 'admin', label: 'Admin' },
];

const PIN_INICIAL = '123456';

async function extractFunctionError(err, fallback) {
  try {
    const body = await err?.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    // body may not be JSON or may have been consumed — fall through
  }
  return err?.message ?? fallback;
}

export default function AdminUsuariosPage() {
  const [operadores, setOperadores] = useState(null);
  const [establecimientos, setEstablecimientos] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null);

  const load = async () => {
    const [opRes, estRes] = await Promise.all([
      supabase.from('operadores').select('*').order('username'),
      supabase.from('establecimientos').select('codigo, nombre').order('codigo'),
    ]);
    if (opRes.error) setLoadError(opRes.error.message);
    else {
      setLoadError(null);
      setOperadores(opRes.data ?? []);
    }
    if (!estRes.error) setEstablecimientos(estRes.data ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const onResetPin = async (op) => {
    if (!window.confirm(`¿Resetear el PIN de ${op.username} a ${PIN_INICIAL}?`)) return;
    const { data, error } = await supabase.functions.invoke('resetear-pin', {
      body: { target_user_id: op.id },
    });
    if (error) {
      window.alert(`Error: ${await extractFunctionError(error, 'falló el reset.')}`);
      return;
    }
    if (data?.error) {
      window.alert(`Error: ${data.error}`);
      return;
    }
    window.alert(
      `PIN de ${op.username} reseteado a ${PIN_INICIAL}. Deberá cambiarlo en su próximo ingreso.`
    );
    load();
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-sigam-muted">Administración</p>
          <h1 className="font-headline text-4xl">Operadores</h1>
        </div>
        <Button onClick={() => setShowCreate(true)} variant="accent">
          Crear operador
        </Button>
      </header>

      {loadError && (
        <Card>
          <CardBody className="text-sm text-burgundy">Error: {loadError}</CardBody>
        </Card>
      )}

      {operadores === null && !loadError && (
        <Card>
          <CardBody className="text-sm text-sigam-muted">Cargando…</CardBody>
        </Card>
      )}

      {operadores !== null && operadores.length === 0 && (
        <EmptyState
          title="Sin operadores"
          description="Todavía no hay operadores creados. Hacé clic en 'Crear operador'."
        />
      )}

      {operadores !== null && operadores.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-sigam-muted border-b border-sigam-border">
                  <th className="py-2 px-4">Usuario</th>
                  <th className="py-2 px-4">Nombre</th>
                  <th className="py-2 px-4">Rol</th>
                  <th className="py-2 px-4">Estabs</th>
                  <th className="py-2 px-4">Activo</th>
                  <th className="py-2 px-4">PIN</th>
                  <th className="py-2 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {operadores.map((op) => (
                  <tr key={op.id} className="border-b border-sigam-border/60">
                    <td className="py-2 px-4 font-mono">{op.username}</td>
                    <td className="py-2 px-4">{op.nombre_completo}</td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-0.5 rounded bg-navy/10 text-navy text-xs">
                        {op.role}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-xs text-sigam-muted">
                      {op.establecimientos_asignados?.length
                        ? op.establecimientos_asignados.join(', ')
                        : '—'}
                    </td>
                    <td className="py-2 px-4">
                      {op.activo ? (
                        <span className="text-state-ok">●</span>
                      ) : (
                        <span className="text-sigam-muted">○</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-xs">
                      {op.pin_debe_cambiar ? (
                        <span className="text-state-pendiente">por cambiar</span>
                      ) : (
                        <span className="text-sigam-muted">ok</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <Button variant="outline" onClick={() => onResetPin(op)}>
                        Resetear PIN
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showCreate && (
        <CrearOperadorModal
          establecimientos={establecimientos}
          onClose={() => setShowCreate(false)}
          onSuccess={(info) => {
            setShowCreate(false);
            setCreatedInfo(info);
            load();
          }}
        />
      )}

      {createdInfo && (
        <Modal onClose={() => setCreatedInfo(null)}>
          <Card>
            <CardBody className="space-y-3">
              <h2 className="font-headline text-2xl">Operador creado</h2>
              <p className="text-sm text-sigam-muted">Entregá estos datos al operador:</p>
              <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-sigam-muted">Usuario:</dt>
                <dd className="font-mono font-semibold">{createdInfo.username}</dd>
                <dt className="text-sigam-muted">PIN inicial:</dt>
                <dd className="font-mono font-semibold">{PIN_INICIAL}</dd>
              </dl>
              <p className="text-xs text-sigam-muted">
                Al ingresar por primera vez deberá cambiar el PIN {PIN_INICIAL} por uno propio de 6
                dígitos.
              </p>
              <Button onClick={() => setCreatedInfo(null)} className="w-full">
                OK
              </Button>
            </CardBody>
          </Card>
        </Modal>
      )}
    </div>
  );
}

function CrearOperadorModal({ establecimientos, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [role, setRole] = useState('capataz');
  const [selectedEstabs, setSelectedEstabs] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const toggleEstab = (codigo) => {
    setSelectedEstabs((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { data, error: err } = await supabase.functions.invoke('create-operador', {
      body: {
        username: username.trim().toLowerCase(),
        nombre_completo: nombreCompleto.trim(),
        role,
        establecimientos_asignados: selectedEstabs.length ? selectedEstabs : null,
      },
    });
    setSubmitting(false);
    if (err) {
      setError(await extractFunctionError(err, 'Error al crear operador.'));
      return;
    }
    if (data?.error) {
      setError(data.error);
      return;
    }
    onSuccess({ username: data.username });
  };

  return (
    <Modal onClose={onClose}>
      <Card>
        <CardBody className="space-y-4">
          <h2 className="font-headline text-2xl">Crear operador</h2>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="ej: juan.perez"
              hint="3-32 caracteres: letras minúsculas, números, . _ -"
              required
            />
            <Input
              label="Nombre completo"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
            />
            <label className="block">
              <span className="block text-sm font-medium text-navy mb-1">Rol</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-sigam-border bg-white px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <span className="block text-sm font-medium text-navy mb-1">
                Establecimientos asignados
                <span className="text-xs text-sigam-muted font-normal">
                  {' '}
                  (opcional — dejá vacío para acceso a todos)
                </span>
              </span>
              <div className="max-h-40 overflow-y-auto border border-sigam-border rounded-lg p-2 space-y-1">
                {establecimientos.length === 0 ? (
                  <p className="text-xs text-sigam-muted">No hay establecimientos cargados.</p>
                ) : (
                  establecimientos.map((e) => (
                    <label key={e.codigo} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selectedEstabs.includes(e.codigo)}
                        onChange={() => toggleEstab(e.codigo)}
                      />
                      <span className="font-mono">{e.codigo}</span>
                      <span className="text-sigam-muted">{e.nombre}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            <p className="text-xs text-sigam-muted">
              El PIN inicial será <span className="font-mono">{PIN_INICIAL}</span>. El operador
              deberá cambiarlo en su primer acceso.
            </p>
            {error && <p className="text-sm text-burgundy">{error}</p>}
            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creando…' : 'Crear'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </Modal>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-navy/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
        {children}
      </div>
    </div>
  );
}
