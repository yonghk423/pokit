export type StudyDetailDataConfig = {
  goalMemo: string;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function clampStr(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > max ? t.slice(0, max) : t;
}

export function normalizeStudyDetailConfig(raw: unknown): StudyDetailDataConfig {
  const o = asObj(raw);
  return { goalMemo: clampStr(o.goalMemo, 80) };
}

export function getInitialStudyDataConfig(): StudyDetailDataConfig {
  return { goalMemo: '' };
}
