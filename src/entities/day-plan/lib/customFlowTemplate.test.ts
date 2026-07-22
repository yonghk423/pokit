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
  it('defaults to checklist when templateKey is missing', () => {
    expect(resolveCustomFlowTemplateKey({ displayName: '테스트' })).toBe('checklist');
  });

  it('detects measurement template', () => {
    expect(resolveCustomFlowTemplateKey(getInitialMeasurementDataConfig())).toBe('measurement');
  });

  it('has labels for every template key', () => {
    expect(CUSTOM_FLOW_TEMPLATE_KEYS).toHaveLength(9);
  });

  it('maps legacy abstain template to checklist label', () => {
    expect(resolveAppliedCustomFlowTemplateLabel('abstain')).toBe('할 일 체크');
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
