function normalize(s) {
  return (s ?? '').toString().toLowerCase().replace(/\s+/g, '');
}

function differ(a, b) {
  return normalize(a) !== normalize(b);
}

function arraysEqual(a, b) {
  const sa = [...(a ?? [])].sort();
  const sb = [...(b ?? [])].sort();
  if (sa.length !== sb.length) return false;
  return sa.every((v, i) => v === sb[i]);
}

function Row({ label, origen, destino, diff }) {
  return (
    <div className="grid grid-cols-[120px_1fr_1fr] gap-2 py-2 border-b border-sigam-border last:border-0">
      <div className="text-xs uppercase tracking-wide text-sigam-muted">{label}</div>
      <div className={`font-mono text-sm ${diff ? 'text-burgundy' : ''}`}>{origen ?? '—'}</div>
      <div className={`font-mono text-sm ${diff ? 'text-burgundy' : ''}`}>{destino ?? '—'}</div>
    </div>
  );
}

export function MovimientoHeaderCompare({ sesionEO, sesionED, totalOrigen, totalDestino }) {
  const precintosDiff = !arraysEqual(sesionEO?.precintos ?? [], sesionED?.precintos ?? []);

  return (
    <div className="bg-white border border-sigam-border rounded-xl p-4">
      <div className="grid grid-cols-[120px_1fr_1fr] gap-2 pb-2 border-b border-sigam-border text-xs text-sigam-muted">
        <span />
        <span>Egreso (EO)</span>
        <span>Ingreso (ED)</span>
      </div>
      <Row
        label="Chapa"
        origen={sesionEO?.chapa}
        destino={sesionED?.chapa}
        diff={sesionEO && sesionED && differ(sesionEO.chapa, sesionED.chapa)}
      />
      <Row
        label="Transportista"
        origen={sesionEO?.transportista}
        destino={sesionED?.transportista}
        diff={sesionEO && sesionED && differ(sesionEO.transportista, sesionED.transportista)}
      />
      <Row
        label="Precintos"
        origen={(sesionEO?.precintos ?? []).join(', ')}
        destino={(sesionED?.precintos ?? []).join(', ')}
        diff={sesionEO && sesionED && precintosDiff}
      />
      <Row label="Lecturas" origen={totalOrigen} destino={totalDestino} diff={false} />
      <Row
        label="Sin bóton"
        origen="—"
        destino={sesionED?.animales_sin_boton ?? 0}
        diff={false}
      />
    </div>
  );
}
