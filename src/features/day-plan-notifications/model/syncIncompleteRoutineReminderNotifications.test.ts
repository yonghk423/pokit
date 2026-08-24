const mockScheduleLocalNotification = jest.fn();
const mockScheduleDailyLocalNotification = jest.fn();
const mockScheduleWeeklyLocalNotification = jest.fn();
const mockCancelScheduledNotificationByIdentifier = jest.fn();
const mockCancelScheduledNotificationsByEventType = jest.fn();
const mockCancelLocalNotificationsById = jest.fn();
const mockEnsureLocalNotificationPermission = jest.fn();
const mockGetScheduledLocalNotifications = jest.fn();
const mockSaveIncompleteRoutineReminder = jest.fn();
const mockLoadIncompleteRoutineReminder = jest.fn();
const mockDayPlanGetState = jest.fn();
let mockPendingCounts = { bag: 2, sections: 1, spine: 1 };

jest.mock('@shared/lib/notifications', () => ({
  scheduleLocalNotification: (...args: unknown[]) => mockScheduleLocalNotification(...args),
  scheduleDailyLocalNotification: (...args: unknown[]) =>
    mockScheduleDailyLocalNotification(...args),
  scheduleWeeklyLocalNotification: (...args: unknown[]) =>
    mockScheduleWeeklyLocalNotification(...args),
  cancelScheduledNotificationByIdentifier: (...args: unknown[]) =>
    mockCancelScheduledNotificationByIdentifier(...args),
  cancelScheduledNotificationsByEventType: (...args: unknown[]) =>
    mockCancelScheduledNotificationsByEventType(...args),
  cancelLocalNotificationsById: (...args: unknown[]) => mockCancelLocalNotificationsById(...args),
  ensureLocalNotificationPermission: (...args: unknown[]) =>
    mockEnsureLocalNotificationPermission(...args),
  getScheduledLocalNotifications: (...args: unknown[]) =>
    mockGetScheduledLocalNotifications(...args),
}));

jest.mock('@shared/lib/storage', () => ({
  loadIncompleteRoutineReminder: (...args: unknown[]) => mockLoadIncompleteRoutineReminder(...args),
  saveIncompleteRoutineReminder: (...args: unknown[]) => mockSaveIncompleteRoutineReminder(...args),
}));

jest.mock('@entities/local-notifications', () => ({
  useLocalNotificationsStore: {
    getState: () => ({
      permission: 'granted',
      refreshPermission: jest.fn(),
    }),
  },
}));

jest.mock('@entities/day-plan', () => ({
  countPendingRoutinesByLayout: () => mockPendingCounts,
  totalPendingRoutinesByLayout: (counts: typeof mockPendingCounts) =>
    counts.bag + counts.sections + counts.spine,
  parseHHmmToMinutes: (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  },
  useDayPlanDraftStore: {
    getState: () => ({
      priorityCategoryOrder: [],
      prioritySectionsCategoryOrder: [],
      prioritySectionsMealSlots: {},
      completedFocusCategoryKeys: [],
      planCompletionDismissedKeys: [],
      isFocusStarted: false,
      priorityStart: '07:00',
      priorityEnd: '23:00',
    }),
  },
  useDayPlanLayoutModeVisibilityStore: {
    getState: () => ({
      visibility: { bag: true, sections: true, spine: true },
    }),
  },
  useDayPlanStore: {
    getState: () => mockDayPlanGetState(),
  },
}));

type SyncModule = typeof import('./syncIncompleteRoutineReminderNotifications');

function loadSyncModule(): SyncModule {
  return require('./syncIncompleteRoutineReminderNotifications') as SyncModule;
}

describe('syncIncompleteRoutineReminderNotifications', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockPendingCounts = { bag: 2, sections: 1, spine: 1 };
    mockDayPlanGetState.mockReturnValue({
      blocks: [],
      completedBlockIds: [],
      skippedBlockIds: [],
    });
    mockLoadIncompleteRoutineReminder.mockReturnValue({
      enabled: true,
      reminderHhmm: '22:00',
      notificationId: null,
    });
    mockScheduleLocalNotification.mockResolvedValue('pokit:incomplete-routine-date:2026-08-23');
    mockScheduleDailyLocalNotification.mockResolvedValue('pokit:incomplete-routine-reminder');
    mockScheduleWeeklyLocalNotification.mockResolvedValue('pokit:incomplete-routine-weekly:0');
    mockCancelScheduledNotificationByIdentifier.mockResolvedValue(undefined);
    mockCancelScheduledNotificationsByEventType.mockResolvedValue(undefined);
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
    mockEnsureLocalNotificationPermission.mockResolvedValue(true);
    mockGetScheduledLocalNotifications.mockResolvedValue([]);
  });

  it('schedules a daily hour:minute calendar reminder when enabled', async () => {
    const { syncIncompleteRoutineReminderNotifications } = loadSyncModule();

    const ok = await syncIncompleteRoutineReminderNotifications();

    expect(ok).toBe(true);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(1);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'pokit:incomplete-routine-reminder',
        title: '미완료 루틴 4개가 있습니다.',
        body: '▤ 2개   ☀︎ 1개   ◷ 1개',
        hour: 22,
        minute: 0,
        data: { eventType: 'incompleteRoutineReminder' },
      }),
    );
    expect(mockScheduleLocalNotification).not.toHaveBeenCalled();
    expect(mockScheduleWeeklyLocalNotification).not.toHaveBeenCalled();
  });

  it('cancels without scheduling when pending count is zero', async () => {
    mockPendingCounts = { bag: 0, sections: 0, spine: 0 };
    const { syncIncompleteRoutineReminderNotifications } = loadSyncModule();
    await syncIncompleteRoutineReminderNotifications();

    expect(mockScheduleLocalNotification).not.toHaveBeenCalled();
    expect(mockScheduleDailyLocalNotification).not.toHaveBeenCalled();
    expect(mockScheduleWeeklyLocalNotification).not.toHaveBeenCalled();
    expect(mockSaveIncompleteRoutineReminder).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, notificationId: null }),
    );
  });

  it('runs the latest sync again when settings change during an in-flight sync', async () => {
    let releaseFirstCancel: (() => void) | null = null;
    mockCancelScheduledNotificationByIdentifier.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          releaseFirstCancel = resolve;
        }),
    );
    mockLoadIncompleteRoutineReminder
      .mockReturnValueOnce({
        enabled: false,
        reminderHhmm: '22:00',
        notificationId: null,
      })
      .mockReturnValue({
        enabled: true,
        reminderHhmm: '22:01',
        notificationId: null,
      });

    const { syncIncompleteRoutineReminderNotifications } = loadSyncModule();
    const first = syncIncompleteRoutineReminderNotifications();
    await Promise.resolve();
    await Promise.resolve();

    const second = syncIncompleteRoutineReminderNotifications();
    releaseFirstCancel?.();
    await Promise.all([first, second]);
    await new Promise<void>((resolve) => setImmediate(resolve));

    const trigger = mockScheduleDailyLocalNotification.mock.calls.find((call) => {
      const params = call[0] as { hour?: number; minute?: number } | undefined;
      return params?.hour === 22 && params?.minute === 1;
    });
    expect(trigger).toBeDefined();
  });
});
