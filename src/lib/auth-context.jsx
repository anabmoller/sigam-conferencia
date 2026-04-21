import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext({
  session: null,
  user: null,
  operador: null,
  loading: true,
  error: null,
  refreshOperador: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [operador, setOperador] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOperador = async (userId) => {
    if (!userId) {
      setOperador(null);
      return;
    }
    const { data, error: err } = await supabase
      .from('operadores')
      .select('id, username, nombre_completo, role, establecimientos_asignados, activo, pin_debe_cambiar')
      .eq('id', userId)
      .maybeSingle();
    if (err) {
      setError(err);
      setOperador(null);
    } else {
      setError(null);
      setOperador(data ?? null);
    }
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      if (data.session?.user?.id) {
        await fetchOperador(data.session.user.id);
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user?.id) {
        await fetchOperador(s.user.id);
      } else {
        setOperador(null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const refreshOperador = async () => {
    if (session?.user?.id) await fetchOperador(session.user.id);
  };

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      operador,
      loading,
      error,
      refreshOperador,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session, operador, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
