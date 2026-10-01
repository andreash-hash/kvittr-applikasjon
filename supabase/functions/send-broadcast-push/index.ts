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
//
// Zero external imports — uses Deno's built-in fetch + Supabase REST API directly.

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

interface ProfileRow {
  id: string;
  expo_push_token: string;
}

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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  // ── Auth: service_role_key only ──────────────────────────────────────────
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
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: `Bad request: ${msg}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Fetch all users with a push token via Supabase REST API ───────────────
  const profilesRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=id,expo_push_token&expo_push_token=not.is.null`,
    {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
    },
  );

  if (!profilesRes.ok) {
    const errText = await profilesRes.text();
    console.error('[broadcast] profiles fetch error:', errText);
    return new Response(JSON.stringify({ error: errText }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const allProfiles: ProfileRow[] = await profilesRes.json();

  // Filter to valid ExponentPushToken format only
  const profiles = allProfiles.filter(
    (p) => typeof p.expo_push_token === 'string' &&
            p.expo_push_token.startsWith('ExponentPushToken['),
  );

  console.log(`[broadcast] total_users=${profiles.length} title="${title}"`);

  const totalUsers = profiles.length;
  let sent = 0;
  let failed = 0;
  const errors: Array<{ user_id: string; token: string; error: string }> = [];

  // ── Send in batches of 100 (Expo Push API limit) ──────────────────────────
  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);

    const messages: ExpoMessage[] = batch.map((p) => ({
      to: p.expo_push_token,
      title,
      body,
      sound: 'default' as const,
      ...(data ? { data } : {}),
    }));

    let tickets: ExpoTicket[] = [];
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`[broadcast] batch ${i}–${i + batch.length} HTTP ${res.status}: ${text}`);
        failed += batch.length;
        continue;
      }

      const json = await res.json();
      tickets = json.data ?? [];
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[broadcast] batch ${i}–${i + batch.length} fetch error:`, msg);
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
        console.error(`[broadcast] failed user=${profile.id} err=${errMsg}`);
        errors.push({ user_id: profile.id, token: profile.expo_push_token, error: errMsg });
      }
    }
  }

  console.log(`[broadcast] done total=${totalUsers} sent=${sent} failed=${failed}`);

  return new Response(
    JSON.stringify({ total_users: totalUsers, sent, failed, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
