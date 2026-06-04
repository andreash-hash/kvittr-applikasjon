// send-broadcast-push
// Admin-only edge function for sending the same push notification to ALL users.
// NOT called automatically — invoke manually via curl or Supabase dashboard.
//
// Auth: Bearer <SUPABASE_SERVICE_ROLE_KEY> in Authorization header.
//
// POST body:
//   { "title": "...", "body": "...", "data": { "screen": "scan" } }
//
// Returns:
//   { "total_users": N, "sent": N, "failed": N, "errors": [...] }
//
// NOTE: profiles table has no allow_marketing_push column yet.
// Apple App Store guidelines require marketing pushes to be opt-out-able.
// Add a boolean allow_marketing_push column (default true) before sending
// large-scale marketing campaigns to be fully compliant.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound: 'default';
}

interface ExpoTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

Deno.serve(async (req) => {
  // ── Auth: service_role_key only ──────────────────────────────────────────
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let title: string;
  let body: string;
  let data: Record<string, unknown> | undefined;

  try {
    const parsed = await req.json();
    title = parsed.title;
    body = parsed.body;
    data = parsed.data;
    if (!title || !body) throw new Error('missing title or body');
  } catch (e: any) {
    return new Response(JSON.stringify({ error: `Bad request: ${e.message}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey,
  );

  // ── Fetch all users with a push token ─────────────────────────────────────
  const { data: profiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, expo_push_token')
    .not('expo_push_token', 'is', null);

  if (fetchError) {
    console.error('[broadcast] profiles fetch error:', fetchError.message);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Filter to valid ExponentPushToken format
  const validProfiles = (profiles ?? []).filter(
    (p) => typeof p.expo_push_token === 'string' && p.expo_push_token.startsWith('ExponentPushToken['),
  );

  console.log(`[broadcast] total_users=${validProfiles.length} title="${title}"`);

  const totalUsers = validProfiles.length;
  let sent = 0;
  let failed = 0;
  const errors: Array<{ user_id: string; token: string; error: string }> = [];

  // ── Send in batches of 100 ────────────────────────────────────────────────
  for (let i = 0; i < validProfiles.length; i += BATCH_SIZE) {
    const batch = validProfiles.slice(i, i + BATCH_SIZE);

    const messages: ExpoMessage[] = batch.map((p) => ({
      to: p.expo_push_token as string,
      title,
      body,
      sound: 'default',
      ...(data ? { data } : {}),
    }));

    let tickets: ExpoTicket[] = [];
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[broadcast] batch ${i}-${i + batch.length} HTTP ${res.status}: ${text}`);
        failed += batch.length;
        continue;
      }

      const json = await res.json();
      tickets = json.data ?? [];
    } catch (e: any) {
      console.error(`[broadcast] batch ${i}-${i + batch.length} fetch error:`, e.message);
      failed += batch.length;
      continue;
    }

    // Tally per-ticket results
    for (let j = 0; j < batch.length; j++) {
      const ticket = tickets[j];
      const profile = batch[j];

      if (ticket?.status === 'ok') {
        sent++;
        console.log(`[broadcast] ok user=${profile.id} ticketId=${ticket.id ?? 'n/a'}`);
      } else {
        failed++;
        const errMsg = ticket?.message ?? ticket?.details?.error ?? 'unknown';
        console.error(`[broadcast] failed user=${profile.id} token=${profile.expo_push_token} err=${errMsg}`);
        errors.push({
          user_id: profile.id,
          token: profile.expo_push_token as string,
          error: errMsg,
        });
      }
    }
  }

  console.log(`[broadcast] done total=${totalUsers} sent=${sent} failed=${failed}`);

  return new Response(
    JSON.stringify({ total_users: totalUsers, sent, failed, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
