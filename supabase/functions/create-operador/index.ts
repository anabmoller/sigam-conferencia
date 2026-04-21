import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PIN_INICIAL = '123456';
const USERNAME_RE = /^[a-z0-9_.-]{3,32}$/;
const VALID_ROLES = new Set(['admin', 'trazabilidad', 'capataz']);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: 'Invalid token' }, 401);

  const adminClient = createClient(url, serviceKey);
  const { data: caller, error: callerErr } = await adminClient
    .from('operadores')
    .select('role, activo')
    .eq('id', userData.user.id)
    .maybeSingle();
  if (callerErr) return json({ error: 'DB error (caller lookup)', detail: callerErr.message }, 500);
  if (!caller || !caller.activo || caller.role !== 'admin') {
    return json({ error: 'Forbidden: admin only' }, 403);
  }

  let body: {
    username?: unknown;
    nombre_completo?: unknown;
    role?: unknown;
    establecimientos_asignados?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { username, nombre_completo, role, establecimientos_asignados } = body;
  if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
    return json({ error: 'username inválido (regex ^[a-z0-9_.-]{3,32}$)' }, 400);
  }
  if (
    typeof nombre_completo !== 'string' ||
    nombre_completo.trim().length === 0 ||
    nombre_completo.length > 100
  ) {
    return json({ error: 'nombre_completo inválido (1-100 chars)' }, 400);
  }
  if (typeof role !== 'string' || !VALID_ROLES.has(role)) {
    return json({ error: 'role inválido' }, 400);
  }
  let estabs: string[] | null = null;
  if (establecimientos_asignados !== null && establecimientos_asignados !== undefined) {
    if (
      !Array.isArray(establecimientos_asignados) ||
      !establecimientos_asignados.every((x) => typeof x === 'string')
    ) {
      return json({ error: 'establecimientos_asignados inválido (array de strings o null)' }, 400);
    }
    estabs = establecimientos_asignados as string[];
  }

  const { data: dup } = await adminClient
    .from('operadores')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (dup) return json({ error: 'username ya existe' }, 409);

  const email = `${username}@sigam.internal`;
  const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
    email,
    password: PIN_INICIAL,
    email_confirm: true,
  });
  if (createErr || !created?.user) {
    return json({ error: 'Error creando auth user', detail: createErr?.message }, 500);
  }

  const { error: insErr } = await adminClient.from('operadores').insert({
    id: created.user.id,
    username,
    nombre_completo: nombre_completo.trim(),
    role,
    establecimientos_asignados: estabs,
    activo: true,
    pin_debe_cambiar: true,
  });
  if (insErr) {
    await adminClient.auth.admin.deleteUser(created.user.id);
    return json({ error: 'Error insertando operador (rollback aplicado)', detail: insErr.message }, 500);
  }

  return json({ user_id: created.user.id, username }, 201);
});
