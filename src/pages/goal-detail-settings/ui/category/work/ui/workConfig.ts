export type WorkDetailDataConfig = {
  planMin: number;
  doneMin: number;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

export function normalizeWorkDetailConfig(raw: unknown): WorkDetailDataConfig {
  const o = asObj(raw);
  const planMin = Math.max(15, Math.min(720, Number(o.planMin) || 120));
  const doneRaw = Number(o.doneMin);
  const doneMin = Math.max(0, Math.min(planMin, Number.isFinite(doneRaw) ? doneRaw : 0));
  return { planMin, doneMin };
}

export function getInitialWorkDataConfig(): WorkDetailDataConfig {
  return { planMin: 120, doneMin: 0 };
}
