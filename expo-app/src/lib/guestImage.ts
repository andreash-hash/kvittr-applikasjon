// Durable storage for guest receipt images.
//
// ImageManipulator writes its output to the app's cache directory, which iOS is
// free to purge at any time. A guest receipt is only useful if its image is
// still there when the user eventually signs up, so guest images are copied
// into the document directory (which is never purged) and cleaned up again
// once the receipt has been migrated or deleted.

import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

const GUEST_DIR = 'guest-receipts/';

const isWeb = Platform.OS === 'web';

/**
 * Copies a (cache) image into durable storage and returns the new URI.
 * Falls back to the original URI if the copy fails, so scanning never breaks
 * because of storage problems. On web there is no durable file system, so the
 * URI is returned unchanged.
 */
export async function persistGuestImage(uri: string): Promise<string> {
  if (isWeb || !FileSystem.documentDirectory) return uri;
  try {
    const dir = `${FileSystem.documentDirectory}${GUEST_DIR}`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const dest = `${dir}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    return dest;
  } catch {
    return uri;
  }
}

/** True when the image can still be read. Web URIs are assumed readable. */
export async function localImageExists(uri: string): Promise<boolean> {
  if (isWeb) return true;
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.exists;
  } catch {
    return false;
  }
}

/** Best-effort removal of a persisted guest image. Never throws. */
export async function deleteLocalImage(uri: string | null | undefined): Promise<void> {
  if (isWeb || !uri || uri.startsWith('http')) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Nothing useful to do: the file is gone or unreachable either way.
  }
}
