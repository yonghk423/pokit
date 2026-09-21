const mockScheduleDailyLocalNotification = jest.fn();
const mockCancelScheduledNotificationByIdentifier = jest.fn();
const mockCancelScheduledNotificationsByEventType = jest.fn();
const mockCancelScheduledNotificationsByEventTypeExcept = jest.fn();
const mockCancelLocalNotificationsById = jest.fn();
const mockEnsureLocalNotificationPermission = jest.fn();
const mockGetScheduledDailyLocalTrigger = jest.fn();
const mockSavePriorityDayEndAlarm = jest.fn();
const mockLoadPriorityDayEndAlarm = jest.fn();

jest.mock('@shared/lib/notifications', () => ({
  scheduleDailyLocalNotification: (...args: unknown[]) =>
    mockScheduleDailyLocalNotification(...args),
  cancelScheduledNotificationByIdentifier: (...args: unknown[]) =>
    mockCancelScheduledNotificationByIdentifier(...args),
  cancelScheduledNotificationsByEventType: (...args: unknown[]) =>
    mockCancelScheduledNotificationsByEventType(...args),
  cancelScheduledNotificationsByEventTypeExcept: (...args: unknown[]) =>
    mockCancelScheduledNotificationsByEventTypeExcept(...args),
  cancelLocalNotificationsById: (...args: unknown[]) => mockCancelLocalNotificationsById(...args),
  ensureLocalNotificationPermission: (...args: unknown[]) =>
    mockEnsureLocalNotificationPermission(...args),
  getScheduledDailyLocalTrigger: (...args: unknown[]) => mockGetScheduledDailyLocalTrigger(...args),
}));

jest.mock('@shared/lib/storage', () => ({
  loadPriorityDayEndAlarm: (...args: unknown[]) => mockLoadPriorityDayEndAlarm(...args),
  savePriorityDayEndAlarm: (...args: unknown[]) => mockSavePriorityDayEndAlarm(...args),
}));

jest.mock('@entities/local-notifications', () => ({
  useLocalNotificationsStore: {
    getState: () => ({ refreshPermission: jest.fn() }),
  },
}));

type SchedulerModule = typeof import('./priorityDayEndAlarmScheduler');

function loadScheduler(): SchedulerModule {
  return require('./priorityDayEndAlarmScheduler') as SchedulerModule;
}

describe('priorityDayEndAlarmScheduler', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockLoadPriorityDayEndAlarm.mockReturnValue({ enabled: false, notificationId: null });
    mockEnsureLocalNotificationPermission.mockResolvedValue(true);
    mockScheduleDailyLocalNotification.mockResolvedValue('pokit:priority-day-end');
    mockCancelScheduledNotificationByIdentifier.mockResolvedValue(undefined);
    mockCancelScheduledNotificationsByEventType.mockResolvedValue(undefined);
    mockCancelScheduledNotificationsByEventTypeExcept.mockResolvedValue(undefined);
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
    mockGetScheduledDailyLocalTrigger.mockResolvedValue(null);
  });

  it('schedules daily notification with fixed identifier when enabled', async () => {
    const { syncPriorityDayEndAlarm, PRIORITY_DAY_END_NOTIFICATION_ID } = loadScheduler();

    const ok = await syncPriorityDayEndAlarm({ enabled: true, reminderHhmm: '23:00' });

    expect(ok).toBe(true);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(1);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: PRIORITY_DAY_END_NOTIFICATION_ID,
        title: '오늘을 돌아볼 시간이에요',
        hour: 23,
        minute: 0,
        data: { eventType: 'priorityDayEnd', reminderNextDay: false },
      }),
    );
    expect(mockCancelScheduledNotificationsByEventTypeExcept).toHaveBeenCalledWith(
      'priorityDayEnd',
      PRIORITY_DAY_END_NOTIFICATION_ID,
    );
    expect(mockSavePriorityDayEndAlarm).toHaveBeenCalledWith({
      enabled: true,
      reminderHhmm: '23:00',
      reminderNextDay: false,
      notificationId: PRIORITY_DAY_END_NOTIFICATION_ID,
    });
  });

  it('cancels existing alarms before scheduling', async () => {
    const { syncPriorityDayEndAlarm, PRIORITY_DAY_END_NOTIFICATION_ID } = loadScheduler();

    await syncPriorityDayEndAlarm({ enabled: true, reminderHhmm: '23:00' });

    expect(mockCancelScheduledNotificationByIdentifier).toHaveBeenCalledWith(
      PRIORITY_DAY_END_NOTIFICATION_ID,
    );
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledWith('priorityDayEnd');
  });

  it('skips re-schedule when sync key is unchanged', async () => {
    const { syncPriorityDayEndAlarm } = loadScheduler();

    await syncPriorityDayEndAlarm({ enabled: true, reminderHhmm: '23:00' });
    await syncPriorityDayEndAlarm({ enabled: true, reminderHhmm: '23:00' });

    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(1);
  });

  it('re-schedules when next-day flag changes', async () => {
    const { syncPriorityDayEndAlarm } = loadScheduler();

    await syncPriorityDayEndAlarm({ enabled: true, reminderHhmm: '05:00', reminderNextDay: false });
    await syncPriorityDayEndAlarm({ enabled: true, reminderHhmm: '05:00', reminderNextDay: true });

    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(2);
    expect(mockSavePriorityDayEndAlarm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        reminderHhmm: '05:00',
        reminderNextDay: true,
      }),
    );
  });

  it('disables alarm without scheduling when enabled is false', async () => {
    const { syncPriorityDayEndAlarm } = loadScheduler();

    const ok = await syncPriorityDayEndAlarm({ enabled: false, reminderHhmm: '23:00' });

    expect(ok).toBe(true);
    expect(mockScheduleDailyLocalNotification).not.toHaveBeenCalled();
    expect(mockSavePriorityDayEndAlarm).toHaveBeenCalledWith({
      enabled: false,
      reminderHhmm: '23:00',
      reminderNextDay: false,
      notificationId: null,
    });
  });

  it('serializes concurrent sync calls with the same time', async () => {
    const { syncPriorityDayEndAlarm } = loadScheduler();

    const [a, b] = await Promise.all([
      syncPriorityDayEndAlarm({ enabled: true, reminderHhmm: '22:30' }),
      syncPriorityDayEndAlarm({ enabled: true, reminderHhmm: '22:30' }),
    ]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(1);
  });
});
