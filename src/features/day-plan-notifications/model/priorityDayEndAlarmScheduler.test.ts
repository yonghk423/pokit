const mockScheduleDailyLocalNotification = jest.fn();
const mockCancelScheduledNotificationByIdentifier = jest.fn();
const mockCancelScheduledNotificationsByEventType = jest.fn();
const mockCancelLocalNotificationsById = jest.fn();
const mockEnsureLocalNotificationPermission = jest.fn();
const mockSavePriorityDayEndAlarm = jest.fn();
const mockLoadPriorityDayEndAlarm = jest.fn();

jest.mock('@shared/lib/notifications', () => ({
  scheduleDailyLocalNotification: (...args: unknown[]) =>
    mockScheduleDailyLocalNotification(...args),
  cancelScheduledNotificationByIdentifier: (...args: unknown[]) =>
    mockCancelScheduledNotificationByIdentifier(...args),
  cancelScheduledNotificationsByEventType: (...args: unknown[]) =>
    mockCancelScheduledNotificationsByEventType(...args),
  cancelLocalNotificationsById: (...args: unknown[]) => mockCancelLocalNotificationsById(...args),
  ensureLocalNotificationPermission: (...args: unknown[]) =>
    mockEnsureLocalNotificationPermission(...args),
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
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
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
        data: { eventType: 'priorityDayEnd' },
      }),
    );
    expect(mockSavePriorityDayEndAlarm).toHaveBeenCalledWith({
      enabled: true,
      reminderHhmm: '23:00',
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

  it('disables alarm without scheduling when enabled is false', async () => {
    const { syncPriorityDayEndAlarm } = loadScheduler();

    const ok = await syncPriorityDayEndAlarm({ enabled: false, reminderHhmm: '23:00' });

    expect(ok).toBe(true);
    expect(mockScheduleDailyLocalNotification).not.toHaveBeenCalled();
    expect(mockSavePriorityDayEndAlarm).toHaveBeenCalledWith({
      enabled: false,
      reminderHhmm: '23:00',
      notificationId: null,
    });
  });

  it('dedupes concurrent sync calls', async () => {
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
