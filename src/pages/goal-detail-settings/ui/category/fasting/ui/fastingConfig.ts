export type FastingDetailDataConfig = {
  /** 목표 단식 시간(분) */
  fastingMin: number;
  /** 경과(분) */
  elapsedMin: number;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

const FASTING_MIN = 60;
const FASTING_MAX = 48 * 60;

export function normalizeFastingDetailConfig(raw: unknown): FastingDetailDataConfig {
  const o = asObj(raw);
  const fastingMin = Math.max(
    FASTING_MIN,
    Math.min(FASTING_MAX, Number(o.fastingMin) || 16 * 60),
  );
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(
    0,
    Math.min(fastingMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0),
  );
  return { fastingMin, elapsedMin };
}

export function getInitialFastingDataConfig(): FastingDetailDataConfig {
  return { fastingMin: 16 * 60, elapsedMin: 0 };
}
