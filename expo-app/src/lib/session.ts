// Makes sure a scan always runs under a real Supabase session.
//
// A brand-new user has no account, but the OCR pipeline needs a user id for
// storage paths, row-level security and the free-scan counter. Anonymous auth
// gives every new install a real user id without asking for an email. The same
// user id is kept when the person later adds an email and password, so nothing
// has to be migrated.

import { supabase } from './supabase';

export interface ScanSession {
  userId: string;
  /** True until the person has linked an email address. */
  isAnonymous: boolean;
}

/**
 * Returns the current session's user, or signs in anonymously if there is none.
 * Returns null when anonymous sign-in is unavailable (for example disabled in
 * the Supabase project), so the caller can fall back to local-only guest mode.
 */
export async function ensureScanSession(): Promise<ScanSession | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user) {
    return { userId: session.user.id, isAnonymous: !!session.user.is_anonymous };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) return null;
  return { userId: data.user.id, isAnonymous: true };
}
