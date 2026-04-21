import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase.js';

const ESTADO_ORDER = { DISCREPANCIA: 0, PENDIENTE: 1, OK: 2, RESUELTA: 3 };

function sortConferencias(list) {
  return [...list].sort((a, b) => {
    const sa = ESTADO_ORDER[a.estado] ?? 99;
    const sb = ESTADO_ORDER[b.estado] ?? 99;
    if (sa !== sb) return sa - sb;
    return new Date(b.updated_at ?? b.created_at) - new Date(a.updated_at ?? a.created_at);
  });
}

export function useConferencias() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data, error: err } = await supabase
        .from('conferencias')
        .select('*')
        .order('updated_at', { ascending: false });
      if (!mounted) return;
      if (err) setError(err.message);
      else setItems(sortConferencias(data ?? []));
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel('conferencias-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conferencias' },
        (payload) => {
          setItems((prev) => {
            const next = [...prev];
            const idx = next.findIndex((x) => x.guia_nro === (payload.new?.guia_nro ?? payload.old?.guia_nro));
            if (payload.eventType === 'DELETE') {
              if (idx >= 0) next.splice(idx, 1);
            } else if (idx >= 0) {
              next[idx] = payload.new;
            } else {
              next.push(payload.new);
            }
            return sortConferencias(next);
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { items, loading, error };
}

export function useConferencia(guia_nro) {
  const [conferencia, setConferencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = async () => {
    if (!guia_nro) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from('conferencias')
      .select('*')
      .eq('guia_nro', guia_nro)
      .maybeSingle();
    if (err) setError(err.message);
    else setConferencia(data);
    setLoading(false);
  };

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel(`conferencia-${guia_nro}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conferencias', filter: `guia_nro=eq.${guia_nro}` },
        (payload) => {
          if (payload.eventType === 'DELETE') setConferencia(null);
          else setConferencia(payload.new);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guia_nro]);

  return { conferencia, loading, error, refresh };
}
