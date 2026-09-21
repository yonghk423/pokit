import { addDaysToLocalDateKey, getLocalDateKey } from './localDateKey';
import {
  normalizeMeasurementDetailConfig,
  type MeasurementDetailDataConfig,
  type MeasurementHistoryEntry,
} from './goalCategorySessionConfig';
import type { MeasurementMetricPreset } from './measurementUnits';

type SampleSeries = {
  currentValue: number;
  previousValue: number;
  values: number[];
};

const MEASUREMENT_PRESET_SAMPLES: Record<string, SampleSeries> = {
  weight: {
    currentValue: 68.5,
    previousValue: 69.1,
    values: [70.2, 69.8, 69.4, 69.9, 69.1, 68.8, 68.5],
  },
  bp: {
    currentValue: 118,
    previousValue: 124,
    values: [128, 124, 121, 119, 126, 122, 118],
  },
  sleep: {
    currentValue: 7.5,
    previousValue: 5.5,
    values: [5.0, 6.5, 7.0, 4.5, 8.0, 6.0, 7.5],
  },
  steps: {
    currentValue: 8432,
    previousValue: 4200,
    values: [3200, 5800, 9100, 4500, 10200, 6800, 8432],
  },
  water: {
    currentValue: 1500,
    previousValue: 800,
    values: [600, 1200, 2000, 900, 1800, 1100, 1500],
  },
  heart: {
    currentValue: 72,
    previousValue: 84,
    values: [88, 82, 76, 90, 78, 80, 72],
  },
  bodyfat: {
    currentValue: 22.5,
    previousValue: 23.4,
    values: [24.2, 23.9, 23.6, 23.8, 23.2, 22.9, 22.5],
  },
  height: {
    currentValue: 172,
    previousValue: 172,
    values: [172, 172, 172, 172, 172, 172, 172],
  },
  calories: {
    currentValue: 1850,
    previousValue: 2400,
    values: [2100, 1950, 2500, 1600, 2200, 2050, 1850],
  },
};

function buildHistory(today: string, values: number[]): MeasurementHistoryEntry[] {
  return values.map((value, index) => ({
    dateKey: addDaysToLocalDateKey(today, index - (values.length - 1)),
    value,
  }));
}

export function measurementPresetSampleData(
  presetId: string,
  today: string = getLocalDateKey(),
): Pick<
  MeasurementDetailDataConfig,
  'currentValue' | 'previousValue' | 'history' | 'lastRecordedDateKey'
> | null {
  const sample = MEASUREMENT_PRESET_SAMPLES[presetId];
  if (!sample) return null;
  return {
    currentValue: sample.currentValue,
    previousValue: sample.previousValue,
    history: buildHistory(today, sample.values),
    lastRecordedDateKey: today,
  };
}

export function applyMeasurementMetricPreset(
  cfg: MeasurementDetailDataConfig,
  preset: MeasurementMetricPreset,
  options?: { includeSampleData?: boolean },
): MeasurementDetailDataConfig {
  const next = normalizeMeasurementDetailConfig({
    ...cfg,
    metricLabel: preset.metricLabel,
    unit: preset.unit,
    ...(preset.unit === 'custom' && preset.customUnitLabel
      ? { customUnitLabel: preset.customUnitLabel }
      : {}),
    useGoalValue: preset.sampleGoal != null,
    goalValue: preset.sampleGoal ?? 0,
  });

  if (!options?.includeSampleData) {
    return next;
  }

  const sample = measurementPresetSampleData(preset.id);
  if (!sample) return next;
  return normalizeMeasurementDetailConfig({ ...next, ...sample });
}

/** 만들기 시 미리보기에서 고른 항목·단위만 초기 설정에 반영 */
export function pickMeasurementSettingsForCreate(raw: unknown): Record<string, unknown> | null {
  const cfg = normalizeMeasurementDetailConfig(raw);
  if (!cfg.metricLabel.trim() && cfg.unit === 'none') return null;
  return {
    metricLabel: cfg.metricLabel,
    unit: cfg.unit,
    ...(cfg.customUnitLabel ? { customUnitLabel: cfg.customUnitLabel } : {}),
    useGoalValue: cfg.useGoalValue,
    goalValue: cfg.goalValue,
    frequency: cfg.frequency,
  };
}
