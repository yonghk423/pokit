export type RunDetailDataConfig = {
  targetKm: number;
  caloriesGoalKcal: number;
  /** 러닝 코스/장소(선택). 미설정 시 빈 문자열. */
  placeName: string;
  placeSub: string;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function asTrimmedString(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function normalizeRunDetailConfig(raw: unknown): RunDetailDataConfig {
  const o = asObj(raw);
  return {
    targetKm: Math.max(0.1, Math.min(999, Number(o.targetKm) || 5)),
    caloriesGoalKcal: Math.max(0, Math.min(20000, Number(o.caloriesGoalKcal) || 400)),
    placeName: asTrimmedString(o.placeName),
    placeSub: asTrimmedString(o.placeSub),
  };
}

export function getInitialRunDataConfig(): RunDetailDataConfig {
  return {
    targetKm: 5,
    caloriesGoalKcal: 400,
    placeName: '',
    placeSub: '',
  };
}
