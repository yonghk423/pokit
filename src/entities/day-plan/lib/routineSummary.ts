import { getAppLocale } from '@shared/lib/i18n';
import { getBuiltinFlowDefaultSummary } from '@shared/lib/i18n/lib/builtinFlowLabels';

export const ROUTINE_SUMMARY_MAX = 240;

export function normalizeRoutineSummary(raw: unknown): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  return t.length > ROUTINE_SUMMARY_MAX ? t.slice(0, ROUTINE_SUMMARY_MAX) : t;
}

export function readRoutineSummaryFromConfig(config: unknown): string {
  if (!config || typeof config !== 'object') return '';
  return normalizeRoutineSummary((config as Record<string, unknown>).summary);
}

/** 내장 루틴 기본 요약이면 현재 로케일 문구로 바꾼다. */
export function resolveRoutineSummaryForDisplay(categoryKey: string, stored: string): string {
  const localized = getBuiltinFlowDefaultSummary(categoryKey, getAppLocale());
  const trimmed = stored.trim();
  if (!trimmed) return localized ?? '';
  const defaults = (['ko', 'en', 'ja'] as const)
    .map((locale) => getBuiltinFlowDefaultSummary(categoryKey, locale))
    .filter((value): value is string => value != null);
  if (localized && defaults.includes(trimmed)) return localized;
  return trimmed;
}

export function formatRoutineSummaryHint(summary: string): string | null {
  const t = summary.trim();
  if (t.length === 0) return null;
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
}
