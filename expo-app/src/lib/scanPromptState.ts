// Persistence for the "Har du en kvittering å skanne nå?" first screen.
//
// The prompt is shown on cold start until the user has completed one scan, or
// has dismissed it twice. After that it never comes back: a nudge that keeps
// reappearing turns into an obstacle.

import AsyncStorage from '@react-native-async-storage/async-storage';

const SCAN_PROMPT_KEY = 'kvittr_scan_prompt_state';

/** How many times "Senere" may be tapped before the prompt retires. */
export const MAX_SCAN_PROMPT_DISMISSALS = 2;

interface ScanPromptState {
  /** True once the user has finished a scan. */
  scanned: boolean;
  /** Number of times the user tapped "Senere". */
  dismissed: number;
}

const DEFAULT_STATE: ScanPromptState = { scanned: false, dismissed: 0 };

async function readState(): Promise<ScanPromptState> {
  try {
    const raw = await AsyncStorage.getItem(SCAN_PROMPT_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<ScanPromptState>;
    return {
      scanned: parsed.scanned === true,
      dismissed: typeof parsed.dismissed === 'number' ? parsed.dismissed : 0,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

async function writeState(state: ScanPromptState): Promise<void> {
  try {
    await AsyncStorage.setItem(SCAN_PROMPT_KEY, JSON.stringify(state));
  } catch {
    // Showing the prompt once more is a smaller problem than crashing.
  }
}

export function shouldShowPrompt(state: ScanPromptState): boolean {
  return !state.scanned && state.dismissed < MAX_SCAN_PROMPT_DISMISSALS;
}

export async function shouldShowScanPrompt(): Promise<boolean> {
  return shouldShowPrompt(await readState());
}

export async function recordScanPromptDismissed(): Promise<void> {
  const state = await readState();
  await writeState({ ...state, dismissed: state.dismissed + 1 });
}

/** Call after the first successful scan, or when the user clearly has history. */
export async function markScanPromptCompleted(): Promise<void> {
  const state = await readState();
  if (state.scanned) return;
  await writeState({ ...state, scanned: true });
}
