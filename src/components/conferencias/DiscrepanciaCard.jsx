import { useState } from 'react';
import { Button } from '../ui/Button.jsx';

const LABELS = {
  EID_FALTANTE: 'EID faltante (no llegó)',
  EID_EXTRA: 'EID extra (no estaba en origen)',
  BOTON_PERDIDO_TRANSITO: 'Bóton perdido en tránsito',
  CONTAGEM_FISICA_DIVERGENTE: 'Conteo físico divergente',
  PRECINTO_DIVERGENTE: 'Precintos divergentes',
  CHAPA_DIVERGENTE: 'Chapa divergente',
  TRANSPORTISTA_DIVERGENTE: 'Transportista divergente',
};

const MOTIVOS_BASE = [
  'Muerte en tránsito',
  'Fuga en tránsito',
  'Sustitución de bóton',
  'Error de lectura',
  'Otro',
];

export function DiscrepanciaCard({ d, onResolve, saving }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [nota, setNota] = useState('');

  const label = LABELS[d.tipo] ?? d.tipo;
  const resuelta = d.resuelta;

  const submit = () => {
    if (!motivo) return;
    onResolve({ ...d, resuelta: true, motivo, nota });
    setOpen(false);
  };

  return (
    <div className={`rounded-lg border p-3 text-sm ${resuelta ? 'border-sigam-border bg-sigam-bg' : 'border-burgundy/40 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{label}</p>
          {d.eid && <p className="font-mono text-sigam-muted">{d.eid}</p>}
          {d.detalle && (
            <pre className="text-xs text-sigam-muted whitespace-pre-wrap mt-1">
              {JSON.stringify(d.detalle, null, 2)}
            </pre>
          )}
          {resuelta && (
            <p className="text-xs text-state-ok mt-1">
              Resuelta · {d.motivo}
              {d.nota ? ` — ${d.nota}` : ''}
            </p>
          )}
        </div>
        {!resuelta && (
          <Button variant="outline" onClick={() => setOpen((o) => !o)}>
            {open ? 'Cancelar' : 'Resolver'}
          </Button>
        )}
      </div>

      {open && !resuelta && (
        <div className="mt-3 space-y-2">
          <select
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full rounded-md border border-sigam-border bg-white px-2 py-1.5 text-sm"
          >
            <option value="">Motivo…</option>
            {MOTIVOS_BASE.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <textarea
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Nota (opcional)"
            className="w-full rounded-md border border-sigam-border bg-white px-2 py-1.5 text-sm min-h-[60px]"
          />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={!motivo || saving}>
              Guardar resolución
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
