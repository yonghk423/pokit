export type RunDetailDataConfig = {
  targetKm: number;
  goalMin: number;
  doneKm: number;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeRunDetailConfig(raw: unknown): RunDetailDataConfig {
  const o = asObj(raw);
  return {
    targetKm: Math.max(0.1, Math.min(999, Number(o.targetKm) || 5)),
    goalMin: Math.max(1, Math.min(600, Number(o.goalMin) || 30)),
    doneKm: Math.max(0, Math.min(999, Number(o.doneKm) || 0)),
  };
}

export function getInitialRunDataConfig(): RunDetailDataConfig {
  return { targetKm: 5, goalMin: 30, doneKm: 0 };
}
