import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

export function useGuia(guia_nro) {
  const [guia, setGuia] = useState(null);
  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = async () => {
    if (!guia_nro) return;
    setLoading(true);
    const [{ data: g, error: gErr }, { data: s, error: sErr }] = await Promise.all([
      supabase.from('guias').select('*').eq('guia_nro', guia_nro).maybeSingle(),
      supabase.from('sesiones').select('*').eq('guia_nro', guia_nro),
    ]);
    if (gErr) setError(gErr.message);
    else if (sErr) setError(sErr.message);
    else {
      setGuia(g);
      setSesiones(s ?? []);
      setError(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guia_nro]);

  const sesionEO = sesiones.find((s) => s.tipo === 'EGRESO') ?? null;
  const sesionED = sesiones.find((s) => s.tipo === 'INGRESO') ?? null;

  return { guia, sesionEO, sesionED, loading, error, refresh };
}
