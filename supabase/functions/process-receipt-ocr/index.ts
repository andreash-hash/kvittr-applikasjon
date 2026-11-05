// Gemini OCR for receipts. Requires a signed-in user (anonymous sessions count).
// Env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

type Category =
  | 'electronics' | 'appliance' | 'furniture' | 'tools'
  | 'clothing' | 'shoes' | 'toys' | 'books'
  | 'groceries' | 'cosmetics' | 'default';

type ReceiptType = 'receipt' | 'gift_card' | 'return_slip';

interface WarrantyAssessment {
  has_warranty: boolean;
  warranty_months: number | null;
  reasoning: string;
  category_description: string;
}

interface OcrResult {
  shop_name?: string;
  product_name?: string;
  amount?: number;
  purchase_date?: string;
  purchase_date_source?: string;
  category?: Category;
  receipt_type?: ReceiptType;
  gift_card_value?: number | null;
  gift_card_expiry?: string | null;
  return_until?: string | null;
  has_warranty?: boolean | null;
  warranty_assessment?: WarrantyAssessment;
}

// Norwegian consumer law: 2 yr standard, 5 yr durable goods.
// Kept as fallback if Gemini does not return warranty_assessment.
function computeWarrantyUntil(
  purchaseDate: string,
  category: Category,
  hasWarranty: boolean | null | undefined,
  receiptType: ReceiptType,
): string | null {
  if (receiptType !== 'receipt') return null;
  if (hasWarranty === false) return null;
  if (category === 'groceries' || category === 'cosmetics') return null;

  const durableGoods: Category[] = ['electronics', 'appliance', 'furniture', 'tools', 'clothing', 'shoes'];
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

const PROMPT = `Du er en norsk kvitteringsskanner-assistent. Trekk ut strukturerte data fra kvitteringsbildet.

DOKUMENTTYPE — LES DETTE FORST:
Se etter disse ordene HVOR SOM HELST på dokumentet:

1. "TILGODESEDDEL", "Tilgodelapp", "Tilgodeseddelnr", "tilgode" → receipt_type = "return_slip"
   En tilgodeseddel er et butikk-kreditbrev, IKKE et kjøpskvittering.
   Den har en "Gyldig til"-dato som skal trekkes ut som return_until.
   Tildel ALDRI garanti til en tilgodeseddel.
   Sett has_warranty = false og warranty_assessment.has_warranty = false.

2. "GAVEKORT", "Gift card" → receipt_type = "gift_card"
   Trekk ut kortverdi som gift_card_value og utløpsdato som gift_card_expiry.

3. Alt annet → receipt_type = "receipt"

DATOFORMAT — VIKTIG:
Norske kvitteringer bruker DD.MM.YYYY, ALDRI amerikansk MM/DD.
"13.04.2026" = 13. april 2026. "05.09.2025" = 5. september 2025.
En kvittering kan ha mange datoer: kjøpsdato, transaksjonstidspunkt, utløp, kvitterings-ID.
Kjøpsdatoen er vanligvis merket Dato, Kjøpsdato, Salgsdato — eller øverst.
Forfatt IKKE transaksjons-ID-numre som datoer.
Rapporter hvilken tekst du hentet kjøpsdatoen fra (purchase_date_source).

GARANTIVURDERING — NORSK FORBRUKERKJØPSLOV:

INGEN reklamasjonsrett:
- Tjenester: taxi, restaurant, frisør, reparasjonsarbeid, lege, hotell, parkering
- Forbruksvarer: mat, drikke, drivstoff, kosmetikk
- Underholdning: kino, treningssenter, abonnementer, streaming
- Reise og transport, gavekort, tilgodesedler

2 ARS reklamasjonsrett (standard fysiske varer).

5 ARS reklamasjonsrett (varige forbruksgjenstand):
- Elektronikk: telefoner, datamaskiner, TV, kameraer
- Hvitevarer: vaskemaskin, kjøleskap, oppvaskmaskin, ovn
- Møbler: sofaer, bord, senger, hyller
- Verktøy: elektroverktøy, håndverktøy
- Sykler og sportsutstyr
- Klær og sko
- Leker og spill

Dersom kvitteringen angir en eksplisitt garantiperiode, bruk den.
Skriv reasoning på norsk, 1-2 setninger, spesifikt for DENNE kvitteringen.

BELØP OG PRODUKTNAVN — LES DETTE NØYE:
amount = TOTALBELØP betalt for hele kvitteringen (sum, inkl. mva). Aldri prisen på én enkelt vare.
  Se etter: "TOTALT", "Å BETALE", "TOTAL", "SUM", "BETALTE", "DEBIT", "BANK"-beløp.
  Hvis kvitteringen har flere betalingslinjer (VISA + kontant), summer dem.
product_name = ved én vare: produktnavnet. Ved flere varer: en kort beskrivelse av kjøpet
  (f.eks. "Verktøy og tilbehør", "Klær og accessories", "Dagligvarer", "Diverse elektronikk").
  Ikke kopier én tilfeldig varelinje — oppsummer hele kvitteringen på norsk.

Returner KUN gyldig JSON:
{
  "shop_name": string,
  "product_name": string,
  "amount": number,
  "purchase_date": "YYYY-MM-DD",
  "purchase_date_source": string,
  "category": one of [electronics, appliance, furniture, tools, clothing, shoes, toys, books, groceries, cosmetics, default],
  "receipt_type": one of [receipt, gift_card, return_slip],
  "gift_card_value": number or null,
  "gift_card_expiry": "YYYY-MM-DD" or null,
  "return_until": "YYYY-MM-DD" or null,
  "has_warranty": true/false/null,
  "warranty_assessment": {
    "has_warranty": boolean,
    "warranty_months": number or null,
    "reasoning": string,
    "category_description": string
  }
}

Kategoriveiledning: electronics=telefoner/PC/TV/kamera; appliance=hvitevarer; furniture=møbler; tools=verktøy; clothing=klær; shoes=sko; toys=leketøy; books=bøker/media; groceries=mat/drikke; cosmetics=skjønnhet; default=alt annet.`;


type ErrorCode =
  | 'AUTH' | 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST'
  | 'GEMINI_KEY' | 'GEMINI_UPSTREAM' | 'PARSE' | 'IMAGE_FETCH' | 'UNKNOWN';

class OcrError extends Error {
  constructor(public code: ErrorCode, public detail: string) {
    super(detail);
  }
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  AUTH: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  BAD_REQUEST: 400,
  GEMINI_KEY: 500,
  GEMINI_UPSTREAM: 502,
  PARSE: 422,
  IMAGE_FETCH: 502,
  UNKNOWN: 500,
};

// Clients get a stable code and a short, safe message. Details (Gemini bodies,
// keys, stack traces) stay in the function logs only.
function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fail(code: ErrorCode, receiptId: string | null, detail: string): Response {
  console.error(`[OCR] FAIL code=${code} receipt=${receiptId ?? 'none'} detail=${detail.slice(0, 500)}`);
  return json(
    // `status` and `error` stay for clients built before error codes existed.
    { receipt_id: receiptId, status: 'failed', code, error: code },
    STATUS_BY_CODE[code],
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // ── Who is calling? The body is never trusted for identity. ───────────────
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!jwt) return fail('AUTH', null, 'missing bearer token');
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  const userId = userData?.user?.id;
  if (userError || !userId) return fail('AUTH', null, userError?.message ?? 'no user for token');

  let body: { receipt_id?: string; image_url?: string };
  try {
    body = await req.json();
  } catch {
    return fail('BAD_REQUEST', null, 'invalid JSON');
  }

  const { image_url: imageUrl, receipt_id: incomingId } = body;
  if (!imageUrl || typeof imageUrl !== 'string') {
    return fail('BAD_REQUEST', null, 'image_url missing');
  }
  // Only images in our own receipts bucket; stops the function being used as an open fetch proxy.
  const allowedPrefix = `${supabaseUrl}/storage/v1/object/`;
  if (!imageUrl.startsWith(allowedPrefix) || !imageUrl.includes('/receipts/')) {
    return fail('BAD_REQUEST', null, 'image_url outside receipts bucket');
  }

  // ── Resolve or create the receipt row, owned by the caller ────────────────
  let receiptId: string | null = null;
  if (incomingId) {
    const { data: row, error } = await supabase
      .from('receipts')
      .select('id, user_id')
      .eq('id', incomingId)
      .maybeSingle();
    if (error) return fail('UNKNOWN', incomingId, error.message);
    if (!row) return fail('NOT_FOUND', incomingId, 'receipt not found');
    if (row.user_id !== userId) return fail('FORBIDDEN', incomingId, 'receipt belongs to another user');
    receiptId = row.id;
    await supabase.from('receipts').update({ processing_status: 'processing' }).eq('id', receiptId);
  } else {
    const { data: newRow, error: insertError } = await supabase
      .from('receipts')
      .insert({
        user_id: userId,
        image_url: imageUrl,
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
    if (insertError || !newRow) return fail('UNKNOWN', null, insertError?.message ?? 'insert failed');
    receiptId = newRow.id;
  }

  try {
    if (!GEMINI_API_KEY) throw new OcrError('GEMINI_KEY', 'GEMINI_API_KEY not configured');

    const imageResp = await fetch(imageUrl);
    if (!imageResp.ok) throw new OcrError('IMAGE_FETCH', `image fetch ${imageResp.status}`);
    const mimeType = imageResp.headers.get('content-type') ?? 'image/jpeg';
    const imageBase64 = toBase64(await imageResp.arrayBuffer());

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
      // 400/403 from Gemini on a valid request means the key is bad, expired or billing is off.
      const code: ErrorCode =
        geminiResp.status === 400 || geminiResp.status === 401 || geminiResp.status === 403
          ? 'GEMINI_KEY'
          : 'GEMINI_UPSTREAM';
      throw new OcrError(code, `Gemini ${geminiResp.status}: ${errText.slice(0, 400)}`);
    }

    const geminiData = await geminiResp.json();

    const candidateCount = geminiData?.candidates?.length ?? 0;
    console.log(
      `[OCR] user=${userId} mimeType=${mimeType} candidateCount=${candidateCount} ` +
      `finishReason=${geminiData?.candidates?.[0]?.finishReason ?? 'N/A'} ` +
      `promptFeedback=${JSON.stringify(geminiData?.promptFeedback ?? null)}`,
    );

    const rawJson: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!rawJson) throw new OcrError('PARSE', 'Gemini returned no candidates');

    let ocr: OcrResult = {};
    try {
      const parsed = JSON.parse(rawJson);
      ocr = Array.isArray(parsed) ? parsed[0] ?? {} : parsed;
    } catch {
      throw new OcrError('PARSE', `invalid JSON from Gemini: ${rawJson.slice(0, 200)}`);
    }

    // ── Date sanity check ──────────────────────────────────────────────────
    const todayStr = new Date().toISOString().split('T')[0];
    let purchaseDate = ocr.purchase_date ?? todayStr;
    if (purchaseDate > todayStr) {
      console.warn(
        `[OCR] purchase_date "${purchaseDate}" is in the future ` +
        `(source: "${ocr.purchase_date_source ?? 'unknown'}") — falling back to today.`,
      );
      purchaseDate = todayStr;
    }

    const category: Category = ocr.category ?? 'default';
    const receiptType: ReceiptType = ocr.receipt_type ?? 'receipt';

    // ── Warranty computation ───────────────────────────────────────────────
    // Prefer Gemini's warranty_assessment over the rule-based fallback.
    let warrantyUntil: string | null = null;
    const assess = ocr.warranty_assessment;
    if (assess && receiptType === 'receipt') {
      if (assess.has_warranty && assess.warranty_months) {
        const date = new Date(purchaseDate);
        date.setMonth(date.getMonth() + assess.warranty_months);
        warrantyUntil = date.toISOString().split('T')[0];
      }
    } else if (receiptType === 'receipt') {
      warrantyUntil = computeWarrantyUntil(purchaseDate, category, ocr.has_warranty, receiptType);
    }

    // ocr_raw stores both the raw Gemini output and _result (computed values)
    // so the app can restore fields without re-calling Gemini.
    const ocrRaw = {
      ...ocr,
      _result: {
        shop_name: ocr.shop_name ?? '',
        product_name: ocr.product_name ?? '',
        amount: ocr.amount ?? 0,
        purchase_date: purchaseDate,
        receipt_type: receiptType,
        warranty_until: warrantyUntil,
        return_until: ocr.return_until ?? null,
        expiry_date: ocr.gift_card_expiry ?? null,
        gift_card_balance: ocr.gift_card_value ?? null,
      },
    };

    const { error: updateError } = await supabase
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
        has_warranty: assess ? assess.has_warranty : (ocr.has_warranty ?? null),
        warranty_reasoning: assess?.reasoning ?? null,
        category_description: assess?.category_description ?? null,
        ocr_raw: ocrRaw,
        processing_status: 'completed',
      })
      .eq('id', receiptId)
      .eq('user_id', userId);
    if (updateError) throw new OcrError('UNKNOWN', `receipt update: ${updateError.message}`);

    return json({ receipt_id: receiptId, status: 'completed' }, 200);
  } catch (err) {
    await supabase
      .from('receipts')
      .update({ processing_status: 'failed' })
      .eq('id', receiptId)
      .eq('user_id', userId);

    if (err instanceof OcrError) return fail(err.code, receiptId, err.detail);
    return fail('UNKNOWN', receiptId, err instanceof Error ? err.message : String(err));
  }
});
