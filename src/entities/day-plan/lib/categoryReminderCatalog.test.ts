import { CUSTOM_FLOW_CATEGORY_PREFIX } from './customFlowCategoryKey';
import { categoryReminderLabelKo, CATEGORY_REMINDER_KEYS } from './categoryReminderCatalog';

describe('categoryReminderCatalog', () => {
  it('includes core reminder keys', () => {
    expect(CATEGORY_REMINDER_KEYS).toContain('reading');
    expect(CATEGORY_REMINDER_KEYS).toContain('water');
  });

  it('returns Korean labels', () => {
    expect(categoryReminderLabelKo('reading')).toBe('독서');
    expect(categoryReminderLabelKo('unknown_key')).toBe('unknown_key');
    expect(
      categoryReminderLabelKo(`${CUSTOM_FLOW_CATEGORY_PREFIX}abcdefgh`),
    ).toBe('나만의 플로우');
  });
});
