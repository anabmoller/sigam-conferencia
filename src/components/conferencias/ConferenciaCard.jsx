import { Link } from 'react-router-dom';
import { EstadoBadge } from './EstadoBadge.jsx';

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'hace segundos';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

export function ConferenciaCard({ c }) {
  const nDiscrep = Array.isArray(c.discrepancias) ? c.discrepancias.length : 0;
  return (
    <Link
      to={`/conferencias/${c.guia_nro}`}
      className="block bg-sigam-card border border-sigam-border rounded-xl p-4 hover:border-navy transition"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-lg text-navy">{c.guia_nro}</p>
        <EstadoBadge estado={c.estado} />
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-sigam-muted">Origen</p>
          <p className="font-mono">{c.total_origen ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-sigam-muted">Destino</p>
          <p className="font-mono">{c.total_destino ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-sigam-muted">Discrep.</p>
          <p className={`font-mono ${nDiscrep > 0 ? 'text-burgundy' : ''}`}>{nDiscrep}</p>
        </div>
      </div>
      <p className="text-xs text-sigam-muted mt-2">{timeAgo(c.updated_at ?? c.created_at)}</p>
    </Link>
  );
}
