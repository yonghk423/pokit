import {
  CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS,
  LEGACY_CUSTOM_FLOW_TEMPLATE_KEYS,
  mergeCustomFlowGoalDetailData,
  normalizeCounterDetailConfig,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeReminderDetailConfig,
  resolveCustomFlowTemplateKeyFromRaw,
} from './customFlowTemplateConfigs';
import { normalizeFastingDetailConfig } from './goalCategorySessionConfig';
import { normalizeHealthIntakeDetailConfig } from './healthIntakeDetailConfig';

describe('customFlowTemplateConfigs', () => {
  it('excludes legacy templates from creatable list', () => {
    for (const key of LEGACY_CUSTOM_FLOW_TEMPLATE_KEYS) {
      expect(CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS).not.toContain(key);
    }
    expect(CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS).toEqual([
      'checklist',
      'memo',
      'measurement',
      'healthIntake',
      'fasting',
      'counter',
      'reminder',
    ]);
  });

  it('resolves all template keys', () => {
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'habit' })).toBe('habit');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'counter' })).toBe('counter');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'focus' })).toBe('focus');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'journal' })).toBe('journal');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'memo' })).toBe('memo');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'reminder' })).toBe('reminder');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'healthIntake' })).toBe('healthIntake');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'fasting' })).toBe('fasting');
  });

  it('normalizes counter defaults', () => {
    const cfg = normalizeCounterDetailConfig({ templateKey: 'counter', goalCount: 10 });
    expect(cfg.goalCount).toBe(10);
    expect(cfg.unitLabel).toBe('회');
  });

  it('normalizes reminder times', () => {
    const cfg = normalizeReminderDetailConfig({
      templateKey: 'reminder',
      reminderTimes: ['9:30', 'invalid', '18:00'],
    });
    expect(cfg.reminderTimes).toEqual(['09:30', '18:00']);
  });

  it('prefers block reminder schedule over category merge', () => {
    const merged = mergeCustomFlowGoalDetailData(
      {
        templateKey: 'reminder',
        reminderItems: [{ time: '09:00', label: '아침' }],
        completedTimes: [],
      },
      {
        templateKey: 'reminder',
        reminderItems: [
          { time: '09:00', label: '아침' },
          { time: '18:00', label: '저녁' },
        ],
        completedTimes: ['09:00'],
      },
      { templateKey: 'reminder' },
    );
    expect(merged.reminderItems).toEqual([{ time: '09:00', label: '아침' }]);
    expect(merged.completedTimes).toEqual([]);
  });

  it('merges health intake drank and medicine taken from block', () => {
    const merged = mergeCustomFlowGoalDetailData(
      {
        templateKey: 'healthIntake',
        water: { goalMl: 2000, drankMl: 400 },
        medicine: { morningOn: true, takenCount: 1 },
      },
      {
        templateKey: 'healthIntake',
        water: { goalMl: 2000, drankMl: 200 },
        medicine: { morningOn: true, takenCount: 0 },
      },
      { templateKey: 'healthIntake' },
    );
    const intake = normalizeHealthIntakeDetailConfig(merged);
    expect(intake.water.drankMl).toBe(400);
    expect(intake.medicine.takenCount).toBe(1);
    expect(intake.templateKey).toBe('healthIntake');
  });

  it('merges fasting weight logs preferring the longer history', () => {
    const merged = mergeCustomFlowGoalDetailData(
      {
        templateKey: 'fasting',
        currentWeightKg: 68,
        weightLogs: { '2026-09-13': 68.2, '2026-09-14': 68 },
      },
      {
        templateKey: 'fasting',
        currentWeightKg: 70,
        weightLogs: { '2026-09-14': 69 },
      },
      { templateKey: 'fasting' },
    );
    const fasting = normalizeFastingDetailConfig(merged);
    expect(fasting.templateKey).toBe('fasting');
    expect(fasting.currentWeightKg).toBe(68);
    expect(Object.keys(fasting.weightLogs)).toHaveLength(2);
  });

  it('normalizes habit and journal', () => {
    expect(normalizeHabitDetailConfig({ templateKey: 'habit' }).templateKey).toBe('habit');
    expect(normalizeJournalDetailConfig({ templateKey: 'journal', prompt: '기분' }).prompt).toBe(
      '기분',
    );
    expect(normalizeFocusDetailConfig({ templateKey: 'focus', planMin: 5 }).planMin).toBe(5);
  });
});
