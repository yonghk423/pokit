export type MeditationDetailDataConfig = {
  sessionMin: number;
  elapsedMin: number;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeMeditationDetailConfig(raw: unknown): MeditationDetailDataConfig {
  const o = asObj(raw);
  const sessionMin = Math.max(1, Math.min(180, Number(o.sessionMin) || 15));
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(0, Math.min(sessionMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0));
  return { sessionMin, elapsedMin };
}

export function getInitialMeditationDataConfig(): MeditationDetailDataConfig {
  return { sessionMin: 15, elapsedMin: 0 };
}
