// Direct Gemini 2.0 Flash OCR — replaces the former n8n proxy.
// Env vars required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

type Category =
  | 'electronics' | 'appliance' | 'furniture' | 'tools'
  | 'clothing' | 'shoes' | 'toys' | 'books'
  | 'groceries' | 'cosmetics' | 'default';

type ReceiptType = 'receipt' | 'gift_card' | 'return_slip';

interface OcrResult {
  shop_name?: string;
  product_name?: string;
  amount?: number;
  purchase_date?: string;
  category?: Category;
  receipt_type?: ReceiptType;
  gift_card_value?: number | null;
  gift_card_expiry?: string | null;
  return_until?: string | null;
  has_warranty?: boolean | null;
}

// Norwegian consumer law: 2 yr standard, 5 yr durable goods.
function computeWarrantyUntil(
  purchaseDate: string,
  category: Category,
  hasWarranty: boolean | null | undefined,
  receiptType: ReceiptType,
): string | null {
  if (receiptType !== 'receipt') return null;
  if (hasWarranty === false) return null;
  if (category === 'groceries' || category === 'cosmetics') return null;

  const durableGoods: Category[] = ['electronics', 'appliance', 'furniture', 'tools'];
  const months = durableGoods.includes(category) ? 60 : 24;

  const date = new Date(purchaseDate);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

// Chunk-based base64 to avoid call-stack overflow on large images.
function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const PROMPT = `You are a receipt-scanning assistant. Extract structured data from the image.
Return ONLY valid JSON with these fields:
- shop_name: string
- product_name: string (main item or short description, empty string if none)
- amount: number (total paid in NOK, 0 if unknown)
- purchase_date: string (YYYY-MM-DD; use today if not visible)
- category: one of [electronics, appliance, furniture, tools, clothing, shoes, toys, books, groceries, cosmetics, default]
- receipt_type: one of [receipt, gift_card, return_slip]
- gift_card_value: number or null
- gift_card_expiry: string (YYYY-MM-DD) or null
- return_until: string (YYYY-MM-DD) or null
- has_warranty: true if warranty explicitly mentioned, false if explicitly excluded, null if unknown

Category guide — electronics: phones/computers/TVs/cameras; appliance: white goods; furniture: sofas/tables; tools: power/hand tools; clothing: garments; shoes: footwear; toys: children's toys/games; books: books/media; groceries: food/drink; cosmetics: beauty/personal care; default: anything else.`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  if (!GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }), {
      status: 500,
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let body: { receipt_id?: string; image_url: string; user_id: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { image_url, user_id, receipt_id: incomingId } = body;
  if (!image_url || !user_id) {
    return new Response(
      JSON.stringify({ error: 'image_url and user_id are required' }),
      { status: 400 },
    );
  }

  // Create the receipt row if caller did not supply one, then mark processing.
  let receiptId = incomingId;
  if (!receiptId) {
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
        processing_status: 'processing',
        status: 'active',
      })
      .select('id')
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500 });
    }
    receiptId = newRow.id;
  } else {
    await supabase
      .from('receipts')
      .update({ processing_status: 'processing' })
      .eq('id', receiptId);
  }

  try {
    // Download image and encode as base64.
    const imageResp = await fetch(image_url);
    if (!imageResp.ok) throw new Error(`Image fetch failed: ${imageResp.status}`);
    const mimeType = imageResp.headers.get('content-type') ?? 'image/jpeg';
    const imageBase64 = toBase64(await imageResp.arrayBuffer());

    // Call Gemini 2.0 Flash with JSON response mode.
    const geminiResp = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
            { text: PROMPT },
          ],
        }],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      throw new Error(`Gemini ${geminiResp.status}: ${errText}`);
    }

    const geminiData = await geminiResp.json();
    const rawJson: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

    let ocr: OcrResult = {};
    try {
      ocr = JSON.parse(rawJson);
    } catch {
      throw new Error(`Gemini returned invalid JSON: ${rawJson.slice(0, 200)}`);
    }

    const purchaseDate = ocr.purchase_date ?? new Date().toISOString().split('T')[0];
    const category: Category = ocr.category ?? 'default';
    const receiptType: ReceiptType = ocr.receipt_type ?? 'receipt';

    const warrantyUntil = computeWarrantyUntil(
      purchaseDate,
      category,
      ocr.has_warranty,
      receiptType,
    );

    await supabase
      .from('receipts')
      .update({
        shop_name: ocr.shop_name ?? '',
        product_name: ocr.product_name ?? '',
        amount: ocr.amount ?? 0,
        purchase_date: purchaseDate,
        receipt_type: receiptType,
        gift_card_value: ocr.gift_card_value ?? null,
        gift_card_balance: ocr.gift_card_value ?? null,
        expiry_date: ocr.gift_card_expiry ?? null,
        return_until: ocr.return_until ?? null,
        warranty_until: warrantyUntil,
        has_warranty: ocr.has_warranty ?? null,
        processing_status: 'completed',
      })
      .eq('id', receiptId);

    return new Response(
      JSON.stringify({ receipt_id: receiptId, status: 'completed' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    await supabase
      .from('receipts')
      .update({ processing_status: 'failed' })
      .eq('id', receiptId);

    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ receipt_id: receiptId, status: 'failed', error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
