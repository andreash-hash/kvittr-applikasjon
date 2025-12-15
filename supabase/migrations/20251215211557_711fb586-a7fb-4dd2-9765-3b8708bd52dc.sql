-- Add monthly scan tracking columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS scans_used_this_month integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS scans_reset_date timestamp with time zone DEFAULT now();