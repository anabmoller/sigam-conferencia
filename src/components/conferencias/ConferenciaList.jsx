import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConferencias } from '../../hooks/useConferencias.js';
import { ConferenciaCard } from './ConferenciaCard.jsx';
import { EmptyState } from '../ui/EmptyState.jsx';
import { Button } from '../ui/Button.jsx';

const ESTADOS = ['TODOS', 'DISCREPANCIA', 'PENDIENTE', 'OK', 'RESUELTA'];

export function ConferenciaList() {
  const { items, loading } = useConferencias();
  const [estado, setEstado] = useState('TODOS');
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    return items.filter((c) => {
      if (estado !== 'TODOS' && c.estado !== estado) return false;
      if (q && !c.guia_nro.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, estado, q]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2 justify-between">
        <h1 className="font-headline text-3xl">Conferencias</h1>
        <Button as={Link} to="/scan">
          Escanear nueva guía
        </Button>
      </header>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 rounded-lg border border-sigam-border bg-white p-1">
          {ESTADOS.map((e) => (
            <button
              key={e}
              onClick={() => setEstado(e)}
              className={`px-3 py-1.5 text-xs rounded-md ${
                estado === e ? 'bg-navy text-white' : 'text-navy hover:bg-sigam-bg'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar guía…"
          className="rounded-lg border border-sigam-border bg-white px-3 py-1.5 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-sm text-sigam-muted">Cargando…</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Sin conferencias"
          description="Escaneá una guía para comenzar."
          action={
            <Button as={Link} to="/scan">
              Escanear guía
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <ConferenciaCard key={c.guia_nro} c={c} />
          ))}
        </div>
      )}
    </div>
  );
}
