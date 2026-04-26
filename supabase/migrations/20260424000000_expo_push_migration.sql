-- =============================================================================
-- Kvittr Expo Migration
-- Adds expo_push_token, new notification flags, indexes, pg_cron scheduler
-- Safe to run against production — all changes are additive.
-- =============================================================================

-- 1. Add expo_push_token to profiles
-- Keep fcm_token for now (legacy iOS app still writes to it)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token text;

-- 2. Add new notification flags on receipts
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS warranty_notified_3d   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS return_notified_7d     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS return_notified_3d     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS giftcard_notified_7d   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS giftcard_notified_3d   boolean DEFAULT false;

-- 3. Indexes for the daily scheduler query performance
CREATE INDEX IF NOT EXISTS idx_receipts_warranty_until
  ON public.receipts (warranty_until)
  WHERE warranty_until IS NOT NULL AND is_used IS NOT TRUE;

CREATE INDEX IF NOT EXISTS idx_receipts_return_until
  ON public.receipts (return_until)
  WHERE return_until IS NOT NULL AND is_used IS NOT TRUE;

CREATE INDEX IF NOT EXISTS idx_profiles_expo_push_token
  ON public.profiles (expo_push_token)
  WHERE expo_push_token IS NOT NULL;

-- 4. Enable required extensions
-- NOTE: These must also be enabled in Supabase Dashboard → Database → Extensions
-- Dashboard path: Database → Extensions → search "pg_cron" and "pg_net" → Enable
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 5. Cron job: daily notification dispatch at 08:00 UTC
-- PRE-REQUISITE: store the service role key in Vault before running this migration:
--   SELECT vault.create_secret('<service_role_key_value>', 'supabase_service_role_key');
-- The cron job reads the key from Vault at execution time — never stored in plaintext.

SELECT cron.schedule(
  'kvittr-daily-notifications',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url      := 'https://wdfxfhchugungurebbcc.supabase.co/functions/v1/send-expo-push',
    headers  := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
      'Content-Type',  'application/json'
    ),
    body     := '{"trigger":"daily-cron"}'::jsonb
  )
  $$
) ON CONFLICT (jobname) DO UPDATE
  SET schedule = '0 8 * * *';

-- =============================================================================
-- Verification queries (run these after migration to confirm success)
-- =============================================================================

-- Check new profile column exists
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'profiles' AND column_name = 'expo_push_token';

-- Check new receipt columns exist
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name = 'receipts'
-- AND column_name IN ('warranty_notified_3d', 'return_notified_7d', 'return_notified_3d');

-- Check cron job registered
-- SELECT jobname, schedule FROM cron.job WHERE jobname = 'kvittr-daily-notifications';
