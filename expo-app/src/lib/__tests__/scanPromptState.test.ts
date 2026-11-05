jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

import { shouldShowPrompt, MAX_SCAN_PROMPT_DISMISSALS } from '../scanPromptState';

describe('shouldShowPrompt', () => {
  it('shows for a brand-new user', () => {
    expect(shouldShowPrompt({ scanned: false, dismissed: 0 })).toBe(true);
  });

  it('shows again after one "Senere"', () => {
    expect(shouldShowPrompt({ scanned: false, dismissed: 1 })).toBe(true);
  });

  it('retires after the second "Senere"', () => {
    expect(shouldShowPrompt({ scanned: false, dismissed: MAX_SCAN_PROMPT_DISMISSALS })).toBe(false);
  });

  it('never shows once the user has scanned', () => {
    expect(shouldShowPrompt({ scanned: true, dismissed: 0 })).toBe(false);
  });
});
