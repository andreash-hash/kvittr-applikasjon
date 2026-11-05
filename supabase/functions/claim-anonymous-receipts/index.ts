// Moves receipts from an anonymous guest user to the account the person just logged in to.
//
// Why: a guest scans first (anonymous session), then logs in to an EXISTING account.
// Logging in switches the session, so the scanned receipt would stay behind on the
// anonymous user. The client sends the anonymous access token it held before login;
// proving that token is how we know the caller really controlled the guest session.
//
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // The caller: the real account (verify_jwt already checked the signature).
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: callerData } = await supabase.auth.getUser(jwt);
  const caller = callerData?.user;
  if (!caller || caller.is_anonymous) return json({ code: 'AUTH', claimed: 0 }, 401);

  let anonToken: string | undefined;
  try {
    anonToken = (await req.json())?.anon_access_token;
  } catch {
    return json({ code: 'BAD_REQUEST', claimed: 0 }, 400);
  }
  if (!anonToken) return json({ code: 'BAD_REQUEST', claimed: 0 }, 400);

  // The guest: must be a genuinely anonymous user, distinct from the caller.
  const { data: anonData } = await supabase.auth.getUser(anonToken);
  const anon = anonData?.user;
  if (!anon || !anon.is_anonymous) return json({ code: 'FORBIDDEN', claimed: 0 }, 403);
  if (anon.id === caller.id) return json({ code: 'BAD_REQUEST', claimed: 0 }, 400);

  const { data: moved, error } = await supabase
    .from('receipts')
    .update({ user_id: caller.id })
    .eq('user_id', anon.id)
    .select('id');
  if (error) {
    console.error(`[claim] update failed: ${error.message}`);
    return json({ code: 'UNKNOWN', claimed: 0 }, 500);
  }

  const claimed = moved?.length ?? 0;

  console.log(`[claim] ${anon.id} -> ${caller.id} receipts=${claimed}`);
  return json({ code: 'OK', claimed }, 200);
});
