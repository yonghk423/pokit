import { normalizeReminderDetailConfig } from './customFlowTemplateConfigs';
import {
  normalizeReminderScheduleItems,
  resolveReminderItemTitle,
} from './reminderSchedule';

describe('reminderSchedule', () => {
  it('normalizes reminder items with labels from legacy times', () => {
    const items = normalizeReminderScheduleItems(undefined, ['18:00', '09:00'], 5);
    expect(items).toEqual([
      { time: '09:00', label: '' },
      { time: '18:00', label: '' },
    ]);
  });

  it('keeps labels per time', () => {
    const cfg = normalizeReminderDetailConfig({
      templateKey: 'reminder',
      reminderItems: [
        { time: '09:00', label: '아침 영양제' },
        { time: '12:00', label: '물 한 잔' },
      ],
    });
    expect(cfg.reminderTimes).toEqual(['09:00', '12:00']);
    expect(resolveReminderItemTitle(cfg.reminderItems[0]!)).toBe('아침 영양제');
  });
});
