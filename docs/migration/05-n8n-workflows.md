# 05 — n8n Workflow Mapping

## Webhook Calls Found in Codebase

### `POST https://api.kvittr.app/webhook/receipt-ocr`

**Called from:**
- `src/pages/Scan.tsx:441` — after a new receipt image is uploaded to Supabase Storage.
- `src/pages/ItemDetail.tsx:220` — on the "Prøv igjen" (retry) button after OCR timeout/failure.

**Payload (both call sites):**
```json
{
  "receipt_id": "uuid",
  "image_url": "https://wdfxfhchugungurebbcc.supabase.co/storage/v1/object/public/receipt-images/<path>.jpg",
  "user_id": "uuid"
}
```

**Expected side effect:**  
The n8n workflow reads the image, runs OCR/AI analysis, and writes the extracted fields back to `receipts` in Supabase, then sets `processing_status = 'completed'`. The app polls `processing_status` every 2 seconds (25-second timeout) to detect completion.

Fields written back by n8n (inferred from DB schema and UI field mapping):

| Field | Example value | Notes |
|-------|--------------|-------|
| `shop_name` | `"Elkjøp"` | Extracted from receipt |
| `product_name` | `"Samsung TV 65"` | Extracted from receipt |
| `amount` | `8999.00` | Purchase amount in NOK |
| `purchase_date` | `"2024-03-15"` | Date on receipt |
| `receipt_type` | `"receipt"` | Classification by AI |
| `warranty_until` | `"2029-03-15"` | `purchase_date + 5 yr` for durable goods; `+ 2 yr` for standard |
| `return_until` | `"2024-04-15"` | Exchange deadline (typically 30 days) |
| `gift_card_value` | `500.00` | For gift cards |
| `gift_card_balance` | `500.00` | Initial balance = face value |
| `gift_card_code` | `"1234 5678"` | Card PIN if visible |
| `category` | `"electronics"` | Product category |
| `raw_ocr_data` | `{...}` | Full AI response JSON |
| `processing_status` | `"completed"` or `"failed"` | Signals completion to polling client |

**Infrastructure:** `api.kvittr.app` is a Cloudflare Tunnel pointing to a self-hosted n8n instance. No API key or authentication header is sent by the app — the webhook URL itself acts as a secret.

---

## Inferred n8n Workflow: OCR Pipeline

Based on the data model and the warranty logic described in `03-warranty-logic.md`, the OCR workflow likely follows this sequence:

```
Webhook trigger (receipt-ocr)
  → Download image from Supabase Storage URL
  → Call AI vision model (likely Gemini Vision) with prompt:
      "Extract: shop name, product name, total amount, purchase date, 
       receipt type (receipt/gift_card/return_slip), gift card code if present"
  → Apply Norwegian warranty rules:
      if shop is grocery → no warranty
      if product category is durable goods → purchase_date + 5 years
      else → purchase_date + 2 years
  → Apply exchange deadline rules:
      return_slip: use printed expiry date from image
      receipt: purchase_date + 30 days (standard Norwegian retailer policy)
  → Write all fields to Supabase receipts table (using service role key or anon key)
  → Set processing_status = 'completed'
```

---

## Other n8n Workflows (Not Called by App Code)

The following workflows are inferred from the `guides` table schema and the `receipts` columns `guide_generated` / `guide_url`. They are **not triggered by the app** and are likely run on a schedule:

### Content Generation Workflow (LinkedIn / TikTok)

Based on `guides` table columns (`content`, `affiliate_links`, `views`, `clicks`, `conversions`):

```
Scheduled trigger (likely daily/weekly)
  → Query receipts for new categories/products
  → Generate SEO guide content (Gemini or similar)
  → Insert into guides table
  → Set receipts.guide_generated = true, receipts.guide_url = <url>
  → Post to LinkedIn / TikTok (inferred from task prompt description)
```

### Notification Scheduler (Currently Missing / Broken)

There is **no scheduler workflow** calling the `send-notification` edge function. This is the primary bug causing push notifications to never fire.

A working notification workflow would look like:

```
Daily trigger (e.g. 09:00 UTC+2)
  → Query: SELECT r.id, r.user_id, r.shop_name, r.product_name, r.warranty_until, r.return_until
             FROM receipts r
             JOIN profiles p ON p.id = r.user_id
            WHERE p.subscription_tier = 'premium'
              AND p.fcm_token IS NOT NULL  -- (→ expo_push_token after migration)
              AND r.warranty_until IS NOT NULL
              AND r.warranty_notified_7d IS NOT TRUE
              AND r.warranty_until::date = CURRENT_DATE + INTERVAL '7 days'
  → For each result: call send-notification edge function
  → Set warranty_notified_7d = true
  → Repeat for 3-day window and warranty_notified_3d (new column)
  → Repeat for return_until with equivalent flags
```

---

## Migration Recommendations

### Inline into Supabase Edge Functions (replace n8n)

**OCR Processing (`webhook/receipt-ocr`):** This workflow is tightly coupled to the Supabase database and has no external side effects beyond writing back to `receipts`. It should become a Supabase Edge Function:

```
POST /functions/v1/process-receipt
  Input: { receipt_id, image_url, user_id }
  → Download image
  → Call Gemini Vision API (or Claude claude-haiku-4-5 — cheaper for OCR)
  → Apply warranty rules
  → Write to receipts table
  → Set processing_status
```

This eliminates the Cloudflare Tunnel dependency and removes a single point of failure.

**Notification Scheduler:** Replace with a Supabase `pg_cron` job or a Supabase Edge Function called by the Expo Push Service. This is simpler and keeps all notification logic server-side.

### Keep in n8n

**Content generation for LinkedIn/TikTok:** This is a purely external workflow with no real-time user impact. It can stay in n8n. Keep the `guides` table and the `guide_generated`/`guide_url` columns on `receipts`.

---

## Security Note

The n8n webhook URL `https://api.kvittr.app/webhook/receipt-ocr` uses no authentication header. The app sends `user_id` in the payload but does not sign the request. In theory, anyone who knows the URL can submit arbitrary `receipt_id` + `user_id` pairs to trigger OCR on any image URL. The n8n workflow should be updated to validate that `image_url` belongs to the claimed `user_id` before processing, or the Supabase Edge Function replacement should use a signed URL or RLS-verified user context.
