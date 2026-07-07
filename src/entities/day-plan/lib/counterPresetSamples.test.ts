import { buildInitialCustomFlowDetailConfig } from './customFlowTemplate';
import {
  applyCounterActivityPreset,
  applyCounterActivitySettings,
  pickCounterSettingsForCreate,
} from './counterPresetSamples';
import { normalizeCounterDetailConfig } from './customFlowTemplateConfigs';
import { getInitialCounterDataConfig } from './customFlowTemplateConfigs';
import {
  applyReminderSchedulePreset,
  pickReminderSettingsForCreate,
} from './reminderPresetSamples';
import { normalizeReminderDetailConfig } from './customFlowTemplateConfigs';
import { REMINDER_SCHEDULE_PRESETS } from './reminderSchedule';

describe('counterPresetSamples', () => {
  it('applies counter preset with sample history in preview', () => {
    const base = getInitialCounterDataConfig();
    const preset = {
      id: 'pushup',
      activityLabel: '푸쉬업',
      unitKey: 'rep' as const,
      goalCount: 50,
      stepSize: 5,
      secondaryStepSize: 10,
    };
    const next = applyCounterActivityPreset(base, preset, { includeSampleData: true });
    expect(next.activityLabel).toBe('푸쉬업');
    expect(next.unitKey).toBe('rep');
    expect(next.stepSize).toBe(5);
    expect(next.history.length).toBe(7);
  });

  it('applies counter settings patch', () => {
    const base = getInitialCounterDataConfig();
    const next = applyCounterActivitySettings(base, {
      activityLabel: '독서',
      unitKey: 'page',
      goalCount: 30,
      stepSize: 5,
      secondaryStepSize: 10,
    });
    expect(next.activityLabel).toBe('독서');
    expect(next.unitKey).toBe('page');
    expect(next.goalCount).toBe(30);
  });

  it('persists counter settings on create without runtime counts', () => {
    const created = buildInitialCustomFlowDetailConfig('counter', {
      templateSeed: {
        templateKey: 'counter',
        activityLabel: '독서',
        unitKey: 'page',
        goalCount: 30,
        stepSize: 5,
        secondaryStepSize: 10,
        currentCount: 12,
      },
    });
    const cfg = normalizeCounterDetailConfig(created);
    expect(cfg.activityLabel).toBe('독서');
    expect(cfg.unitKey).toBe('page');
    expect(cfg.currentCount).toBe(0);
    expect(pickCounterSettingsForCreate({ activityLabel: '' })).toBeNull();
  });
});

describe('reminderPresetSamples', () => {
  it('applies reminder preset with demo progress', () => {
    const base = normalizeReminderDetailConfig({ templateKey: 'reminder' });
    const preset = REMINDER_SCHEDULE_PRESETS[0]!;
    const next = applyReminderSchedulePreset(base, preset, { includeDemoProgress: true });
    expect(next.reminderItems).toEqual(preset.items);
    expect(next.completedTimes).toEqual(['09:00']);
  });

  it('persists reminder items on create', () => {
    const items = REMINDER_SCHEDULE_PRESETS[1]!.items;
    const created = buildInitialCustomFlowDetailConfig('reminder', {
      templateSeed: { templateKey: 'reminder', reminderItems: items, completedTimes: ['10:00'] },
    });
    const cfg = normalizeReminderDetailConfig(created);
    expect(cfg.reminderItems).toEqual(items);
    expect(cfg.completedTimes).toEqual([]);
    expect(pickReminderSettingsForCreate({ reminderItems: [{ time: '09:00', label: '' }] })).toBeNull();
  });
});
