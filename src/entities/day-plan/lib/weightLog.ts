const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type FastingWeightLogs = Record<string, number>;

export type WeightLogEntry = {
  dateKey: string;
  weightKg: number;
};

export function normalizeFastingWeightLogs(raw: unknown): FastingWeightLogs {
  if (!raw || typeof raw !== 'object') return {};
  const out: FastingWeightLogs = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!DATE_KEY_RE.test(key)) continue;
    const n = Number(val);
    if (!Number.isFinite(n)) continue;
    out[key] = clampWeightKg(n);
  }
  return out;
}

export function clampWeightKg(value: number): number {
  return Math.max(30, Math.min(250, Math.round(value * 10) / 10));
}

export function sortedWeightLogEntries(logs: FastingWeightLogs): WeightLogEntry[] {
  return Object.entries(logs)
    .map(([dateKey, weightKg]) => ({ dateKey, weightKg }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

export function readWeightLogForDate(logs: FastingWeightLogs, dateKey: string): number | null {
  const v = logs[dateKey];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function setFastingWeightLog(
  logs: FastingWeightLogs,
  dateKey: string,
  weightKg: number,
): FastingWeightLogs {
  if (!DATE_KEY_RE.test(dateKey)) return logs;
  return { ...logs, [dateKey]: clampWeightKg(weightKg) };
}

export function removeFastingWeightLog(logs: FastingWeightLogs, dateKey: string): FastingWeightLogs {
  if (!(dateKey in logs)) return logs;
  const next = { ...logs };
  delete next[dateKey];
  return next;
}

/** 가장 최근 기록일 체중 — 없으면 fallback */
export function latestWeightFromLogs(logs: FastingWeightLogs, fallbackKg: number): number {
  const entries = sortedWeightLogEntries(logs);
  if (entries.length === 0) return fallbackKg;
  return entries[entries.length - 1]!.weightKg;
}

export function weightDeltaToTarget(currentKg: number, targetKg: number): number {
  return Math.max(0, currentKg - targetKg);
}

export function weightGoalAchieved(currentKg: number, targetKg: number): boolean {
  return targetKg > 0 && currentKg <= targetKg;
}

/** 첫 기록 → 최근 기록 구간에서 목표까지 진행률(0~1) */
export function weightProgressRatioFromLogs(
  logs: FastingWeightLogs,
  targetKg: number,
  fallbackCurrentKg: number,
): number {
  const entries = sortedWeightLogEntries(logs);
  const current = entries.length > 0 ? entries[entries.length - 1]!.weightKg : fallbackCurrentKg;
  if (weightGoalAchieved(current, targetKg)) return 1;
  const start = entries.length > 0 ? entries[0]!.weightKg : fallbackCurrentKg;
  const totalDrop = start - targetKg;
  if (totalDrop <= 0) return 0;
  const dropped = start - current;
  return Math.min(0.98, Math.max(0, dropped / totalDrop));
}

export type WeightChartPoint = WeightLogEntry;

/** 최근 기록 N개 — 그래프용 */
export function buildWeightChartSeries(
  logs: FastingWeightLogs,
  maxPoints = 30,
): WeightChartPoint[] {
  const entries = sortedWeightLogEntries(logs);
  if (entries.length <= maxPoints) return entries;
  return entries.slice(entries.length - maxPoints);
}
