// EID normalization for Tru-Test bastão exports.
// Supported inputs:
//   - Hexadecimal:  16 hex chars (e.g. "8000F1237A00A345")
//   - Decimal:      15 digits (e.g. "600010002282 5464" with spaces stripped)
//   - Decimal2:     15 digits, already canonical
// Canonical output: 15-digit decimal string.

export function normalizeEID(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/\s+/g, '').toUpperCase();
  if (!cleaned) return null;

  if (/^[0-9A-F]{16}$/.test(cleaned)) {
    return BigInt('0x' + cleaned).toString();
  }

  if (/^\d{15}$/.test(cleaned)) {
    return cleaned;
  }

  throw new Error(`Formato de EID no reconocido: ${raw}`);
}

export function classifyEID(eid) {
  if (!eid) return 'DESCONOCIDO';
  if (eid.startsWith('600010')) return 'SIAP';
  if (eid.startsWith('98')) return 'INTERNO';
  return 'DESCONOCIDO';
}

// Caravana visual = últimos dígitos (4 a 6) impresos en la caravana.
// Devuelve los últimos N dígitos del EID canónico.
export function caravanaFromEID(eid, n = 4) {
  if (!eid) return '';
  return eid.slice(-n);
}
