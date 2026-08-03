const mockCancelLocalNotificationsById = jest.fn();
const mockCancelScheduledNotificationsByEventType = jest.fn();
const mockScheduleWeeklyLocalNotification = jest.fn();
const mockLoadCategoryReminderRules = jest.fn();
const mockLoadCategoryReminderScheduled = jest.fn();
const mockSaveCategoryReminderScheduled = jest.fn();

let scheduledIds = new Set<string>();
let savedRows: { slotKey: string; notificationId: string }[] = [];
let nextNotificationId = 0;

jest.mock('@shared/lib/notifications', () => ({
  cancelLocalNotificationsById: (...args: unknown[]) =>
    mockCancelLocalNotificationsById(...args),
  cancelScheduledNotificationsByEventType: (...args: unknown[]) =>
    mockCancelScheduledNotificationsByEventType(...args),
  scheduleWeeklyLocalNotification: (...args: unknown[]) =>
    mockScheduleWeeklyLocalNotification(...args),
}));

jest.mock('@shared/lib/storage', () => ({
  loadCategoryReminderRules: () => mockLoadCategoryReminderRules(),
  loadCategoryReminderScheduled: () => mockLoadCategoryReminderScheduled(),
  loadGoalDetailCategoryConfig: () => ({}),
  saveCategoryReminderScheduled: (...args: unknown[]) =>
    mockSaveCategoryReminderScheduled(...args),
}));

jest.mock('@entities/local-notifications', () => ({
  useLocalNotificationsStore: {
    getState: () => ({
      permission: 'granted',
      refreshPermission: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

jest.mock('@entities/day-plan', () => ({
  categoryReminderLabelKo: () => '테스트 루틴',
  findReminderScheduleItem: () => undefined,
  formatHhmmClockKo: (hhmm: string) => hhmm,
  isCustomFlowCategoryKey: () => false,
  normalizeReminderDetailConfig: (raw: unknown) => raw,
  parseHHmmToMinutes: (hhmm: string) => {
    const [hour, minute] = hhmm.split(':').map(Number);
    return hour * 60 + minute;
  },
  resolveCategoryReminderNotifyWeekdays: () => new Map([['customFlow:test', [1]]]),
  resolveCustomFlowTemplateKey: () => 'none',
  resolveReminderItemTitle: () => '',
  useDayPlanDraftStore: {
    getState: () => ({
      priorityCategoryOrder: [],
      prioritySectionsCategoryOrder: [],
    }),
  },
  useDayPlanStore: {
    getState: () => ({ blocks: [] }),
  },
  useFixedFlowSetsStore: {
    getState: () => ({ sets: [], activeSetIds: [] }),
  },
}));

describe('syncCategoryReminderNotifications', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    scheduledIds = new Set();
    savedRows = [];
    nextNotificationId = 0;

    mockLoadCategoryReminderRules.mockReturnValue({
      'customFlow:test': { enabled: true, times: ['09:00'] },
    });
    mockLoadCategoryReminderScheduled.mockImplementation(() => savedRows);
    mockSaveCategoryReminderScheduled.mockImplementation(
      (rows: { slotKey: string; notificationId: string }[]) => {
        savedRows = rows;
      },
    );
    mockCancelLocalNotificationsById.mockImplementation(async (ids: string[]) => {
      for (const id of ids) scheduledIds.delete(id);
    });
    mockCancelScheduledNotificationsByEventType.mockImplementation(async () => {
      scheduledIds.clear();
    });
    mockScheduleWeeklyLocalNotification.mockImplementation(async () => {
      await Promise.resolve();
      const id = `notification-${++nextNotificationId}`;
      scheduledIds.add(id);
      return id;
    });
  });

  it('동시에 여러 번 호출돼도 최종 예약은 한 개만 남긴다', async () => {
    const { syncCategoryReminderNotifications, CATEGORY_REMINDER_EVENT_TYPE } =
      require('./syncCategoryReminderNotifications') as typeof import('./syncCategoryReminderNotifications');

    await Promise.all([
      syncCategoryReminderNotifications(),
      syncCategoryReminderNotifications(),
      syncCategoryReminderNotifications(),
    ]);

    expect(scheduledIds.size).toBe(1);
    expect(savedRows).toHaveLength(1);
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledWith(
      CATEGORY_REMINDER_EVENT_TYPE,
    );
    expect(mockScheduleWeeklyLocalNotification).toHaveBeenLastCalledWith(
      expect.objectContaining({
        identifier: 'pokit:category-reminder:customFlow:test:09:00@1',
      }),
    );
  });
});
