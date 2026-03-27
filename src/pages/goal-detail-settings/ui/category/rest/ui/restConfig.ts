export type RestDetailDataConfig = {
  restMin: number;
  elapsedMin: number;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeRestDetailConfig(raw: unknown): RestDetailDataConfig {
  const o = asObj(raw);
  const restMin = Math.max(1, Math.min(240, Number(o.restMin) || 20));
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(0, Math.min(restMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0));
  return { restMin, elapsedMin };
}

export function getInitialRestDataConfig(): RestDetailDataConfig {
  return { restMin: 20, elapsedMin: 0 };
}
