import { useMemo, useState } from 'react';
import { classifyEID } from '../../lib/normalize-eid.js';

function toSet(arr) {
  return new Set(arr ?? []);
}

function Section({ title, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-sigam-border rounded-lg bg-white">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm"
      >
        <span className="font-medium">{title}</span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-sigam-muted">{count}</span>
          <span>{open ? '▾' : '▸'}</span>
        </span>
      </button>
      {open && <div className="border-t border-sigam-border p-2">{children}</div>}
    </div>
  );
}

function EidRow({ eid, manual }) {
  const tipo = classifyEID(eid);
  return (
    <div className="flex items-center justify-between px-2 py-1 font-mono text-sm">
      <span>{eid}</span>
      <span className="flex items-center gap-2 text-xs text-sigam-muted">
        {tipo}
        {manual && (
          <span title="Leído manualmente por caravana" className="text-mustard font-bold">
            C
          </span>
        )}
      </span>
    </div>
  );
}

export function EidDiffTable({ eidsOrigen = [], eidsDestino = [], lecturasDestino = [] }) {
  const setOrigen = toSet(eidsOrigen);
  const setDestino = toSet(eidsDestino);

  const pareados = useMemo(
    () => [...setOrigen].filter((e) => setDestino.has(e)).sort(),
    [setOrigen, setDestino]
  );
  const soloOrigen = useMemo(
    () => [...setOrigen].filter((e) => !setDestino.has(e)).sort(),
    [setOrigen, setDestino]
  );
  const soloDestino = useMemo(
    () => [...setDestino].filter((e) => !setOrigen.has(e)).sort(),
    [setOrigen, setDestino]
  );

  const manualSet = useMemo(
    () => new Set(lecturasDestino.filter((l) => l.origen_lectura === 'manual_caravana').map((l) => l.eid)),
    [lecturasDestino]
  );

  return (
    <div className="space-y-2">
      <Section title="EIDs pareados" count={pareados.length}>
        {pareados.length === 0 ? (
          <p className="text-xs text-sigam-muted px-2">Sin coincidencias.</p>
        ) : (
          <div className="max-h-60 overflow-auto divide-y divide-sigam-border">
            {pareados.map((eid) => (
              <EidRow key={eid} eid={eid} manual={manualSet.has(eid)} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Sólo en origen" count={soloOrigen.length} defaultOpen={soloOrigen.length > 0}>
        {soloOrigen.length === 0 ? (
          <p className="text-xs text-sigam-muted px-2">—</p>
        ) : (
          <div className="max-h-60 overflow-auto divide-y divide-sigam-border">
            {soloOrigen.map((eid) => (
              <EidRow key={eid} eid={eid} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Sólo en destino" count={soloDestino.length} defaultOpen={soloDestino.length > 0}>
        {soloDestino.length === 0 ? (
          <p className="text-xs text-sigam-muted px-2">—</p>
        ) : (
          <div className="max-h-60 overflow-auto divide-y divide-sigam-border">
            {soloDestino.map((eid) => (
              <EidRow key={eid} eid={eid} manual={manualSet.has(eid)} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
