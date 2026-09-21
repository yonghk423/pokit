import { useAppLocaleStore } from '@shared/lib/i18n/model/localeStore';

import {
  buildInitialCustomFlowDetailConfig,
  buildTemplateSetupConfig,
  CUSTOM_FLOW_TEMPLATE_KEYS,
  pickChecklistSettingsForCreate,
  resolveAppliedCustomFlowTemplateLabel,
  resolveCustomFlowTemplateKey,
} from './customFlowTemplate';
import {
  getInitialMeasurementDataConfig,
  normalizeMeasurementDetailConfig,
  normalizeOtherDetailConfig,
} from './goalCategorySessionConfig';
import { normalizeCounterDetailConfig, normalizeHabitDetailConfig } from './customFlowTemplateConfigs';

describe('customFlowTemplate', () => {
  beforeEach(() => {
    useAppLocaleStore.setState({ locale: 'ko' });
  });
  it('defaults to checklist when templateKey is missing', () => {
    expect(resolveCustomFlowTemplateKey({ displayName: '테스트' })).toBe('checklist');
  });

  it('detects measurement template', () => {
    expect(resolveCustomFlowTemplateKey(getInitialMeasurementDataConfig())).toBe('measurement');
  });

  it('has labels for every template key', () => {
    expect(CUSTOM_FLOW_TEMPLATE_KEYS).toHaveLength(11);
  });

  it('maps legacy abstain template to checklist label', () => {
    expect(resolveAppliedCustomFlowTemplateLabel('abstain')).toBe('할 일 체크');
  });

  it('builds health intake and fasting initial configs', () => {
    const intake = buildInitialCustomFlowDetailConfig('healthIntake', { displayName: '영양제' });
    expect(resolveCustomFlowTemplateKey(intake)).toBe('healthIntake');
    const fasting = buildInitialCustomFlowDetailConfig('fasting', { displayName: '체중' });
    expect(resolveCustomFlowTemplateKey(fasting)).toBe('fasting');
  });

  it('strips measurement mock history when creating from template seed', () => {
    const created = buildInitialCustomFlowDetailConfig('measurement', {
      displayName: '체중',
      templateSeed: {
        templateKey: 'measurement',
        metricLabel: '체중',
        unit: 'kg',
        useGoalValue: true,
        goalValue: 65,
        currentValue: 68.5,
        previousValue: 68.9,
        lastRecordedDateKey: '2026-09-21',
        history: [
          { dateKey: '2026-09-15', value: 70.2 },
          { dateKey: '2026-09-21', value: 68.5 },
        ],
      },
    });
    const cfg = normalizeMeasurementDetailConfig(created);
    expect(cfg.metricLabel).toBe('체중');
    expect(cfg.goalValue).toBe(65);
    expect(cfg.currentValue).toBe(0);
    expect(cfg.previousValue).toBe(0);
    expect(cfg.history).toEqual([]);
    expect(cfg.lastRecordedDateKey).toBe('');
  });

  it('strips counter mock history when creating from template seed', () => {
    const created = buildInitialCustomFlowDetailConfig('counter', {
      displayName: '푸쉬업',
      templateSeed: {
        templateKey: 'counter',
        activityLabel: '푸쉬업',
        unitKey: 'rep',
        goalCount: 50,
        stepSize: 5,
        secondaryStepSize: 10,
        currentCount: 35,
        history: [
          { dateKey: '2026-09-15', count: 20 },
          { dateKey: '2026-09-21', count: 35 },
        ],
      },
    });
    const cfg = normalizeCounterDetailConfig(created);
    expect(cfg.activityLabel).toBe('푸쉬업');
    expect(cfg.goalCount).toBe(50);
    expect(cfg.currentCount).toBe(0);
    expect(cfg.history).toEqual([]);
  });

  it('persists health intake medicine seed when creating custom flow', () => {
    const created = buildInitialCustomFlowDetailConfig('healthIntake', {
      displayName: '비타민',
      templateSeed: {
        templateKey: 'healthIntake',
        medicine: {
          doseLabel: '비타민 D',
          morningOn: true,
          lunchOn: false,
          dinnerOn: true,
          takenCount: 2,
        },
        water: {
          goalMl: 2000,
          drankMl: 800,
        },
      },
    });
    expect(created).toMatchObject({
      templateKey: 'healthIntake',
      displayName: '비타민',
      medicine: {
        doseLabel: '비타민 D',
        morningOn: true,
        lunchOn: false,
        dinnerOn: true,
        takenCount: 0,
      },
      water: {
        drankMl: 0,
      },
    });
  });

  it('builds measurement initial config with appearance', () => {
    const cfg = buildInitialCustomFlowDetailConfig('measurement', {
      displayName: '아침 체중',
      icon: 'scalemass.fill',
      accentColor: '#356668',
    });
    expect(normalizeMeasurementDetailConfig(cfg).displayName).toBe('아침 체중');
    expect(normalizeMeasurementDetailConfig(cfg).templateKey).toBe('measurement');
  });

  it('builds checklist initial config', () => {
    const cfg = buildInitialCustomFlowDetailConfig('checklist', { displayName: '아침 루틴' });
    expect(resolveCustomFlowTemplateKey(cfg)).toBe('checklist');
  });

  it('builds counter and habit configs', () => {
    expect(normalizeCounterDetailConfig(buildInitialCustomFlowDetailConfig('counter')).templateKey).toBe(
      'counter',
    );
    expect(normalizeHabitDetailConfig(buildInitialCustomFlowDetailConfig('habit')).templateKey).toBe(
      'habit',
    );
  });

  it('setup config starts checklist items unchecked', () => {
    const cfg = normalizeOtherDetailConfig(buildTemplateSetupConfig('checklist'));
    expect(cfg.checklist.length).toBeGreaterThan(0);
    expect(cfg.checklist.every((item) => item.done === false)).toBe(true);
  });

  it('persists checklist seed when creating custom flow', () => {
    const seed = pickChecklistSettingsForCreate({
      checklist: [
        { id: 'x1', text: '커스텀 할 일', done: true },
        { id: 'x2', text: '  ', done: false },
      ],
    });
    expect(seed).toEqual({
      checklist: [{ id: 'x1', text: '커스텀 할 일', done: false }],
      templateKey: 'checklist',
    });
    const created = normalizeOtherDetailConfig(
      buildInitialCustomFlowDetailConfig('checklist', {
        displayName: '아침',
        templateSeed: seed,
      }),
    );
    expect(created.checklist).toEqual([{ id: 'x1', text: '커스텀 할 일', done: false }]);
    expect(created.displayName).toBe('아침');
  });

  it('persists summary when creating custom flow', () => {
    const created = normalizeOtherDetailConfig(
      buildInitialCustomFlowDetailConfig('checklist', {
        displayName: '이불 정리',
        summary: '아침에 이불을 정리해 하루를 가볍게 시작해요.',
      }),
    );
    expect(created.summary).toBe('아침에 이불을 정리해 하루를 가볍게 시작해요.');
  });
});
