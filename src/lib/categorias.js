// SENACSA category codes that appear inside the "A:" segment of a guía QR.
export const CATEGORIAS_QR = {
  TOR:  { canonico: 'TOR',  desc: 'Toro' },
  NOV:  { canonico: 'NOV',  desc: 'Novillo' },
  VAC:  { canonico: 'VAC',  desc: 'Vaca' },
  VQU:  { canonico: 'VQU',  desc: 'Vaquilla' },
  DM:   { canonico: 'DM',   desc: 'Desmamante Macho' },
  DH:   { canonico: 'DH',   desc: 'Desmamante Hembra' },
  DMA:  { canonico: 'DMA',  desc: 'Desmamante Macho' },
  DHE:  { canonico: 'DHE',  desc: 'Desmamante Hembra' },
  TM:   { canonico: 'TM',   desc: 'Ternero Macho' },
  TH:   { canonico: 'TH',   desc: 'Ternera Hembra' },
  TER:  { canonico: 'TER',  desc: 'Ternero/a' },
  BUEY: { canonico: 'BUEY', desc: 'Buey' },
};

export function canonicalizeCategoria(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toUpperCase();
  return CATEGORIAS_QR[key]?.canonico ?? key;
}

export function descCategoria(canonico) {
  const hit = Object.values(CATEGORIAS_QR).find((c) => c.canonico === canonico);
  return hit?.desc ?? canonico;
}
