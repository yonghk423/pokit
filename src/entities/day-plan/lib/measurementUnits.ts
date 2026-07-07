export type MeasurementUnitKey =
  | 'kg'
  | 'mmHg'
  | 'hours'
  | 'percent'
  | 'ml'
  | 'L'
  | 'steps'
  | 'min'
  | 'bpm'
  | 'cm'
  | 'kcal'
  | 'custom'
  | 'none';

export const MEASUREMENT_UNIT_OPTIONS: ReadonlyArray<{
  key: MeasurementUnitKey;
  labelKo: string;
}> = [
  { key: 'kg', labelKo: 'kg' },
  { key: 'mmHg', labelKo: 'mmHg' },
  { key: 'hours', labelKo: '시간' },
  { key: 'min', labelKo: '분' },
  { key: 'percent', labelKo: '%' },
  { key: 'ml', labelKo: 'ml' },
  { key: 'L', labelKo: 'L' },
  { key: 'steps', labelKo: '걸음' },
  { key: 'bpm', labelKo: 'bpm' },
  { key: 'cm', labelKo: 'cm' },
  { key: 'kcal', labelKo: 'kcal' },
  { key: 'custom', labelKo: '직접 입력' },
  { key: 'none', labelKo: '없음' },
] as const;

export type MeasurementMetricPreset = {
  id: string;
  metricLabel: string;
  unit: MeasurementUnitKey;
  customUnitLabel?: string;
  sampleGoal?: number;
};

/** 자주 쓰는 기록 항목 — 설정에서 한 번에 채우기 */
export const MEASUREMENT_METRIC_PRESETS: readonly MeasurementMetricPreset[] = [
  { id: 'weight', metricLabel: '체중', unit: 'kg', sampleGoal: 65 },
  { id: 'bp', metricLabel: '혈압', unit: 'mmHg', sampleGoal: 120 },
  { id: 'sleep', metricLabel: '수면', unit: 'hours', sampleGoal: 8 },
  { id: 'steps', metricLabel: '걸음 수', unit: 'steps', sampleGoal: 10000 },
  { id: 'water', metricLabel: '물 섭취', unit: 'ml', sampleGoal: 2000 },
  { id: 'heart', metricLabel: '심박수', unit: 'bpm', sampleGoal: 70 },
  { id: 'bodyfat', metricLabel: '체지방', unit: 'percent', sampleGoal: 20 },
  { id: 'height', metricLabel: '키', unit: 'cm' },
  { id: 'calories', metricLabel: '섭취 칼로리', unit: 'kcal', sampleGoal: 2000 },
] as const;

const MEASUREMENT_UNITS = new Set<MeasurementUnitKey>(
  MEASUREMENT_UNIT_OPTIONS.map((opt) => opt.key),
);

export function normalizeMeasurementUnit(raw: unknown): MeasurementUnitKey {
  return typeof raw === 'string' && MEASUREMENT_UNITS.has(raw as MeasurementUnitKey)
    ? (raw as MeasurementUnitKey)
    : 'none';
}

export function normalizeMeasurementCustomUnitLabel(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, 12);
}

export function resolveMeasurementUnitLabel(
  unit: MeasurementUnitKey,
  customUnitLabel?: string,
): string {
  if (unit === 'custom') return normalizeMeasurementCustomUnitLabel(customUnitLabel);
  if (unit === 'none') return '';
  return MEASUREMENT_UNIT_OPTIONS.find((opt) => opt.key === unit)?.labelKo ?? '';
}

export function measurementValuePrecision(unit: MeasurementUnitKey): number {
  switch (unit) {
    case 'kg':
    case 'hours':
    case 'percent':
    case 'cm':
    case 'L':
      return 1;
    case 'mmHg':
    case 'steps':
    case 'ml':
    case 'min':
    case 'bpm':
    case 'kcal':
      return 0;
    case 'custom':
    case 'none':
    default:
      return 1;
  }
}

export function formatMeasurementValue(value: number, unit: MeasurementUnitKey): string {
  if (!Number.isFinite(value)) return '—';
  const precision = measurementValuePrecision(unit);
  const fixed = value.toFixed(precision);
  return fixed.replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
}

export function formatMeasurementDelta(
  current: number,
  previous: number,
  unit: MeasurementUnitKey,
): string | null {
  if (previous <= 0 || current === previous) return null;
  const delta = current - previous;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatMeasurementValue(delta, unit)}`;
}

export function measurementQuickDeltas(unit: MeasurementUnitKey): number[] {
  switch (unit) {
    case 'kg':
      return [-0.5, -0.1, 0.1, 0.5];
    case 'mmHg':
      return [-5, -1, 1, 5];
    case 'hours':
      return [-1, -0.5, 0.5, 1];
    case 'min':
      return [-30, -10, 10, 30];
    case 'percent':
      return [-1, -0.5, 0.5, 1];
    case 'ml':
      return [-250, -100, 100, 250];
    case 'L':
      return [-0.5, -0.25, 0.25, 0.5];
    case 'steps':
      return [-1000, -500, 500, 1000];
    case 'bpm':
      return [-5, -1, 1, 5];
    case 'cm':
      return [-1, -0.5, 0.5, 1];
    case 'kcal':
      return [-200, -50, 50, 200];
    case 'custom':
    case 'none':
    default:
      return [-5, -1, 1, 5];
  }
}

export function roundMeasurementValue(value: number, unit: MeasurementUnitKey): number {
  const precision = measurementValuePrecision(unit);
  const factor = 10 ** precision;
  return Math.max(0, Math.round(value * factor) / factor);
}
