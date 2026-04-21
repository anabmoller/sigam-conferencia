const COLORS = {
  OK: 'bg-emerald-500 text-white',
  PENDIENTE: 'bg-mustard text-navy',
  DISCREPANCIA: 'bg-burgundy text-white',
  RESUELTA: 'bg-navy text-white',
};

export function EstadoBadge({ estado, size = 'sm' }) {
  const cls = COLORS[estado] ?? 'bg-sigam-border text-navy';
  const sz = size === 'lg' ? 'text-sm px-3 py-1.5' : 'text-xs px-2 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${cls} ${sz}`}>
      {estado}
    </span>
  );
}
