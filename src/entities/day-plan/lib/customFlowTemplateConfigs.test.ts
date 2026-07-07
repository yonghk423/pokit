import {
  CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS,
  LEGACY_CUSTOM_FLOW_TEMPLATE_KEYS,
  normalizeCounterDetailConfig,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeReminderDetailConfig,
  resolveCustomFlowTemplateKeyFromRaw,
} from './customFlowTemplateConfigs';

describe('customFlowTemplateConfigs', () => {
  it('excludes legacy templates from creatable list', () => {
    for (const key of LEGACY_CUSTOM_FLOW_TEMPLATE_KEYS) {
      expect(CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS).not.toContain(key);
    }
    expect(CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS).toEqual([
      'checklist',
      'measurement',
      'counter',
      'reminder',
    ]);
  });

  it('resolves all template keys', () => {
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'habit' })).toBe('habit');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'counter' })).toBe('counter');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'focus' })).toBe('focus');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'journal' })).toBe('journal');
    expect(resolveCustomFlowTemplateKeyFromRaw({ templateKey: 'reminder' })).toBe('reminder');
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

  it('normalizes habit and journal', () => {
    expect(normalizeHabitDetailConfig({ templateKey: 'habit' }).templateKey).toBe('habit');
    expect(normalizeJournalDetailConfig({ templateKey: 'journal', prompt: '기분' }).prompt).toBe(
      '기분',
    );
    expect(normalizeFocusDetailConfig({ templateKey: 'focus', planMin: 5 }).planMin).toBe(5);
  });
});
