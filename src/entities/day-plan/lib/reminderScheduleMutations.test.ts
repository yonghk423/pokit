import { getInitialReminderDataConfig, normalizeReminderDetailConfig } from './customFlowTemplateConfigs';
import {
  addReminderScheduleItem,
  removeReminderScheduleItem,
  updateReminderItemLabel,
  updateReminderItemTime,
} from './customFlowTemplateRuntime';

describe('reminder schedule mutations', () => {
  it('updates label and adds item', () => {
    const base = normalizeReminderDetailConfig({
      templateKey: 'reminder',
      reminderItems: [{ time: '09:00', label: '' }],
    });
    const labeled = updateReminderItemLabel(base, '09:00', '아침 약');
    expect(labeled.reminderItems[0]?.label).toBe('아침 약');

    const added = addReminderScheduleItem(labeled, '12:00', '점심 약');
    expect(added?.reminderItems).toEqual([
      { time: '09:00', label: '아침 약' },
      { time: '12:00', label: '점심 약' },
    ]);
  });

  it('removes item but keeps at least one', () => {
    const base = normalizeReminderDetailConfig({
      templateKey: 'reminder',
      reminderItems: [
        { time: '09:00', label: '아침' },
        { time: '18:00', label: '저녁' },
      ],
      completedTimes: ['09:00'],
    });
    const next = removeReminderScheduleItem(base, '18:00');
    expect(next.reminderItems).toHaveLength(1);
    expect(next.completedTimes).toEqual(['09:00']);

    const empty = removeReminderScheduleItem(
      normalizeReminderDetailConfig({ templateKey: 'reminder', reminderItems: [{ time: '09:00', label: '유지' }] }),
      '09:00',
    );
    expect(empty.reminderItems).toEqual([{ time: '09:00', label: '' }]);
  });

  it('rejects duplicate time on add', () => {
    const base = getInitialReminderDataConfig();
    expect(addReminderScheduleItem(base, '09:00', '중복')).toBeNull();
  });

  it('updates time and migrates completion', () => {
    const base = normalizeReminderDetailConfig({
      templateKey: 'reminder',
      reminderItems: [
        { time: '09:00', label: '아침' },
        { time: '18:00', label: '저녁' },
      ],
      completedTimes: ['09:00'],
    });
    const updated = updateReminderItemTime(base, '09:00', '8:30');
    expect(updated?.reminderItems).toEqual([
      { time: '08:30', label: '아침' },
      { time: '18:00', label: '저녁' },
    ]);
    expect(updated?.completedTimes).toEqual(['08:30']);
  });

  it('rejects duplicate time on update', () => {
    const base = normalizeReminderDetailConfig({
      templateKey: 'reminder',
      reminderItems: [
        { time: '09:00', label: '아침' },
        { time: '18:00', label: '저녁' },
      ],
    });
    expect(updateReminderItemTime(base, '09:00', '18:00')).toBeNull();
  });
});
