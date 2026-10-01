-- Add OCR metadata columns to receipts table.
-- warranty_reasoning: per-receipt Norwegian legal explanation from Gemini.
-- category_description: human-readable product category (e.g. "Elektronikk").
-- ocr_raw: full Gemini response JSON for restore-to-OCR feature.
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS warranty_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS category_description TEXT,
  ADD COLUMN IF NOT EXISTS ocr_raw JSONB;
