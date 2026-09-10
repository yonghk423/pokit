jest.mock('@shared/lib/notifications', () => ({
  cancelLocalNotificationsById: jest.fn(async () => undefined),
  cancelScheduledNotificationByIdentifier: jest.fn(async () => undefined),
  getScheduledLocalNotifications: jest.fn(async () => []),
}));

jest.mock('@shared/lib/storage', () => ({
  loadIncompleteRoutineReminder: jest.fn(),
  saveIncompleteRoutineReminder: jest.fn(),
}));

const mockCancelLocalNotificationsById = jest.requireMock('@shared/lib/notifications')
  .cancelLocalNotificationsById as jest.Mock;
const mockCancelScheduledNotificationByIdentifier = jest.requireMock('@shared/lib/notifications')
  .cancelScheduledNotificationByIdentifier as jest.Mock;
const mockLoadIncompleteRoutineReminder = jest.requireMock('@shared/lib/storage')
  .loadIncompleteRoutineReminder as jest.Mock;
const mockSaveIncompleteRoutineReminder = jest.requireMock('@shared/lib/storage')
  .saveIncompleteRoutineReminder as jest.Mock;

type SyncModule = typeof import('./syncIncompleteRoutineReminderNotifications');

function loadSyncModule(): SyncModule {
  return require('./syncIncompleteRoutineReminderNotifications') as SyncModule;
}

describe('syncIncompleteRoutineReminderNotifications', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockLoadIncompleteRoutineReminder.mockReturnValue({
      enabled: true,
      reminderHhmm: '22:00',
      notificationId: 'pokit:incomplete-routine-reminder',
    });
    mockCancelScheduledNotificationByIdentifier.mockResolvedValue(undefined);
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
  });

  it('retires leftover schedules and forces enabled off', async () => {
    const { syncIncompleteRoutineReminderNotifications } = loadSyncModule();

    const ok = await syncIncompleteRoutineReminderNotifications();

    expect(ok).toBe(true);
    expect(mockCancelScheduledNotificationByIdentifier).toHaveBeenCalled();
    expect(mockSaveIncompleteRoutineReminder).toHaveBeenCalledWith({
      enabled: false,
      reminderHhmm: '22:00',
      notificationId: null,
    });
  });

  it('skips save when already disabled with no notification id', async () => {
    mockLoadIncompleteRoutineReminder.mockReturnValue({
      enabled: false,
      reminderHhmm: '22:00',
      notificationId: null,
    });
    const { syncIncompleteRoutineReminderNotifications } = loadSyncModule();

    await syncIncompleteRoutineReminderNotifications();

    expect(mockSaveIncompleteRoutineReminder).not.toHaveBeenCalled();
  });
});
