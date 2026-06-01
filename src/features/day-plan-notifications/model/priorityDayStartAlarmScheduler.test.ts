const mockScheduleDailyLocalNotification = jest.fn();
const mockCancelScheduledNotificationByIdentifier = jest.fn();
const mockCancelScheduledNotificationsByEventType = jest.fn();
const mockCancelLocalNotificationsById = jest.fn();
const mockEnsureLocalNotificationPermission = jest.fn();
const mockSavePriorityDayStartAlarm = jest.fn();
const mockLoadPriorityDayStartAlarm = jest.fn();

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
  loadPriorityDayStartAlarm: (...args: unknown[]) => mockLoadPriorityDayStartAlarm(...args),
  savePriorityDayStartAlarm: (...args: unknown[]) => mockSavePriorityDayStartAlarm(...args),
}));

jest.mock('@entities/local-notifications', () => ({
  useLocalNotificationsStore: {
    getState: () => ({ refreshPermission: jest.fn() }),
  },
}));

type SchedulerModule = typeof import('./priorityDayStartAlarmScheduler');

function loadScheduler(): SchedulerModule {
  return require('./priorityDayStartAlarmScheduler') as SchedulerModule;
}

describe('priorityDayStartAlarmScheduler', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockLoadPriorityDayStartAlarm.mockReturnValue({ enabled: false, notificationId: null });
    mockEnsureLocalNotificationPermission.mockResolvedValue(true);
    mockScheduleDailyLocalNotification.mockResolvedValue('pokit:priority-day-start');
    mockCancelScheduledNotificationByIdentifier.mockResolvedValue(undefined);
    mockCancelScheduledNotificationsByEventType.mockResolvedValue(undefined);
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
  });

  it('schedules daily notification with fixed identifier when enabled', async () => {
    const { syncPriorityDayStartAlarm, PRIORITY_DAY_START_NOTIFICATION_ID } = loadScheduler();

    const ok = await syncPriorityDayStartAlarm({ enabled: true, startHhmm: '09:00' });

    expect(ok).toBe(true);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(1);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: PRIORITY_DAY_START_NOTIFICATION_ID,
        title: '오늘이 시작됐어요',
        hour: 9,
        minute: 0,
        data: { eventType: 'priorityDayStart' },
      }),
    );
    expect(mockSavePriorityDayStartAlarm).toHaveBeenCalledWith({
      enabled: true,
      notificationId: PRIORITY_DAY_START_NOTIFICATION_ID,
    });
  });

  it('cancels existing alarms before scheduling', async () => {
    const { syncPriorityDayStartAlarm, PRIORITY_DAY_START_NOTIFICATION_ID } = loadScheduler();

    await syncPriorityDayStartAlarm({ enabled: true, startHhmm: '09:00' });

    expect(mockCancelScheduledNotificationByIdentifier).toHaveBeenCalledWith(
      PRIORITY_DAY_START_NOTIFICATION_ID,
    );
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledWith('priorityDayStart');
  });

  it('skips re-schedule when sync key is unchanged', async () => {
    const { syncPriorityDayStartAlarm } = loadScheduler();

    await syncPriorityDayStartAlarm({ enabled: true, startHhmm: '09:00' });
    await syncPriorityDayStartAlarm({ enabled: true, startHhmm: '09:00' });

    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(1);
  });

  it('disables alarm without scheduling when enabled is false', async () => {
    const { syncPriorityDayStartAlarm } = loadScheduler();

    const ok = await syncPriorityDayStartAlarm({ enabled: false, startHhmm: '09:00' });

    expect(ok).toBe(true);
    expect(mockScheduleDailyLocalNotification).not.toHaveBeenCalled();
    expect(mockSavePriorityDayStartAlarm).toHaveBeenCalledWith({
      enabled: false,
      notificationId: null,
    });
  });

  it('dedupes concurrent sync calls', async () => {
    const { syncPriorityDayStartAlarm } = loadScheduler();

    const [a, b] = await Promise.all([
      syncPriorityDayStartAlarm({ enabled: true, startHhmm: '10:30' }),
      syncPriorityDayStartAlarm({ enabled: true, startHhmm: '10:30' }),
    ]);

    expect(a).toBe(true);
    expect(b).toBe(true);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(1);
  });
});
