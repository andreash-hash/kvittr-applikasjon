// Moves receipts scanned in guest mode into the user's account.
//
// A guest scan is stored locally and never analysed — the app tells the user
// that signing in will analyse it. This is the code that keeps that promise:
// on the first authenticated load it uploads each local image and runs it
// through the same OCR edge function a normal scan uses.
//
// It runs on login rather than at signup because signup goes through email
// confirmation, so there is no session at the moment the account is created.
// That also covers signing up on one device and confirming on another.

import { supabase } from './supabase';
import { getGuestReceipts, deleteGuestReceipt } from './guestStorage';
import { prepareImage, uploadReceiptImage } from './receiptUpload';
import { debugLog } from './debugLog';

const FUNCTION_TIMEOUT_MS = 30_000;

/**
 * Returns the number of receipts handed over to the account. Safe to call on
 * every authenticated load: it is a no-op when nothing is stored locally.
 *
 * Migrated receipts deliberately do NOT count against the account's free scan
 * quota — the guest quota already paid for them.
 *
 * Each receipt is removed from local storage only after it has been accepted
 * by the server, so a failure halfway through leaves the rest on the device
 * for the next attempt rather than losing them.
 */
export async function migrateGuestReceipts(userId: string): Promise<number> {
  const guestReceipts = await getGuestReceipts();
  if (guestReceipts.length === 0) return 0;

  debugLog('migration: start', { count: guestReceipts.length, userId });
  let migrated = 0;

  for (const receipt of guestReceipts) {
    try {
      // Guest images are local file URIs. Anything else has already been
      // uploaded and should not be sent through again.
      if (!receipt.image_url || receipt.image_url.startsWith('http')) {
        debugLog('migration: skipping non-local image', { id: receipt.id });
        continue;
      }

      const compressedUri = await prepareImage(receipt.image_url);
      const publicUrl = await uploadReceiptImage(userId, compressedUri);

      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), FUNCTION_TIMEOUT_MS);

      try {
        const { error } = await supabase.functions.invoke('process-receipt-ocr', {
          body: { image_url: publicUrl, user_id: userId },
          signal: abortCtrl.signal,
        });
        if (error) throw error;
      } finally {
        clearTimeout(timeoutId);
      }

      await deleteGuestReceipt(receipt.id);
      migrated += 1;
      debugLog('migration: receipt migrated', { id: receipt.id });
    } catch (err: unknown) {
      // Keep the local copy and try again next time.
      const message = err instanceof Error ? err.message : String(err);
      debugLog('migration: receipt FAILED', { id: receipt.id, message });
    }
  }

  debugLog('migration: done', { migrated });
  return migrated;
}
