import {
  DEFAULT_QUICK_MEMO_FONT_SIZE_PT,
  isQuickMemoFontSizePt,
  loadQuickMemoLockPrefs,
  updateQuickMemoLockPrefs,
} from './quickMemoLockPrefsStorage';
import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

describe('quickMemoLockPrefsStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.quickMemoLockPrefs);
  });

  it('defaults to 28pt and calendar off', () => {
    const prefs = loadQuickMemoLockPrefs();
    expect(prefs.fontSizePt).toBe(DEFAULT_QUICK_MEMO_FONT_SIZE_PT);
    expect(prefs.showCalendar).toBe(false);
    expect(prefs.photoUri).toBeNull();
  });

  it('persists font size and calendar toggle', () => {
    updateQuickMemoLockPrefs({ fontSizePt: 36, showCalendar: true });
    const prefs = loadQuickMemoLockPrefs();
    expect(prefs.fontSizePt).toBe(36);
    expect(prefs.showCalendar).toBe(true);
  });

  it('rejects invalid font sizes', () => {
    expect(isQuickMemoFontSizePt(28)).toBe(true);
    expect(isQuickMemoFontSizePt(24)).toBe(true);
    expect(isQuickMemoFontSizePt(22)).toBe(true);
    expect(isQuickMemoFontSizePt(20)).toBe(true);
    expect(isQuickMemoFontSizePt(18)).toBe(true);
    expect(isQuickMemoFontSizePt(16)).toBe(false);
  });
});
