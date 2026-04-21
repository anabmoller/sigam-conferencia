import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PIN_RE = /^\d{6}$/;

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
  const userId = userData.user.id;
  const email = userData.user.email;
  if (!email) return json({ error: 'User sin email' }, 400);

  let body: { pin_actual?: unknown; pin_nuevo?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const { pin_actual, pin_nuevo } = body;
  if (typeof pin_actual !== 'string' || !PIN_RE.test(pin_actual)) {
    return json({ error: 'pin_actual inválido (debe ser 6 dígitos)' }, 400);
  }
  if (typeof pin_nuevo !== 'string' || !PIN_RE.test(pin_nuevo)) {
    return json({ error: 'pin_nuevo inválido (debe ser 6 dígitos)' }, 400);
  }
  if (pin_actual === pin_nuevo) {
    return json({ error: 'pin_nuevo no puede ser igual a pin_actual' }, 400);
  }

  const verifyClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error: signInErr } = await verifyClient.auth.signInWithPassword({
    email,
    password: pin_actual,
  });
  if (signInErr) return json({ error: 'PIN actual incorrecto' }, 401);

  const adminClient = createClient(url, serviceKey);
  const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, {
    password: pin_nuevo,
  });
  if (updErr) return json({ error: 'Error actualizando PIN', detail: updErr.message }, 500);

  const { error: flagErr } = await adminClient
    .from('operadores')
    .update({ pin_debe_cambiar: false })
    .eq('id', userId);
  if (flagErr) {
    return json({ error: 'PIN cambiado pero flag no actualizado', detail: flagErr.message }, 500);
  }

  return json({ success: true }, 200);
});
