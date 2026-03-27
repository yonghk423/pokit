export type YogaDetailDataConfig = {
  sessionMin: number;
  elapsedMin: number;
  flowLabel: string;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function clampStr(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > max ? t.slice(0, max) : t;
}

export function normalizeYogaDetailConfig(raw: unknown): YogaDetailDataConfig {
  const o = asObj(raw);
  const sessionMin = Math.max(1, Math.min(180, Number(o.sessionMin) || 40));
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(0, Math.min(sessionMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0));
  const flowLabel = clampStr(o.flowLabel, 40) || '플로우';
  return { sessionMin, elapsedMin, flowLabel };
}

export function getInitialYogaDataConfig(): YogaDetailDataConfig {
  return { sessionMin: 40, elapsedMin: 0, flowLabel: '플로우' };
}
