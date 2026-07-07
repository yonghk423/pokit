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
    previousValue: 68.9,
    values: [69.2, 69.0, 68.8, 69.1, 68.7, 68.9, 68.5],
  },
  bp: {
    currentValue: 118,
    previousValue: 122,
    values: [125, 122, 120, 118, 119, 121, 118],
  },
  sleep: {
    currentValue: 7.5,
    previousValue: 6.5,
    values: [6, 7, 6.5, 8, 7, 6.5, 7.5],
  },
  steps: {
    currentValue: 8432,
    previousValue: 7200,
    values: [5000, 6200, 8000, 7500, 9000, 7200, 8432],
  },
  water: {
    currentValue: 1500,
    previousValue: 1200,
    values: [1000, 1500, 1800, 1200, 2000, 1200, 1500],
  },
  heart: {
    currentValue: 72,
    previousValue: 78,
    values: [75, 80, 72, 78, 74, 78, 72],
  },
  bodyfat: {
    currentValue: 22.5,
    previousValue: 23.1,
    values: [24, 23.8, 23.5, 23.2, 23, 23.1, 22.5],
  },
  height: {
    currentValue: 172,
    previousValue: 172,
    values: [172, 172, 172, 172, 172, 172, 172],
  },
  calories: {
    currentValue: 1850,
    previousValue: 2100,
    values: [2000, 1900, 2200, 1800, 1950, 2100, 1850],
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
