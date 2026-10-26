import { persistReminderTemplateNotificationRule } from './persistReminderTemplateNotificationRule';
import { persistSingleCategoryReminderRule } from './persistSingleCategoryReminderRule';

jest.mock('./persistSingleCategoryReminderRule', () => ({
  persistSingleCategoryReminderRule: jest.fn().mockResolvedValue(undefined),
}));

const persist = jest.mocked(persistSingleCategoryReminderRule);

describe('persistReminderTemplateNotificationRule', () => {
  beforeEach(() => {
    persist.mockClear();
  });

  it('disables OS reminders for reminder templates', async () => {
    await persistReminderTemplateNotificationRule('customFlow:test-reminder', {
      templateKey: 'reminder',
      reminderItems: [
        { time: '09:00', label: '아침' },
        { time: '18:00', label: '저녁' },
      ],
    });
    expect(persist).toHaveBeenCalledWith('customFlow:test-reminder', {
      enabled: false,
      times: [],
    });
  });

  it('ignores non-reminder templates', async () => {
    await persistReminderTemplateNotificationRule('customFlow:test-checklist', {
      templateKey: 'checklist',
      checklist: [],
    });
    expect(persist).not.toHaveBeenCalled();
  });
});
