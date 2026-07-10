import {
  buildInitialCustomFlowDetailConfig,
  CUSTOM_FLOW_TEMPLATE_KEYS,
  resolveAppliedCustomFlowTemplateLabel,
  resolveCustomFlowTemplateKey,
} from './customFlowTemplate';
import {
  getInitialMeasurementDataConfig,
  normalizeMeasurementDetailConfig,
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
});
