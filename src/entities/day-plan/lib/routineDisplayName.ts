export const ROUTINE_DISPLAY_NAME_MAX = 40;

export function normalizeRoutineDisplayName(raw: unknown): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  return t.length > ROUTINE_DISPLAY_NAME_MAX ? t.slice(0, ROUTINE_DISPLAY_NAME_MAX) : t;
}

export function readRoutineDisplayNameFromConfig(config: unknown): string {
  if (!config || typeof config !== 'object') return '';
  return normalizeRoutineDisplayName((config as Record<string, unknown>).displayName);
}

/** 편집 결과 저장 — 비었거나 카테고리 기본명과 같으면 빈 문자열 */
export function persistRoutineDisplayName(edited: string, fallback: string): string {
  const t = normalizeRoutineDisplayName(edited);
  const fb = normalizeRoutineDisplayName(fallback);
  if (t.length === 0 || t === fb) return '';
  return t;
}
