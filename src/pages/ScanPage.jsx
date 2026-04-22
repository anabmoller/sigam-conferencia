import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRScanner } from '../components/scan/QRScanner.jsx';
import { parseGuiaQR } from '../lib/qr-parser.js';
import { supabase } from '../lib/supabase.js';
import { useGeolocation } from '../hooks/useGeolocation.js';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../components/ui/Card.jsx';
import { Input } from '../components/ui/Input.jsx';

export default function ScanPage() {
  const navigate = useNavigate();
  const { coords, error: geoError } = useGeolocation();
  const [parsed, setParsed] = useState(null);
  const [parseError, setParseError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [manualRaw, setManualRaw] = useState('');
  const [mode, setMode] = useState('scan');

  const handleDecode = useCallback(
    (text) => {
      if (parsed || saving) return;
      try {
        setParsed(parseGuiaQR(text));
        setParseError(null);
      } catch (err) {
        setParseError(err.message);
      }
    },
    [parsed, saving]
  );

  const summary = useMemo(() => {
    if (!parsed) return null;
    const { origen, destino, composicion, cantidad_total, finalidad, fecha_emision } = parsed;
    return { origen, destino, composicion, cantidad_total, finalidad, fecha_emision };
  }, [parsed]);

  const saveGuia = async () => {
    if (!parsed) return;
    setSaving(true);

    const { origen, destino } = parsed;

    const upserts = [];
    if (origen.establecimiento_codigo) {
      upserts.push(
        supabase.from('establecimientos').upsert(
          {
            codigo: origen.establecimiento_codigo,
            lat: origen.coordenadas?.lat ?? null,
            lng: origen.coordenadas?.lng ?? null,
            coordenadas_dms: origen.coordenadas_dms,
          },
          { onConflict: 'codigo' }
        )
      );
    }
    if (destino.establecimiento_codigo) {
      upserts.push(
        supabase.from('establecimientos').upsert(
          {
            codigo: destino.establecimiento_codigo,
            lat: destino.coordenadas?.lat ?? null,
            lng: destino.coordenadas?.lng ?? null,
            coordenadas_dms: destino.coordenadas_dms,
          },
          { onConflict: 'codigo' }
        )
      );
    }
    if (origen.proprietario_codigo) {
      upserts.push(
        supabase.from('proprietarios').upsert(
          { codigo: origen.proprietario_codigo },
          { onConflict: 'codigo', ignoreDuplicates: true }
        )
      );
    }
    if (destino.proprietario_codigo) {
      upserts.push(
        supabase.from('proprietarios').upsert(
          { codigo: destino.proprietario_codigo },
          { onConflict: 'codigo', ignoreDuplicates: true }
        )
      );
    }

    const dimResults = await Promise.all(upserts);
    const dimErr = dimResults.find((r) => r.error);
    if (dimErr) {
      setParseError(dimErr.error.message);
      setSaving(false);
      return;
    }

    if (origen.establecimiento_codigo && origen.proprietario_codigo) {
      await supabase.from('establecimiento_proprietarios').upsert(
        {
          establecimiento_codigo: origen.establecimiento_codigo,
          proprietario_codigo: origen.proprietario_codigo,
        },
        { onConflict: 'establecimiento_codigo,proprietario_codigo', ignoreDuplicates: true }
      );
    }
    if (destino.establecimiento_codigo && destino.proprietario_codigo) {
      await supabase.from('establecimiento_proprietarios').upsert(
        {
          establecimiento_codigo: destino.establecimiento_codigo,
          proprietario_codigo: destino.proprietario_codigo,
        },
        { onConflict: 'establecimiento_codigo,proprietario_codigo', ignoreDuplicates: true }
      );
    }

    const { error: guiaErr } = await supabase.from('guias').upsert(
      {
        guia_nro: parsed.guia_nro,
        cota: parsed.cota,
        fecha_emision: parsed.fecha_emision,
        proprietario_origen_codigo: origen.proprietario_codigo,
        establecimiento_origen_codigo: origen.establecimiento_codigo,
        proprietario_destino_codigo: destino.proprietario_codigo,
        establecimiento_destino_codigo: destino.establecimiento_codigo,
        finalidad: parsed.finalidad,
        composicion: parsed.composicion,
        cantidad_total: parsed.cantidad_total,
        qr_payload_bruto: parsed.raw,
        escaneada_lat: coords?.lat ?? null,
        escaneada_lng: coords?.lng ?? null,
      },
      { onConflict: 'guia_nro' }
    );

    if (guiaErr) {
      setParseError(guiaErr.message);
      setSaving(false);
      return;
    }

    navigate(`/guias/${parsed.guia_nro}/abrir`);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-headline text-3xl">Escanear guía SENACSA</h1>
        <div className="flex rounded-lg border border-sigam-border overflow-hidden">
          <button
            className={`px-3 py-1.5 text-sm ${mode === 'scan' ? 'bg-navy text-white' : 'bg-white text-navy'}`}
            onClick={() => setMode('scan')}
          >
            Cámara
          </button>
          <button
            className={`px-3 py-1.5 text-sm ${mode === 'manual' ? 'bg-navy text-white' : 'bg-white text-navy'}`}
            onClick={() => setMode('manual')}
          >
            Manual
          </button>
        </div>
      </header>

      {!parsed && mode === 'scan' && (
        <Card>
          <CardBody>
            <QRScanner onDecode={handleDecode} onError={(e) => setParseError(e.message)} />
            {parseError && <p className="text-sm text-burgundy mt-3">{parseError}</p>}
          </CardBody>
        </Card>
      )}

      {!parsed && mode === 'manual' && (
        <Card>
          <CardBody className="space-y-3">
            <label className="block text-sm font-medium text-navy">
              Contenido del QR (texto)
              <textarea
                className="mt-1 w-full rounded-lg border border-sigam-border bg-white px-3 py-2 text-sm font-mono min-h-[140px]"
                value={manualRaw}
                onChange={(e) => setManualRaw(e.target.value)}
                placeholder="29/01/2026. Cota:15101267000203. Guia:91097042…"
              />
            </label>
            <Button
              onClick={() => {
                try {
                  setParsed(parseGuiaQR(manualRaw));
                  setParseError(null);
                } catch (err) {
                  setParseError(err.message);
                }
              }}
            >
              Parsear
            </Button>
            {parseError && <p className="text-sm text-burgundy">{parseError}</p>}
          </CardBody>
        </Card>
      )}

      {summary && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-sigam-muted">Guía</p>
                <p className="font-mono text-xl text-navy">{parsed.guia_nro}</p>
              </div>
              <div className="text-right text-xs text-sigam-muted">
                <p>Fecha: {summary.fecha_emision ?? '—'}</p>
                <p>Finalidad: {summary.finalidad ?? '—'}</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-sigam-muted mb-1">Origen</p>
                <p className="font-mono">EO {summary.origen.establecimiento_codigo ?? '—'}</p>
                <p className="font-mono text-sm">PO {summary.origen.proprietario_codigo ?? '—'}</p>
                <p className="text-xs text-sigam-muted mt-1">
                  {summary.origen.coordenadas
                    ? `${summary.origen.coordenadas.lat.toFixed(5)}, ${summary.origen.coordenadas.lng.toFixed(5)}`
                    : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-sigam-muted mb-1">Destino</p>
                <p className="font-mono">ED {summary.destino.establecimiento_codigo ?? '—'}</p>
                <p className="font-mono text-sm">PD {summary.destino.proprietario_codigo ?? '—'}</p>
                <p className="text-xs text-sigam-muted mt-1">
                  {summary.destino.coordenadas
                    ? `${summary.destino.coordenadas.lat.toFixed(5)}, ${summary.destino.coordenadas.lng.toFixed(5)}`
                    : '—'}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-sigam-muted mb-1">Composición</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.composicion).map(([k, v]) => (
                  <span key={k} className="inline-flex items-center gap-2 rounded-md bg-sigam-bg border border-sigam-border px-2 py-1 text-sm">
                    <span className="font-medium">{k}</span>
                    <span className="font-mono">{v}</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-2 rounded-md bg-navy text-white px-2 py-1 text-sm">
                  Total <span className="font-mono">{summary.cantidad_total}</span>
                </span>
              </div>
            </div>
            <div className="text-xs text-sigam-muted">
              GPS actual: {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : geoError ?? 'capturando…'}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setParsed(null)}>
                Volver a escanear
              </Button>
              <Button onClick={saveGuia} disabled={saving}>
                {saving ? 'Guardando…' : 'Confirmar y abrir sesión'}
              </Button>
            </div>
            {parseError && <p className="text-sm text-burgundy">{parseError}</p>}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
