export type OtherDetailDataConfig = {
  memo: string;
};

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function clampStr(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > max ? t.slice(0, max) : t;
}

export function normalizeOtherDetailConfig(raw: unknown): OtherDetailDataConfig {
  const o = asObj(raw);
  return { memo: clampStr(o.memo, 120) };
}

export function getInitialOtherDataConfig(): OtherDetailDataConfig {
  return { memo: '' };
}
