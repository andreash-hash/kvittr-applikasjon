// Shared image preparation and upload for receipt scans.
//
// Extracted from the scan screen so the guest-migration path uses the exact
// same resize, encoding and bucket as a normal scan — two copies of this would
// drift, and a mismatch here shows up as a receipt whose image fails to load.

import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

export const RECEIPTS_BUCKET = 'receipts';

/** Resize and compress a captured image before upload. */
export async function prepareImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1400 } }],
    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Uploads a local image file to the receipts bucket and returns its public URL.
 * The caller is responsible for having prepared (resized) the image first.
 */
export async function uploadReceiptImage(userId: string, localUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToUint8Array(base64);
  const fileName = `${userId}/${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(fileName, bytes, { contentType: 'image/jpeg' });

  if (error) throw error;

  const { data } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}
