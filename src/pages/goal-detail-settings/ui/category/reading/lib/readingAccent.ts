/** 독서 화면 — 종이 위에 얹는 은은한 민트 포인트. */
export const READING_ACCENT = '#A8DADC';
export const READING_ACCENT_ON = '#35544C';
export const READING_STATUS_DONE = '#C5DEDA';
export const READING_STATUS_DONE_DARK = '#53776F';
export const READING_STATUS_READING = '#D7EBE5';
export const READING_STATUS_READING_DARK = '#405F57';
export const READING_TINT_LIGHT = 'rgba(168, 218, 220, 0.20)';
export const READING_TINT_DARK = 'rgba(168, 218, 220, 0.16)';
export const READING_PROGRESS_FILL_LIGHT = ['#DCE9E3', '#B9D8CE', '#89B8AB'] as const;
export const READING_PROGRESS_FILL_DARK = ['#40574F', '#597D71', '#8AB8A9'] as const;

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
  return isDark ? '#E5EFE8' : READING_ACCENT_ON;
}
