import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext({ session: null, loading: true });

// Hard ceiling so the splash never blocks the user. If we cannot resolve
// the session in this window, we force a clean logout and let RequireAuth
// redirect to /login.
const SESSION_RESOLVE_TIMEOUT_MS = 10_000;

function isInvalidRefreshTokenError(err) {
  if (!err) return false;
  const msg = (err.message ?? '').toLowerCase();
  // Supabase auth-js returns these strings for stale / missing refresh tokens.
  return (
    msg.includes('refresh token') ||
    msg.includes('invalid_grant') ||
    err.status === 400 ||
    err.code === 'refresh_token_not_found' ||
    err.code === 'invalid_refresh_token'
  );
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const resolvedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const finish = (nextSession) => {
      if (cancelled || resolvedRef.current) return;
      resolvedRef.current = true;
      setSession(nextSession ?? null);
      setLoading(false);
    };

    const forceLogout = async (reason) => {
      // eslint-disable-next-line no-console
      console.warn('[auth] forcing logout:', reason);
      try {
        await supabase.auth.signOut();
      } catch {
        // Even if signOut fails (network down, server 5xx) we still
        // clear local state — corrupt tokens must not trap the user.
      }
      finish(null);
    };

    const safetyTimer = setTimeout(() => {
      if (!resolvedRef.current) forceLogout('session-resolve-timeout');
    }, SESSION_RESOLVE_TIMEOUT_MS);

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          if (isInvalidRefreshTokenError(error)) {
            forceLogout(error.message);
          } else {
            // Other errors (e.g. transient network) — surface as logged-out
            // rather than spinning forever.
            // eslint-disable-next-line no-console
            console.error('[auth] getSession error:', error);
            finish(null);
          }
          return;
        }
        finish(data?.session ?? null);
      })
      .catch((err) => {
        if (isInvalidRefreshTokenError(err)) forceLogout(err?.message);
        else {
          // eslint-disable-next-line no-console
          console.error('[auth] getSession threw:', err);
          finish(null);
        }
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Any auth event resolves the splash.
      if (
        event === 'TOKEN_REFRESHED' ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT' ||
        event === 'INITIAL_SESSION' ||
        event === 'USER_UPDATED'
      ) {
        finish(nextSession ?? null);
      }

      // supabase-js dispatches this when the refresh attempt fails.
      // Naming differs across versions: TOKEN_REFRESH_FAILED (newer) vs.
      // TOKEN_REFRESHED with session=null (older). Handle both.
      if (event === 'TOKEN_REFRESH_FAILED' || (event === 'TOKEN_REFRESHED' && !nextSession)) {
        forceLogout(`auth-event:${event}`);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
