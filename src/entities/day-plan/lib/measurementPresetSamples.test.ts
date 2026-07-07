import { buildInitialCustomFlowDetailConfig } from './customFlowTemplate';
import { normalizeMeasurementDetailConfig } from './goalCategorySessionConfig';
import {
  applyMeasurementMetricPreset,
  pickMeasurementSettingsForCreate,
} from './measurementPresetSamples';
import { getInitialMeasurementDataConfig } from './goalCategorySessionConfig';

describe('measurementPresetSamples', () => {
  it('applies preset with sample data for preview', () => {
    const base = getInitialMeasurementDataConfig();
    const preset = {
      id: 'bp',
      metricLabel: '혈압',
      unit: 'mmHg' as const,
      sampleGoal: 120,
    };
    const next = applyMeasurementMetricPreset(base, preset, { includeSampleData: true });
    expect(next.metricLabel).toBe('혈압');
    expect(next.unit).toBe('mmHg');
    expect(next.currentValue).toBe(118);
    expect(next.history.length).toBe(7);
  });

  it('picks settings for create without runtime values', () => {
    const seed = pickMeasurementSettingsForCreate({
      templateKey: 'measurement',
      metricLabel: '수면',
      unit: 'hours',
      useGoalValue: true,
      goalValue: 8,
      currentValue: 7.5,
      history: [{ dateKey: '2026-07-07', value: 7.5 }],
    });
    expect(seed).toEqual({
      metricLabel: '수면',
      unit: 'hours',
      useGoalValue: true,
      goalValue: 8,
      frequency: 'once',
    });

    const created = buildInitialCustomFlowDetailConfig('measurement', {
      displayName: '아침 수면',
      templateSeed: {
        templateKey: 'measurement',
        metricLabel: '수면',
        unit: 'hours',
        useGoalValue: true,
        goalValue: 8,
        currentValue: 7.5,
      },
    });
    const cfg = normalizeMeasurementDetailConfig(created);
    expect(cfg.metricLabel).toBe('수면');
    expect(cfg.unit).toBe('hours');
    expect(cfg.currentValue).toBe(0);
    expect(cfg.history).toEqual([]);
  });
});
