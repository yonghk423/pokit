export type CounterUnitKey =
  | 'count'
  | 'glass'
  | 'set'
  | 'page'
  | 'rep'
  | 'pill'
  | 'lap'
  | 'custom';

export const COUNTER_UNIT_OPTIONS: ReadonlyArray<{
  key: CounterUnitKey;
  labelKo: string;
}> = [
  { key: 'count', labelKo: '회' },
  { key: 'glass', labelKo: '잔' },
  { key: 'set', labelKo: '세트' },
  { key: 'page', labelKo: '페이지' },
  { key: 'rep', labelKo: '개' },
  { key: 'pill', labelKo: '알' },
  { key: 'lap', labelKo: '바퀴' },
  { key: 'custom', labelKo: '직접 입력' },
] as const;

export type CounterActivityPreset = {
  id: string;
  activityLabel: string;
  unitKey: CounterUnitKey;
  customUnitLabel?: string;
  goalCount: number;
  stepSize: number;
  secondaryStepSize: number;
};

/** 자주 쓰는 횟수 루틴 — 설정에서 한 번에 채우기 */
export const COUNTER_ACTIVITY_PRESETS: readonly CounterActivityPreset[] = [
  {
    id: 'pushup',
    activityLabel: '푸쉬업',
    unitKey: 'rep',
    goalCount: 50,
    stepSize: 5,
    secondaryStepSize: 10,
  },
  {
    id: 'read',
    activityLabel: '독서',
    unitKey: 'page',
    goalCount: 30,
    stepSize: 5,
    secondaryStepSize: 10,
  },
  {
    id: 'meds',
    activityLabel: '영양제',
    unitKey: 'pill',
    goalCount: 3,
    stepSize: 1,
    secondaryStepSize: 1,
  },
  {
    id: 'stretch',
    activityLabel: '스트레칭',
    unitKey: 'set',
    goalCount: 3,
    stepSize: 1,
    secondaryStepSize: 1,
  },
  {
    id: 'walk',
    activityLabel: '산책',
    unitKey: 'lap',
    goalCount: 3,
    stepSize: 1,
    secondaryStepSize: 1,
  },
] as const;

const COUNTER_UNIT_SET = new Set<CounterUnitKey>(COUNTER_UNIT_OPTIONS.map((opt) => opt.key));

const LEGACY_UNIT_LABEL_TO_KEY: Record<string, CounterUnitKey> = {
  회: 'count',
  잔: 'glass',
  세트: 'set',
  페이지: 'page',
  개: 'rep',
  알: 'pill',
  바퀴: 'lap',
};

export function normalizeCounterUnitKey(raw: unknown, legacyUnitLabel = ''): CounterUnitKey {
  if (typeof raw === 'string' && COUNTER_UNIT_SET.has(raw as CounterUnitKey)) {
    return raw as CounterUnitKey;
  }
  const label = legacyUnitLabel.trim();
  if (label in LEGACY_UNIT_LABEL_TO_KEY) {
    return LEGACY_UNIT_LABEL_TO_KEY[label]!;
  }
  return label.length > 0 ? 'custom' : 'count';
}

export function normalizeCounterCustomUnitLabel(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.trim().slice(0, 12);
}

export function resolveCounterUnitLabel(
  unitKey: CounterUnitKey,
  customUnitLabel?: string,
  legacyUnitLabel?: string,
): string {
  if (unitKey === 'custom') {
    return normalizeCounterCustomUnitLabel(customUnitLabel) || legacyUnitLabel?.trim() || '회';
  }
  return COUNTER_UNIT_OPTIONS.find((opt) => opt.key === unitKey)?.labelKo ?? '회';
}

export function normalizeCounterStepSize(raw: unknown, fallback = 1): number {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(999, Math.round(value)));
}

export function formatCounterRemainingMessage(
  remaining: number,
  unitLabel: string,
): string {
  if (remaining <= 0) return '목표를 달성했어요!';
  const unit = unitLabel.trim() || '회';
  if (unit === '회') return `${remaining}번 더 하면 목표예요`;
  return `${remaining}${unit} 더 하면 목표예요`;
}

export function formatCounterProgressLine(
  current: number,
  goal: number,
  unitLabel: string,
): string {
  const unit = unitLabel.trim() || '회';
  if (unit === '회') return `${current}/${goal}회`;
  return `${current}/${goal}${unit}`;
}
