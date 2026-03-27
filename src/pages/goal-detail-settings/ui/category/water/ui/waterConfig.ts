export type WaterDetailDataConfig = {
  goalMl: number;
  drankMl: number;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeWaterDetailConfig(raw: unknown): WaterDetailDataConfig {
  const o = asObj(raw);
  const goalMl = Math.max(100, Math.min(10000, Number(o.goalMl) || 2000));
  const drankRaw = Number(o.drankMl);
  const drankMl = Math.max(0, Math.min(goalMl, Number.isFinite(drankRaw) ? drankRaw : 0));
  return { goalMl, drankMl };
}

export function getInitialWaterDataConfig(): WaterDetailDataConfig {
  return { goalMl: 2000, drankMl: 0 };
}
