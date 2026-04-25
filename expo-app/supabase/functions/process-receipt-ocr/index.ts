// Replaces the n8n OCR webhook. Called from the scan screen after image upload.
// Wraps the existing n8n endpoint while migration is in progress;
// replace the fetch below with direct OCR logic (e.g. GPT-4o vision) when n8n is retired.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL') ?? '';

interface RequestBody {
  image_url: string;
  user_id: string;
  receipt_id?: string;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { image_url, user_id, receipt_id } = body;
  if (!image_url || !user_id) {
    return new Response(JSON.stringify({ error: 'image_url and user_id are required' }), {
      status: 400,
    });
  }

  // Create a pending receipt row immediately so the UI can show "analyserer…"
  let rowId = receipt_id;
  if (!rowId) {
    const { data: newRow, error: insertError } = await supabase
      .from('receipts')
      .insert({
        user_id,
        image_url,
        receipt_type: 'receipt',
        shop_name: '',
        product_name: '',
        amount: 0,
        purchase_date: new Date().toISOString().split('T')[0],
        processing_status: 'pending',
        status: 'active',
      })
      .select('id')
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }
    rowId = newRow.id;
  }

  // Forward to n8n (or future OCR service). Fire-and-forget; n8n writes back to DB.
  if (N8N_WEBHOOK_URL) {
    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receipt_id: rowId, image_url, user_id }),
    }).catch(() => null);
  }

  return new Response(
    JSON.stringify({ receipt_id: rowId, status: 'pending' }),
    { status: 202, headers: { 'Content-Type': 'application/json' } },
  );
});
