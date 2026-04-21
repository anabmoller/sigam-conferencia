import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Button } from '../ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../ui/Card.jsx';
import { supabase } from '../../lib/supabase.js';
import { useGuia } from '../../hooks/useGuia.js';
import { classifyEID, normalizeEID } from '../../lib/normalize-eid.js';

function findEidColumn(headers) {
  if (!headers?.length) return null;
  return (
    headers.find((h) => /^(eid|visual|vid|animal\s*id|tag\s*id)$/i.test(String(h).trim())) ??
    headers.find((h) => /eid/i.test(String(h))) ??
    null
  );
}

function extractEIDsFromRows(rows) {
  if (!rows?.length) return { rows: [], eids: [] };
  const headers = Object.keys(rows[0]);
  const col = findEidColumn(headers);
  if (!col) {
    // Fallback: try a single-column file (no header).
    const flat = rows
      .map((r) => Object.values(r)[0])
      .filter(Boolean)
      .map(String);
    return hydrateEIDs(flat);
  }
  const raw = rows.map((r) => r[col]).filter(Boolean).map(String);
  return hydrateEIDs(raw);
}

function hydrateEIDs(rawList) {
  const eids = [];
  const errors = [];
  const seen = new Set();
  for (const raw of rawList) {
    let normalized;
    try {
      normalized = normalizeEID(raw);
    } catch (err) {
      errors.push({ raw, error: err.message });
      continue;
    }
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    eids.push({ raw, eid: normalized, tipo_eid: classifyEID(normalized) });
  }
  return { eids, errors };
}

async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return extractEIDsFromRows(rows);
  }
  const text = await file.text();
  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        if (res.data.length && Object.keys(res.data[0]).length > 0) {
          resolve(extractEIDsFromRows(res.data));
        } else {
          // No header — each line is an EID.
          const flat = text.split(/\r?\n/).filter((l) => l.trim());
          resolve(hydrateEIDs(flat));
        }
      },
    });
  });
}

export default function UploadPlanillaPage() {
  const { guia_nro } = useParams();
  const navigate = useNavigate();
  const { guia, sesionEO, sesionED, loading } = useGuia(guia_nro);
  const [eids, setEids] = useState([]);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Prefer the latest session (whichever one was just opened).
  const sesion = [sesionEO, sesionED]
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

  const counts = useMemo(() => {
    const siap = eids.filter((r) => r.tipo_eid === 'SIAP').length;
    const interno = eids.filter((r) => r.tipo_eid === 'INTERNO').length;
    const desconocido = eids.filter((r) => r.tipo_eid === 'DESCONOCIDO').length;
    return { siap, interno, desconocido, total: eids.length };
  }, [eids]);

  const handleFile = async (file) => {
    setError(null);
    setErrors([]);
    try {
      const { eids: out, errors: errs } = await parseFile(file);
      setEids(out);
      setErrors(errs);
    } catch (err) {
      setError(err.message);
    }
  };

  const confirm = async () => {
    if (!sesion || !eids.length) return;
    setUploading(true);

    const rows = eids.map((r) => ({
      sesion_id: sesion.id,
      eid: r.eid,
      origen_lectura: 'bastao',
      leido_at: new Date().toISOString(),
    }));

    const { error: err } = await supabase
      .from('sesion_lecturas')
      .upsert(rows, { onConflict: 'sesion_id,eid', ignoreDuplicates: true });

    if (err) {
      setError(err.message);
      setUploading(false);
      return;
    }

    if (sesion.tipo === 'INGRESO' && (sesion.animales_sin_boton ?? 0) > 0) {
      navigate(`/guias/${guia_nro}/sin-boton`);
    } else {
      navigate(`/conferencias/${guia_nro}`);
    }
  };

  if (loading) return <p className="text-sm text-sigam-muted">Cargando…</p>;
  if (!guia) return <p className="text-sm text-burgundy">Guía no encontrada.</p>;
  if (!sesion) return <p className="text-sm text-burgundy">Aún no hay sesión abierta para esta guía.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <header>
        <p className="text-xs text-sigam-muted">Guía {guia_nro} — sesión {sesion.tipo}</p>
        <h1 className="font-headline text-3xl">Subir planilla del bastón</h1>
      </header>

      <Card>
        <CardHeader>
          <h2 className="font-headline text-lg">Archivo</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <input
            type="file"
            accept=".csv,.xls,.xlsx,.txt"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="block w-full text-sm text-sigam-muted file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-navy file:text-white hover:file:bg-navy/90"
          />
          <p className="text-xs text-sigam-muted">
            Acepta .csv, .xls, .xlsx y .txt. Se detecta automáticamente la columna EID.
          </p>
          {error && <p className="text-sm text-burgundy">{error}</p>}
        </CardBody>
      </Card>

      {eids.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-headline text-lg">Preview</h2>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-navy text-white">Total {counts.total}</span>
                <span className="px-2 py-1 rounded bg-mustard text-navy">SIAP {counts.siap}</span>
                <span className="px-2 py-1 rounded bg-sigam-border">INTERNO {counts.interno}</span>
                {counts.desconocido > 0 && (
                  <span className="px-2 py-1 rounded bg-burgundy text-white">Desconocido {counts.desconocido}</span>
                )}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="max-h-80 overflow-auto border border-sigam-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-sigam-bg text-xs uppercase text-sigam-muted sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">EID</th>
                    <th className="text-left px-3 py-2">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {eids.map((r) => (
                    <tr key={r.eid} className="border-t border-sigam-border">
                      <td className="px-3 py-1.5 font-mono">{r.eid}</td>
                      <td className="px-3 py-1.5">{r.tipo_eid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errors.length > 0 && (
              <div className="mt-3 text-xs text-burgundy">
                <p className="font-medium mb-1">Filas rechazadas ({errors.length})</p>
                <ul className="list-disc pl-5">
                  {errors.slice(0, 10).map((e, i) => (
                    <li key={i}>
                      <span className="font-mono">{e.raw}</span> — {e.error}
                    </li>
                  ))}
                  {errors.length > 10 && <li>… y {errors.length - 10} más.</li>}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={() => { setEids([]); setErrors([]); }}>
                Limpiar
              </Button>
              <Button onClick={confirm} disabled={uploading}>
                {uploading ? 'Guardando…' : `Confirmar ${eids.length} lecturas`}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

    </div>
  );
}
