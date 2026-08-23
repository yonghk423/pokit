const mockScheduleDailyLocalNotification = jest.fn();
const mockCancelScheduledNotificationByIdentifier = jest.fn();
const mockCancelScheduledNotificationsByEventType = jest.fn();
const mockCancelLocalNotificationsById = jest.fn();
const mockEnsureLocalNotificationPermission = jest.fn();
const mockSaveIncompleteRoutineReminder = jest.fn();
const mockLoadIncompleteRoutineReminder = jest.fn();
const mockDayPlanGetState = jest.fn();
let mockPendingCounts = { bag: 2, sections: 1, spine: 1 };

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
    mockScheduleDailyLocalNotification.mockResolvedValue('pokit:incomplete-routine-reminder');
    mockCancelScheduledNotificationByIdentifier.mockResolvedValue(undefined);
    mockCancelScheduledNotificationsByEventType.mockResolvedValue(undefined);
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
    mockEnsureLocalNotificationPermission.mockResolvedValue(true);
  });

  it('schedules daily notification with pending count when enabled', async () => {
    const { syncIncompleteRoutineReminderNotifications, INCOMPLETE_ROUTINE_REMINDER_NOTIFICATION_ID } =
      loadSyncModule();

    const ok = await syncIncompleteRoutineReminderNotifications();

    expect(ok).toBe(true);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: INCOMPLETE_ROUTINE_REMINDER_NOTIFICATION_ID,
        hour: 22,
        minute: 0,
        title: '미완료 루틴 4개가 있습니다.',
        body: '▤ 2개   ☀︎ 1개   ◷ 1개',
        data: { eventType: 'incompleteRoutineReminder' },
      }),
    );
  });

  it('cancels without scheduling when pending count is zero', async () => {
    mockPendingCounts = { bag: 0, sections: 0, spine: 0 };
    const { syncIncompleteRoutineReminderNotifications } = loadSyncModule();
    await syncIncompleteRoutineReminderNotifications();

    expect(mockScheduleDailyLocalNotification).not.toHaveBeenCalled();
    expect(mockSaveIncompleteRoutineReminder).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true, notificationId: null }),
    );
  });
});
