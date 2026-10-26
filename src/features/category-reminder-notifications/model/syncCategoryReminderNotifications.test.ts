const mockCancelLocalNotificationsById = jest.fn();
const mockCancelScheduledNotificationsByEventType = jest.fn();
const mockLoadCategoryReminderScheduled = jest.fn();
const mockSaveCategoryReminderScheduled = jest.fn();

let savedRows: { slotKey: string; notificationId: string }[] = [];

jest.mock('@shared/lib/notifications', () => ({
  cancelLocalNotificationsById: (...args: unknown[]) =>
    mockCancelLocalNotificationsById(...args),
  cancelScheduledNotificationsByEventType: (...args: unknown[]) =>
    mockCancelScheduledNotificationsByEventType(...args),
}));

jest.mock('@shared/lib/storage', () => ({
  loadCategoryReminderScheduled: () => mockLoadCategoryReminderScheduled(),
  saveCategoryReminderScheduled: (...args: unknown[]) =>
    mockSaveCategoryReminderScheduled(...args),
}));

describe('syncCategoryReminderNotifications', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    savedRows = [{ slotKey: 'old', notificationId: 'nid-1' }];

    mockLoadCategoryReminderScheduled.mockImplementation(() => savedRows);
    mockSaveCategoryReminderScheduled.mockImplementation(
      (rows: { slotKey: string; notificationId: string }[]) => {
        savedRows = rows;
      },
    );
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
    mockCancelScheduledNotificationsByEventType.mockResolvedValue(undefined);
  });

  it('시간 알림 비활성 — 기존 예약만 취소한다', async () => {
    const { syncCategoryReminderNotifications, CATEGORY_REMINDER_EVENT_TYPE } =
      require('./syncCategoryReminderNotifications') as typeof import('./syncCategoryReminderNotifications');

    await Promise.all([
      syncCategoryReminderNotifications(),
      syncCategoryReminderNotifications(),
      syncCategoryReminderNotifications(),
    ]);

    expect(savedRows).toEqual([]);
    expect(mockCancelLocalNotificationsById).toHaveBeenCalledWith(['nid-1']);
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledWith(
      CATEGORY_REMINDER_EVENT_TYPE,
    );
  });
});
