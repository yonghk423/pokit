/**
 * DigitalHhmmInput 초안 파싱 헬퍼 — 입력 중 부분 문자열을 안전하게 시·분으로 해석.
 */

export function resolveHour12(draft: string, fallbackPad2: string): number {
  const d = draft.replace(/\D/g, '').slice(0, 2);
  if (d === '' || d === '0') {
    return Math.min(12, Math.max(1, parseInt(fallbackPad2, 10) || 12));
  }
  const n = parseInt(d, 10);
  if (!Number.isFinite(n)) {
    return Math.min(12, Math.max(1, parseInt(fallbackPad2, 10) || 12));
  }
  return Math.min(12, Math.max(1, n));
}

export function resolveMinute(draft: string, fallbackPad2: string): number {
  const d = draft.replace(/\D/g, '').slice(0, 2);
  if (d === '') {
    return Math.min(59, Math.max(0, parseInt(fallbackPad2, 10) || 0));
  }
  const n = parseInt(d, 10);
  if (!Number.isFinite(n)) {
    return Math.min(59, Math.max(0, parseInt(fallbackPad2, 10) || 0));
  }
  return Math.min(59, Math.max(0, n));
}

/** 숫자만 최대 2자리 — TextInput onChange용 */
export function sanitizeTimeDigitDraft(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 2);
}
