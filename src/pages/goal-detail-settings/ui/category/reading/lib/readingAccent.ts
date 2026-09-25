/**
 * 책방 액센트 — 딥 버건디를 한 톤 연하게 (`#5C3D48`).
 * 전역 민트(primaryContainer) 대신 사용.
 */
export const READING_ACCENT = '#5C3D48';
export const READING_ACCENT_ON = '#F7F2F3';

/** 완료 — 대표색보다 한 톤 연한 면 */
export const READING_STATUS_DONE = '#7A5560';
export const READING_STATUS_DONE_DARK = 'rgba(92, 61, 72, 0.55)';

/** 읽는 중 — 대표색 */
export const READING_STATUS_READING = READING_ACCENT;
export const READING_STATUS_READING_DARK = 'rgba(92, 61, 72, 0.42)';

export const READING_TINT_LIGHT = 'rgba(92, 61, 72, 0.14)';
export const READING_TINT_DARK = 'rgba(180, 145, 155, 0.28)';

/** 진행 바: 연한 톤 → 대표색 */
export const READING_PROGRESS_FILL_LIGHT = [
  'rgba(92, 61, 72, 0.22)',
  'rgba(92, 61, 72, 0.55)',
  READING_ACCENT,
] as const;
export const READING_PROGRESS_FILL_DARK = [
  'rgba(180, 145, 155, 0.32)',
  'rgba(160, 125, 135, 0.55)',
  'rgba(140, 105, 115, 0.88)',
] as const;

export function readingStatusDoneFace(isDark: boolean): string {
  return isDark ? READING_STATUS_DONE_DARK : READING_STATUS_DONE;
}

export function readingStatusReadingFace(isDark: boolean): string {
  return isDark ? READING_STATUS_READING_DARK : READING_STATUS_READING;
}

export function readingPurpleTint(isDark: boolean): string {
  return isDark ? READING_TINT_DARK : READING_TINT_LIGHT;
}

export function readingAccentOnInk(isDark: boolean): string {
  return isDark ? '#F1EFFF' : READING_ACCENT_ON;
}
