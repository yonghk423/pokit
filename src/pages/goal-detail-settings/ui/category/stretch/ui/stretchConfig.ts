export type StretchDetailDataConfig = {
  totalSets: number;
  holdSec: number;
  doneSets: number;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeStretchDetailConfig(raw: unknown): StretchDetailDataConfig {
  const o = asObj(raw);
  const totalSets = Math.max(1, Math.min(50, Number(o.totalSets) || 8));
  const holdSec = Math.max(5, Math.min(300, Number(o.holdSec) || 30));
  const doneRaw = Number(o.doneSets);
  const doneSets = Math.max(0, Math.min(totalSets, Number.isFinite(doneRaw) ? doneRaw : 0));
  return { totalSets, holdSec, doneSets };
}

export function getInitialStretchDataConfig(): StretchDetailDataConfig {
  return { totalSets: 8, holdSec: 30, doneSets: 0 };
}
