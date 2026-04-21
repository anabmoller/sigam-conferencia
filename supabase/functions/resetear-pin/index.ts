import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PIN_INICIAL = '123456';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  let body: { target_user_id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const { target_user_id } = body;
  if (typeof target_user_id !== 'string' || !UUID_RE.test(target_user_id)) {
    return json({ error: 'target_user_id inválido (UUID requerido)' }, 400);
  }

  const { data: target } = await adminClient
    .from('operadores')
    .select('id')
    .eq('id', target_user_id)
    .maybeSingle();
  if (!target) return json({ error: 'Operador no existe' }, 404);

  const { error: updErr } = await adminClient.auth.admin.updateUserById(target_user_id, {
    password: PIN_INICIAL,
  });
  if (updErr) return json({ error: 'Error reseteando PIN', detail: updErr.message }, 500);

  const { error: flagErr } = await adminClient
    .from('operadores')
    .update({ pin_debe_cambiar: true })
    .eq('id', target_user_id);
  if (flagErr) {
    return json({ error: 'PIN reseteado pero flag no actualizado', detail: flagErr.message }, 500);
  }

  return json({ success: true }, 200);
});
