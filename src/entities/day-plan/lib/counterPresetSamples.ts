import { addDaysToLocalDateKey, getLocalDateKey } from './localDateKey';
import {
  normalizeCounterDetailConfig,
  type CounterDetailDataConfig,
  type CounterHistoryEntry,
} from './customFlowTemplateConfigs';
import type { CounterActivityPreset, CounterUnitKey } from './counterUnits';

type CounterSampleSeries = {
  currentCount: number;
  /** 오래된 날 → 오늘 순. 차트·미리보기용 */
  values: number[];
};

/**
 * 템플릿 미리보기용 예시 기록.
 * 목표 대비 결손·달성·과달이 보이도록 편차를 크게 둔다.
 */
const COUNTER_PRESET_SAMPLES: Record<string, CounterSampleSeries> = {
  // 목표 50개 — 주중 달성·주말 쉬엄·오늘 진행 중
  pushup: {
    currentCount: 35,
    values: [20, 45, 50, 30, 55, 50, 35],
  },
  // 목표 30페이지 — 들쭉날쭉한 독서량
  read: {
    currentCount: 18,
    values: [8, 22, 30, 12, 28, 30, 18],
  },
  // 목표 3알 — 빼먹은 날·완료 날 대비
  meds: {
    currentCount: 2,
    values: [3, 1, 3, 0, 3, 3, 2],
  },
  // 목표 3세트 — 가벼운 날·풀세트 날
  stretch: {
    currentCount: 2,
    values: [1, 3, 2, 0, 3, 3, 2],
  },
  // 목표 3바퀴 — 짧은 산책·긴 산책
  walk: {
    currentCount: 1,
    values: [2, 3, 1, 3, 0, 3, 1],
  },
};

function buildCounterHistory(today: string, values: number[]): CounterHistoryEntry[] {
  return values.map((count, index) => ({
    dateKey: addDaysToLocalDateKey(today, index - (values.length - 1)),
    count,
  }));
}

export function counterPresetSampleData(
  presetId: string,
  today: string = getLocalDateKey(),
): Pick<CounterDetailDataConfig, 'currentCount' | 'countDateKey' | 'history'> | null {
  const sample = COUNTER_PRESET_SAMPLES[presetId];
  if (!sample) return null;
  return {
    currentCount: sample.currentCount,
    countDateKey: today,
    history: buildCounterHistory(today, sample.values),
  };
}

export function applyCounterActivitySettings(
  cfg: CounterDetailDataConfig,
  input: {
    activityLabel?: string;
    unitKey?: CounterUnitKey;
    customUnitLabel?: string;
    goalCount?: number;
    stepSize?: number;
    secondaryStepSize?: number;
    dailyReset?: boolean;
  },
): CounterDetailDataConfig {
  return normalizeCounterDetailConfig({
    ...cfg,
    ...(input.activityLabel !== undefined
      ? { activityLabel: input.activityLabel.slice(0, 40) }
      : {}),
    ...(input.unitKey !== undefined ? { unitKey: input.unitKey } : {}),
    ...(input.customUnitLabel !== undefined
      ? { customUnitLabel: input.customUnitLabel.slice(0, 12) }
      : {}),
    ...(input.goalCount !== undefined ? { goalCount: input.goalCount } : {}),
    ...(input.stepSize !== undefined ? { stepSize: input.stepSize } : {}),
    ...(input.secondaryStepSize !== undefined ? { secondaryStepSize: input.secondaryStepSize } : {}),
    ...(input.dailyReset !== undefined ? { dailyReset: input.dailyReset } : {}),
  });
}

export function applyCounterActivityPreset(
  cfg: CounterDetailDataConfig,
  preset: CounterActivityPreset,
  options?: { includeSampleData?: boolean },
): CounterDetailDataConfig {
  const next = normalizeCounterDetailConfig({
    ...cfg,
    activityLabel: preset.activityLabel,
    unitKey: preset.unitKey,
    ...(preset.unitKey === 'custom' && preset.customUnitLabel
      ? { customUnitLabel: preset.customUnitLabel }
      : {}),
    goalCount: preset.goalCount,
    stepSize: preset.stepSize,
    secondaryStepSize: preset.secondaryStepSize,
    dailyReset: true,
  });

  if (!options?.includeSampleData) {
    return next;
  }

  const sample = counterPresetSampleData(preset.id);
  if (!sample) return next;
  return normalizeCounterDetailConfig({ ...next, ...sample });
}

export function pickCounterSettingsForCreate(raw: unknown): Record<string, unknown> | null {
  const cfg = normalizeCounterDetailConfig(raw);
  if (!cfg.activityLabel.trim()) return null;
  return {
    activityLabel: cfg.activityLabel,
    unitKey: cfg.unitKey,
    ...(cfg.customUnitLabel ? { customUnitLabel: cfg.customUnitLabel } : {}),
    goalCount: cfg.goalCount,
    stepSize: cfg.stepSize,
    secondaryStepSize: cfg.secondaryStepSize,
    dailyReset: cfg.dailyReset,
  };
}
