import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useConferencia } from '../../hooks/useConferencias.js';
import { useGuia } from '../../hooks/useGuia.js';
import { EstadoBadge } from './EstadoBadge.jsx';
import { MovimientoHeaderCompare } from './MovimientoHeaderCompare.jsx';
import { EidDiffTable } from './EidDiffTable.jsx';
import { DiscrepanciaCard } from './DiscrepanciaCard.jsx';
import { Button } from '../ui/Button.jsx';
import { Card, CardBody, CardHeader } from '../ui/Card.jsx';
import { useAuth } from '../../lib/auth-context.jsx';

export default function ConferenciaDetail() {
  const { guia_nro } = useParams();
  const { session } = useAuth();
  const { conferencia, loading, refresh } = useConferencia(guia_nro);
  const { guia, sesionEO, sesionED } = useGuia(guia_nro);
  const [lecturasDestino, setLecturasDestino] = useState([]);
  const [saving, setSaving] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sesionED?.id) return;
    (async () => {
      const { data } = await supabase
        .from('sesion_lecturas')
        .select('eid, origen_lectura')
        .eq('sesion_id', sesionED.id);
      setLecturasDestino(data ?? []);
    })();
  }, [sesionED]);

  const discrepancias = conferencia?.discrepancias ?? [];
  const pendientes = useMemo(
    () => discrepancias.filter((d) => !d.resuelta).length,
    [discrepancias]
  );

  const reconciliar = async () => {
    setReconciling(true);
    const { error } = await supabase.rpc('conciliar', { p_guia_nro: guia_nro });
    if (error) setError(error.message);
    else await refresh();
    setReconciling(false);
  };

  const resolver = async (updated) => {
    setSaving(true);
    const next = discrepancias.map((d) => {
      if (d.tipo !== updated.tipo) return d;
      if (d.eid && d.eid !== updated.eid) return d;
      return { ...d, ...updated };
    });
    const { error } = await supabase
      .from('conferencias')
      .update({ discrepancias: next, updated_at: new Date().toISOString() })
      .eq('guia_nro', guia_nro);
    if (error) setError(error.message);
    else await refresh();
    setSaving(false);
  };

  const marcarResuelta = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('conferencias')
      .update({
        estado: 'RESUELTA',
        verificada_por: session?.user?.id ?? null,
        verificada_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('guia_nro', guia_nro);
    if (error) setError(error.message);
    else await refresh();
    setSaving(false);
  };

  if (loading) return <p className="text-sm text-sigam-muted">Cargando…</p>;

  if (!conferencia) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-sigam-muted">
          Aún no hay conferencia para <span className="font-mono">{guia_nro}</span>. Podés abrir una sesión para generarla.
        </p>
        <div className="flex gap-2">
          <Button as={Link} to={`/guias/${guia_nro}/abrir`}>
            Abrir sesión
          </Button>
          <Button variant="outline" as={Link} to="/conferencias">
            Volver
          </Button>
        </div>
      </div>
    );
  }

  const todasResueltas = discrepancias.length > 0 && pendientes === 0 && conferencia.estado !== 'RESUELTA';

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <p className="text-xs text-sigam-muted">Conferencia</p>
          <h1 className="font-mono text-3xl text-navy">{guia_nro}</h1>
          <p className="text-xs text-sigam-muted">
            Actualizada {conferencia.updated_at ? new Date(conferencia.updated_at).toLocaleString() : '—'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <EstadoBadge estado={conferencia.estado} size="lg" />
          <Button variant="outline" onClick={reconciliar} disabled={reconciling}>
            {reconciling ? 'Reconciliando…' : 'Reconciliar'}
          </Button>
          {todasResueltas && (
            <Button variant="primary" onClick={marcarResuelta} disabled={saving}>
              Marcar RESUELTA
            </Button>
          )}
        </div>
      </header>

      {guia && (
        <div className="text-sm text-sigam-muted flex flex-wrap gap-x-4">
          <span>Finalidad: <span className="text-navy">{guia.finalidad ?? '—'}</span></span>
          <span>Total declarado: <span className="font-mono">{guia.cantidad_total ?? '—'}</span></span>
          <span>
            {guia.establecimiento_origen_codigo} → {guia.establecimiento_destino_codigo}
          </span>
        </div>
      )}

      <MovimientoHeaderCompare
        sesionEO={sesionEO}
        sesionED={sesionED}
        totalOrigen={conferencia.total_origen}
        totalDestino={conferencia.total_destino}
      />

      <Card>
        <CardHeader>
          <h2 className="font-headline text-lg">Comparación de EIDs</h2>
        </CardHeader>
        <CardBody>
          <EidDiffTable
            eidsOrigen={conferencia.eids_origen ?? []}
            eidsDestino={conferencia.eids_destino ?? []}
            lecturasDestino={lecturasDestino}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-lg">Discrepancias</h2>
            <span className="text-xs text-sigam-muted">
              {discrepancias.length} total · <span className="text-burgundy">{pendientes} pendientes</span>
            </span>
          </div>
        </CardHeader>
        <CardBody className="space-y-2">
          {discrepancias.length === 0 ? (
            <p className="text-sm text-state-ok">Sin discrepancias.</p>
          ) : (
            discrepancias.map((d, i) => (
              <DiscrepanciaCard key={`${d.tipo}-${d.eid ?? ''}-${i}`} d={d} onResolve={resolver} saving={saving} />
            ))
          )}
        </CardBody>
      </Card>

      {error && <p className="text-sm text-burgundy">{error}</p>}
    </div>
  );
}
