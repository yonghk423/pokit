import { localStorageClient } from './localStorageClient';
import {
  loadCategoryReminderRules,
  loadCategoryReminderScheduled,
  loadDayPlanScheduledNotifications,
  loadIncompleteRoutineReminder,
  loadMedicineReminderScheduled,
  loadPriorityDayRollMode,
  loadPriorityDayStartAlarm,
  loadWaterReminderScheduled,
  saveCategoryReminderRules,
  saveCategoryReminderScheduled,
  saveDayPlanScheduledNotifications,
  saveIncompleteRoutineReminder,
  saveMedicineReminderScheduled,
  savePriorityDayRollMode,
  savePriorityDayStartAlarm,
  saveWaterReminderScheduled,
} from './settingsStorage';
import { StorageKeys } from './storageKeys';

describe('settingsStorage', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.settings);
  });

  it('returns default priority day start alarm when missing', () => {
    expect(loadPriorityDayStartAlarm()).toEqual({
      enabled: true,
      notificationId: null,
    });
  });

  it('persists priority day start alarm', () => {
    savePriorityDayStartAlarm({
      enabled: false,
      notificationId: 'pokit:priority-day-start',
    });
    expect(loadPriorityDayStartAlarm()).toEqual({
      enabled: false,
      notificationId: 'pokit:priority-day-start',
    });
  });

  it('returns default incomplete routine reminder when missing', () => {
    expect(loadIncompleteRoutineReminder()).toEqual({
      enabled: false,
      reminderHhmm: '22:00',
      notificationId: null,
    });
  });

  it('persists incomplete routine reminder', () => {
    saveIncompleteRoutineReminder({
      enabled: true,
      reminderHhmm: '21:30',
      notificationId: 'pokit:incomplete-routine-reminder',
    });
    expect(loadIncompleteRoutineReminder()).toEqual({
      enabled: true,
      reminderHhmm: '21:30',
      notificationId: 'pokit:incomplete-routine-reminder',
    });
  });

  it('filters invalid scheduled notification rows', () => {
    localStorageClient.setJson(StorageKeys.settings, {
      dayPlanScheduledNotifications: [
        { notificationId: 'n1', blockId: 'b1', kind: 'start' },
        { notificationId: 'n2', blockId: 'b2', kind: 'invalid' },
        null,
      ],
    });
    expect(loadDayPlanScheduledNotifications()).toEqual([
      { notificationId: 'n1', blockId: 'b1', kind: 'start' },
    ]);
  });

  it('saves scheduled notifications without dropping other settings', () => {
    savePriorityDayStartAlarm({ enabled: true, notificationId: 'alarm-1' });
    saveDayPlanScheduledNotifications([
      { notificationId: 'n1', blockId: 'b1', kind: 'end' },
    ]);
    expect(loadPriorityDayStartAlarm().notificationId).toBe('alarm-1');
    expect(loadDayPlanScheduledNotifications()).toHaveLength(1);
  });

  it('persists category reminder rules and scheduled rows', () => {
    saveCategoryReminderRules({
      water: { enabled: true, times: ['09:00', '15:00'] },
      bad: { enabled: true, times: [123] } as unknown as { enabled: boolean; times: string[] },
    });
    expect(loadCategoryReminderRules()).toEqual({
      water: { enabled: true, times: ['09:00', '15:00'] },
    });
    saveCategoryReminderScheduled([{ slotKey: 'water:09:00', notificationId: 'n-water' }]);
    expect(loadCategoryReminderScheduled()).toEqual([
      { slotKey: 'water:09:00', notificationId: 'n-water' },
    ]);
  });

  it('persists medicine and water reminder schedules', () => {
    saveMedicineReminderScheduled([{ slotKey: 'med:morning', notificationId: 'n1' }]);
    saveWaterReminderScheduled([{ slotKey: 'water:10:00', notificationId: 'n2' }]);
    expect(loadMedicineReminderScheduled()).toHaveLength(1);
    expect(loadWaterReminderScheduled()[0]?.slotKey).toBe('water:10:00');
  });

  it('persists priority day roll mode', () => {
    expect(loadPriorityDayRollMode()).toBe('reset');
    savePriorityDayRollMode('keep');
    expect(loadPriorityDayRollMode()).toBe('keep');
    savePriorityDayRollMode('reset');
    expect(loadPriorityDayRollMode()).toBe('reset');
  });
});
