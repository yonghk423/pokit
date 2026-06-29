export const ROUTINE_SUMMARY_MAX = 240;

export function normalizeRoutineSummary(raw: unknown): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  return t.length > ROUTINE_SUMMARY_MAX ? t.slice(0, ROUTINE_SUMMARY_MAX) : t;
}

export function readRoutineSummaryFromConfig(config: unknown): string {
  if (!config || typeof config !== 'object') return '';
  return normalizeRoutineSummary((config as Record<string, unknown>).summary);
}

export function formatRoutineSummaryHint(summary: string): string | null {
  const t = summary.trim();
  if (t.length === 0) return null;
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
}
