// Moves receipts scanned in guest mode into the user's account.
//
// Guest receipts live in localStorage with the image inlined as a base64 data
// URL. On the first authenticated load we upload each image to Supabase
// Storage and insert the receipt against the real user id, then clear the
// local copy. Signup goes through email confirmation, so there is no session
// at the moment the account is created — this has to run on first login
// instead, which also covers the user who signs up on one device and confirms
// on another.

import { supabase } from '@/integrations/supabase/client';
import { saveReceipt, type Receipt } from './storage';
import { getGuestReceipts, clearGuestData, type GuestReceipt } from './guestStorage';

const uploadGuestImage = async (userId: string, dataUrl: string): Promise<string> => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const fileName = `${userId}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from('receipt-images')
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('receipt-images')
    .getPublicUrl(fileName);

  return publicUrl;
};

const toReceipt = (guest: GuestReceipt, userId: string, imageUrl: string): Receipt => ({
  id: crypto.randomUUID(),
  user_id: userId,
  type: guest.type,
  shop_name: guest.shop_name,
  product_name: guest.product_name,
  amount: guest.amount,
  purchase_date: guest.purchase_date,
  image_url: imageUrl,
  status: (guest.status as Receipt['status']) || 'active',
  processing_status: (guest.processing_status as Receipt['processing_status']) || undefined,
  created_at: guest.created_at,
});

/**
 * Returns the number of receipts moved into the account. Safe to call on every
 * authenticated load: it is a no-op when there is nothing stored locally.
 *
 * The local copy is only cleared once every receipt has been migrated, so a
 * failure halfway through leaves the remaining receipts on the device for the
 * next attempt rather than losing them.
 */
export const migrateGuestReceipts = async (userId: string): Promise<number> => {
  const guestReceipts = getGuestReceipts();
  if (guestReceipts.length === 0) return 0;

  let migrated = 0;

  for (const guest of guestReceipts) {
    try {
      const imageUrl = guest.image_url.startsWith('data:')
        ? await uploadGuestImage(userId, guest.image_url)
        : guest.image_url;

      await saveReceipt(toReceipt(guest, userId, imageUrl));
      migrated += 1;
    } catch (error) {
      console.error('Guest receipt migration failed for one receipt:', error);
    }
  }

  if (migrated === guestReceipts.length) {
    clearGuestData();
  }

  return migrated;
};
