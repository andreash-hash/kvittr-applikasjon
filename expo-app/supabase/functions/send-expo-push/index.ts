// Replaces the dead FCM Legacy send-notification function.
// Called by pg_cron at 08:00 Oslo time daily.
// Also callable via Supabase dashboard for manual testing.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
}

interface ReceiptRow {
  id: string;
  user_id: string;
  shop_name: string | null;
  product_name: string | null;
  receipt_type: string;
  warranty_until: string | null;
  return_until: string | null;
  expiry_date: string | null;
  warranty_notified_7d: boolean;
  warranty_notified_3d: boolean;
  return_notified_7d: boolean;
  return_notified_3d: boolean;
  giftcard_notified_7d: boolean;
  giftcard_notified_3d: boolean;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function buildMessage(
  token: string,
  receipt: ReceiptRow,
  days: number,
  expiryType: 'warranty' | 'return' | 'giftcard',
): ExpoMessage {
  const name = receipt.shop_name ?? receipt.product_name ?? 'Kvittering';
  const dayLabel = days === 0 ? 'i dag' : days === 1 ? 'i morgen' : `om ${days} dager`;

  const titles: Record<string, string> = {
    warranty: `Garanti utløper ${dayLabel}`,
    return: `Returrett utløper ${dayLabel}`,
    giftcard: `Gavekort utløper ${dayLabel}`,
  };

  return {
    to: token,
    title: titles[expiryType],
    body: name,
    sound: 'default',
    data: { receipt_id: receipt.id, expiry_type: expiryType },
  };
}

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fetch receipts expiring in 1–7 days that haven't been notified
  const { data: receipts, error: fetchError } = await supabase
    .from('receipts')
    .select(
      'id, user_id, shop_name, product_name, receipt_type, warranty_until, return_until, expiry_date, warranty_notified_7d, warranty_notified_3d, return_notified_7d, return_notified_3d, giftcard_notified_7d, giftcard_notified_3d',
    )
    .or(
      'warranty_until.not.is.null,return_until.not.is.null,expiry_date.not.is.null',
    )
    .eq('status', 'active');

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
  }

  const messages: ExpoMessage[] = [];
  const updates: Array<{ id: string; patch: Record<string, boolean> }> = [];

  for (const receipt of (receipts ?? []) as ReceiptRow[]) {
    // Fetch the user's push token
    const { data: profile } = await supabase
      .from('profiles')
      .select('expo_push_token')
      .eq('id', receipt.user_id)
      .single();

    const token: string | null = profile?.expo_push_token ?? null;
    if (!token || !token.startsWith('ExponentPushToken[')) continue;

    const patch: Record<string, boolean> = {};

    // Warranty notifications
    if (receipt.warranty_until) {
      const days = daysUntil(receipt.warranty_until);
      if (days === 7 && !receipt.warranty_notified_7d) {
        messages.push(buildMessage(token, receipt, days, 'warranty'));
        patch.warranty_notified_7d = true;
      } else if (days === 3 && !receipt.warranty_notified_3d) {
        messages.push(buildMessage(token, receipt, days, 'warranty'));
        patch.warranty_notified_3d = true;
      }
    }

    // Return slip notifications
    if (receipt.return_until) {
      const days = daysUntil(receipt.return_until);
      if (days === 7 && !receipt.return_notified_7d) {
        messages.push(buildMessage(token, receipt, days, 'return'));
        patch.return_notified_7d = true;
      } else if (days === 3 && !receipt.return_notified_3d) {
        messages.push(buildMessage(token, receipt, days, 'return'));
        patch.return_notified_3d = true;
      }
    }

    // Gift card expiry notifications
    if (receipt.receipt_type === 'gift_card' && receipt.expiry_date) {
      const days = daysUntil(receipt.expiry_date);
      if (days === 7 && !receipt.giftcard_notified_7d) {
        messages.push(buildMessage(token, receipt, days, 'giftcard'));
        patch.giftcard_notified_7d = true;
      } else if (days === 3 && !receipt.giftcard_notified_3d) {
        messages.push(buildMessage(token, receipt, days, 'giftcard'));
        patch.giftcard_notified_3d = true;
      }
    }

    if (Object.keys(patch).length > 0) {
      updates.push({ id: receipt.id, patch });
    }
  }

  // Send in batches of 100 (Expo limit)
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    if (res.ok) sent += batch.length;
  }

  // Mark notified flags so we don't double-send
  for (const { id, patch } of updates) {
    await supabase.from('receipts').update(patch).eq('id', id);
  }

  return new Response(
    JSON.stringify({ sent, queued: messages.length, updated: updates.length }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
