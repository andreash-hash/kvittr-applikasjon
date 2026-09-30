// Persistence for the scan walkthrough's "already seen" flag.
//
// Kept out of the component file so that file exports only a component, which
// is what React Fast Refresh needs to hot-reload it reliably.

import AsyncStorage from '@react-native-async-storage/async-storage';

const WALKTHROUGH_SEEN_KEY = 'kvittr_scan_walkthrough_seen';

export async function hasSeenScanWalkthrough(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(WALKTHROUGH_SEEN_KEY)) === 'true';
  } catch {
    // Showing the walkthrough twice is a far smaller problem than crashing on
    // the first screen a new user ever sees.
    return false;
  }
}

export async function markScanWalkthroughSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(WALKTHROUGH_SEEN_KEY, 'true');
  } catch {
    // no-op
  }
}
