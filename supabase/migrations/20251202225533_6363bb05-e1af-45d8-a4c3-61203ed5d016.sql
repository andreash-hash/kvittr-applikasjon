-- Add fcm_token column to profiles table for storing native push notification tokens
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token TEXT;