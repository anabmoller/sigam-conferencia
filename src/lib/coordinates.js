// DMS → decimal degrees conversion.
// Accepts strings like:  23° 50' 44.29779'' S 58° 52' 32.99377'' O
// Returns { lat, lng } as signed decimal numbers, or null on failure.

const DMS_PAIR = /(\d+)\D+?(\d+)\D+?(\d+(?:\.\d+)?)\D*?([NSLEOW])/gi;

export function dmsToDecimal(deg, min, sec, hemi) {
  const sign = /[SWO]/i.test(hemi) ? -1 : 1;
  const value = Number(deg) + Number(min) / 60 + Number(sec) / 3600;
  return sign * value;
}

export function parseDMSPair(input) {
  if (!input) return null;
  const matches = [...String(input).matchAll(DMS_PAIR)];
  if (matches.length < 2) return null;
  const [a, b] = matches;
  const lat = dmsToDecimal(a[1], a[2], a[3], a[4]);
  const lng = dmsToDecimal(b[1], b[2], b[3], b[4]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}
