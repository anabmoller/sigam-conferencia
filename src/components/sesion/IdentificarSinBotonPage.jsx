import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../ui/Card.jsx';
import { Input } from '../ui/Input.jsx';
import { supabase } from '../../lib/supabase.js';
import { useGuia } from '../../hooks/useGuia.js';

export default function IdentificarSinBotonPage() {
  const { guia_nro } = useParams();
  const navigate = useNavigate();
  const { guia, sesionED, loading, refresh } = useGuia(guia_nro);

  const [terminacion, setTerminacion] = useState('');
  const [candidates, setCandidates] = useState(null);
  const [lookupErr, setLookupErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lecturasManuales, setLecturasManuales] = useState(0);

  useEffect(() => {
    if (!sesionED?.id) return;
    (async () => {
      const { count } = await supabase
        .from('sesion_lecturas')
        .select('eid', { count: 'exact', head: true })
        .eq('sesion_id', sesionED.id)
        .eq('origen_lectura', 'manual_caravana');
      setLecturasManuales(count ?? 0);
    })();
  }, [sesionED]);

  const faltantes = useMemo(() => {
    if (!sesionED) return 0;
    return Math.max(0, (sesionED.animales_sin_boton ?? 0) - lecturasManuales);
  }, [sesionED, lecturasManuales]);

  const buscar = async () => {
    setLookupErr(null);
    setCandidates(null);
    const trimmed = terminacion.trim();
    if (!trimmed || !/^\d+$/.test(trimmed)) {
      setLookupErr('Ingresá sólo los dígitos de la terminación (ej: 5464).');
      return;
    }
    const { data, error } = await supabase.rpc('buscar_eid_por_caravana', {
      p_guia_nro: guia_nro,
      p_caravana_terminacion: trimmed,
    });
    if (error) {
      setLookupErr(error.message);
      return;
    }
    setCandidates(data ?? []);
  };

  const registrar = async (eid) => {
    if (!sesionED || !eid) return;
    setSaving(true);
    const { error } = await supabase.from('sesion_lecturas').upsert(
      {
        sesion_id: sesionED.id,
        eid,
        origen_lectura: 'manual_caravana',
        leido_at: new Date().toISOString(),
      },
      { onConflict: 'sesion_id,eid', ignoreDuplicates: true }
    );
    if (error) {
      setLookupErr(error.message);
      setSaving(false);
      return;
    }
    setLecturasManuales((n) => n + 1);
    setTerminacion('');
    setCandidates(null);
    setSaving(false);
    refresh();
  };

  if (loading) return <p className="text-sm text-sigam-muted">Cargando…</p>;
  if (!guia) return <p className="text-sm text-burgundy">Guía no encontrada.</p>;
  if (!sesionED)
    return (
      <p className="text-sm text-burgundy">
        Todavía no hay sesión de INGRESO abierta para esta guía.
      </p>
    );

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <header>
        <p className="text-xs text-sigam-muted">Guía {guia_nro}</p>
        <h1 className="font-headline text-3xl">Identificar sin bóton</h1>
        <p className="text-sm text-sigam-muted mt-1">
          Faltan identificar <span className="font-mono text-burgundy">{faltantes}</span>{' '}
          {faltantes === 1 ? 'animal' : 'animales'} por terminación de caravana.
        </p>
      </header>

      <Card>
        <CardHeader>
          <h2 className="font-headline text-lg">Terminación de caravana</h2>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex gap-2">
            <Input
              name="terminacion"
              value={terminacion}
              onChange={(e) => setTerminacion(e.target.value.replace(/\D/g, ''))}
              placeholder="Ej: 5464"
              className="font-mono text-lg"
              autoFocus
            />
            <Button onClick={buscar} disabled={!terminacion}>
              Buscar
            </Button>
          </div>
          {lookupErr && <p className="text-sm text-burgundy">{lookupErr}</p>}

          {candidates !== null && candidates.length === 0 && (
            <div className="rounded-lg bg-sigam-bg border border-sigam-border p-3 text-sm">
              <p className="text-burgundy font-medium">No se encontró ningún EID en origen con esa terminación.</p>
              <p className="text-sigam-muted mt-1">
                Revisá los dígitos o registrá manualmente como caso especial.
              </p>
            </div>
          )}

          {candidates !== null && candidates.length === 1 && (
            <div className="rounded-lg border border-state-ok bg-emerald-50 p-3 text-sm space-y-2">
              <p className="text-state-ok font-medium">Coincidencia única</p>
              <p className="font-mono">{candidates[0].eid}</p>
              <p className="text-xs text-sigam-muted">{candidates[0].tipo_eid}</p>
              <Button onClick={() => registrar(candidates[0].eid)} disabled={saving}>
                Confirmar identificación
              </Button>
            </div>
          )}

          {candidates !== null && candidates.length > 1 && (
            <div className="rounded-lg border border-mustard bg-yellow-50 p-3 text-sm space-y-2">
              <p className="font-medium">Hay {candidates.length} coincidencias. Elegí la correcta.</p>
              <ul className="divide-y divide-sigam-border bg-white rounded-md border border-sigam-border">
                {candidates.map((c) => (
                  <li key={c.eid} className="flex items-center justify-between px-3 py-2">
                    <div>
                      <p className="font-mono">{c.eid}</p>
                      <p className="text-xs text-sigam-muted">{c.tipo_eid}</p>
                    </div>
                    <Button variant="outline" onClick={() => registrar(c.eid)} disabled={saving}>
                      Elegir
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" onClick={() => navigate(`/conferencias/${guia_nro}`)}>
          Ir a la conciliación
        </Button>
      </div>
    </div>
  );
}
