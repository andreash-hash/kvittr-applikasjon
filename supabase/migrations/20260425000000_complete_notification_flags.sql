-- =============================================================================
-- Complete notification flag columns
-- Adds the four missing columns and corrects two column names from the
-- previous migration (giftcard_notified_* → gift_card_notified_*).
-- Safe to run against production — all changes are additive / rename-only.
-- =============================================================================

-- 1. Add the four columns that were entirely absent
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS warranty_notified_30d   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS warranty_notified_7d    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS return_notified_30d     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gift_card_notified_30d  boolean DEFAULT false;

-- 2. Rename the two wrongly-named columns from the previous migration
--    (giftcard_notified_* → gift_card_notified_*)
--    These renames are idempotent on a fresh DB; on an existing DB they will
--    fail if the column was already renamed — wrap in a DO block to be safe.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'receipts'
      AND column_name  = 'giftcard_notified_7d'
  ) THEN
    ALTER TABLE public.receipts
      RENAME COLUMN giftcard_notified_7d TO gift_card_notified_7d;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'receipts'
      AND column_name  = 'giftcard_notified_3d'
  ) THEN
    ALTER TABLE public.receipts
      RENAME COLUMN giftcard_notified_3d TO gift_card_notified_3d;
  END IF;
END
$$;

-- =============================================================================
-- Verification: after running this migration all nine columns must exist.
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name   = 'receipts'
--   AND column_name  IN (
--     'warranty_notified_30d', 'warranty_notified_7d',  'warranty_notified_3d',
--     'return_notified_30d',   'return_notified_7d',    'return_notified_3d',
--     'gift_card_notified_30d','gift_card_notified_7d', 'gift_card_notified_3d'
--   )
-- ORDER BY column_name;
-- Expected: 9 rows
-- =============================================================================
