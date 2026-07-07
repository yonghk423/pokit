import { addDaysToLocalDateKey, getLocalDateKey } from './localDateKey';
import {
  normalizeCounterDetailConfig,
  type CounterDetailDataConfig,
  type CounterHistoryEntry,
} from './customFlowTemplateConfigs';
import type { CounterActivityPreset, CounterUnitKey } from './counterUnits';

type CounterSampleSeries = {
  currentCount: number;
  values: number[];
};

const COUNTER_PRESET_SAMPLES: Record<string, CounterSampleSeries> = {
  pushup: { currentCount: 25, values: [30, 40, 35, 50, 45, 40, 25] },
  read: { currentCount: 12, values: [20, 25, 15, 30, 28, 22, 12] },
  meds: { currentCount: 2, values: [3, 3, 2, 3, 3, 3, 2] },
  stretch: { currentCount: 1, values: [3, 2, 3, 3, 2, 3, 1] },
  walk: { currentCount: 2, values: [3, 3, 2, 3, 3, 2, 2] },
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
