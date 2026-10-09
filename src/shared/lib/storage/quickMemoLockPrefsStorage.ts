import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

/** 잠금화면 메모 본문 글자 크기(pt) — 기본 28 */
export type QuickMemoFontSizePt = 24 | 28 | 32 | 36;

/** 위→아래: 큰 글자 → 작은 글자. 최소 24 */
export const QUICK_MEMO_FONT_SIZE_OPTIONS: readonly QuickMemoFontSizePt[] = [
  36, 32, 28, 24,
];

export const DEFAULT_QUICK_MEMO_FONT_SIZE_PT: QuickMemoFontSizePt = 28;

export type QuickMemoLockPrefs = {
  fontSizePt: QuickMemoFontSizePt;
  /** 잠금화면 우측 미니 캘린더 표시 */
  showCalendar: boolean;
  /** 앱 문서 디렉터리에 보관한 사진 URI (에디터 미리보기) */
  photoUri: string | null;
};

const DEFAULT_PREFS: QuickMemoLockPrefs = {
  fontSizePt: DEFAULT_QUICK_MEMO_FONT_SIZE_PT,
  showCalendar: false,
  photoUri: null,
};

export function isQuickMemoFontSizePt(value: unknown): value is QuickMemoFontSizePt {
  return (
    typeof value === 'number' &&
    (QUICK_MEMO_FONT_SIZE_OPTIONS as readonly number[]).includes(value)
  );
}

function normalizePrefs(raw: unknown): QuickMemoLockPrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_PREFS };
  const o = raw as Record<string, unknown>;
  return {
    fontSizePt: isQuickMemoFontSizePt(o.fontSizePt)
      ? o.fontSizePt
      : DEFAULT_QUICK_MEMO_FONT_SIZE_PT,
    showCalendar: o.showCalendar === true,
    photoUri: typeof o.photoUri === 'string' && o.photoUri.trim().length > 0 ? o.photoUri : null,
  };
}

export function loadQuickMemoLockPrefs(): QuickMemoLockPrefs {
  const raw = localStorageClient.getJson<unknown>(StorageKeys.quickMemoLockPrefs);
  return normalizePrefs(raw);
}

export function saveQuickMemoLockPrefs(prefs: QuickMemoLockPrefs): void {
  localStorageClient.setJson(StorageKeys.quickMemoLockPrefs, normalizePrefs(prefs));
}

export function updateQuickMemoLockPrefs(
  patch: Partial<QuickMemoLockPrefs>,
): QuickMemoLockPrefs {
  const next = normalizePrefs({ ...loadQuickMemoLockPrefs(), ...patch });
  saveQuickMemoLockPrefs(next);
  return next;
}
