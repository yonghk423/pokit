import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';

import { persistReminderTemplateNotificationRule } from './persistReminderTemplateNotificationRule';
import { persistSingleCategoryReminderRule } from './persistSingleCategoryReminderRule';

jest.mock('./persistSingleCategoryReminderRule', () => ({
  persistSingleCategoryReminderRule: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  localStorageClient.removeItem(StorageKeys.settings);
  jest.clearAllMocks();
});

describe('persistReminderTemplateNotificationRule', () => {
  it('enables OS reminders from reminderItems times', async () => {
    await persistReminderTemplateNotificationRule('customFlow:test-reminder', {
      templateKey: 'reminder',
      reminderItems: [
        { time: '09:00', label: '아침 영양제' },
        { time: '18:00', label: '저녁 약' },
      ],
    });

    expect(persistSingleCategoryReminderRule).toHaveBeenCalledWith('customFlow:test-reminder', {
      enabled: true,
      times: ['09:00', '18:00'],
    });
  });

  it('disables OS reminders for default-only placeholder config', async () => {
    await persistReminderTemplateNotificationRule('customFlow:test-reminder', {
      templateKey: 'reminder',
      reminderItems: [{ time: '09:00', label: '' }],
    });

    expect(persistSingleCategoryReminderRule).toHaveBeenCalledWith('customFlow:test-reminder', {
      enabled: false,
      times: [],
    });
  });

  it('ignores non-reminder templates', async () => {
    await persistReminderTemplateNotificationRule('customFlow:test-checklist', {
      templateKey: 'checklist',
      checklist: [],
    });

    expect(persistSingleCategoryReminderRule).not.toHaveBeenCalled();
  });
});
