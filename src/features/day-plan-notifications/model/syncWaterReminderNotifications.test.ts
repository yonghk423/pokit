const mockFilterDayPlanFlowBlocks = jest.fn();
const mockNormalizeWaterDetailConfig = jest.fn();
const mockWaterReminderIntervalMinutes = jest.fn();
const mockBuildWaterRoutineReminderSlots = jest.fn();
const mockFormatHhmmClockKo = jest.fn();
const mockLoadGoalDetailBlockConfig = jest.fn();
const mockLoadGoalDetailCategoryConfig = jest.fn();
const mockLoadWaterReminderScheduled = jest.fn();
const mockSaveWaterReminderScheduled = jest.fn();
const mockCancelLocalNotificationsById = jest.fn();
const mockScheduleDailyLocalNotification = jest.fn();
const mockUseDayPlanStoreGetState = jest.fn();
const mockRefreshPermission = jest.fn();

let mockPermission: 'granted' | 'denied' = 'granted';

jest.mock('@entities/day-plan', () => ({
  filterDayPlanFlowBlocks: (...args: unknown[]) => mockFilterDayPlanFlowBlocks(...args),
  normalizeWaterDetailConfig: (...args: unknown[]) => mockNormalizeWaterDetailConfig(...args),
  waterReminderIntervalMinutes: (...args: unknown[]) => mockWaterReminderIntervalMinutes(...args),
  buildWaterRoutineReminderSlots: (...args: unknown[]) => mockBuildWaterRoutineReminderSlots(...args),
  formatHhmmClockKo: (...args: unknown[]) => mockFormatHhmmClockKo(...args),
  useDayPlanStore: {
    getState: () => mockUseDayPlanStoreGetState(),
  },
}));

jest.mock('@entities/local-notifications', () => ({
  useLocalNotificationsStore: {
    getState: () => ({
      refreshPermission: (...args: unknown[]) => mockRefreshPermission(...args),
      permission: mockPermission,
    }),
  },
}));

jest.mock('@shared/lib/storage', () => ({
  loadGoalDetailBlockConfig: (...args: unknown[]) => mockLoadGoalDetailBlockConfig(...args),
  loadGoalDetailCategoryConfig: (...args: unknown[]) => mockLoadGoalDetailCategoryConfig(...args),
  loadWaterReminderScheduled: (...args: unknown[]) => mockLoadWaterReminderScheduled(...args),
  saveWaterReminderScheduled: (...args: unknown[]) => mockSaveWaterReminderScheduled(...args),
}));

jest.mock('@shared/lib/notifications', () => ({
  cancelLocalNotificationsById: (...args: unknown[]) => mockCancelLocalNotificationsById(...args),
  scheduleDailyLocalNotification: (...args: unknown[]) => mockScheduleDailyLocalNotification(...args),
}));

type WaterSyncModule = typeof import('./syncWaterReminderNotifications');

function loadWaterSyncModule(): WaterSyncModule {
  return require('./syncWaterReminderNotifications') as WaterSyncModule;
}

describe('syncWaterReminderNotifications', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockPermission = 'granted';
    mockRefreshPermission.mockResolvedValue(undefined);
    mockLoadWaterReminderScheduled.mockReturnValue([]);
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
    mockScheduleDailyLocalNotification.mockResolvedValue('water-notify-1');
    mockUseDayPlanStoreGetState.mockReturnValue({
      blocks: [{ id: 'water-block-1', category: '수분섭취', title: '물 마시기' }],
    });
    mockFilterDayPlanFlowBlocks.mockImplementation((blocks: unknown) => blocks);
    mockLoadGoalDetailBlockConfig.mockReturnValue(null);
    mockLoadGoalDetailCategoryConfig.mockReturnValue({});
    mockNormalizeWaterDetailConfig.mockReturnValue({
      smartNotification: true,
      reminderPreset: '60',
      reminderCustomMin: 60,
    });
    mockWaterReminderIntervalMinutes.mockReturnValue(60);
    mockBuildWaterRoutineReminderSlots.mockReturnValue([{ sortKey: 600, wallMinuteOfDay: 600 }]);
    mockFormatHhmmClockKo.mockReturnValue('오전 10:00');
  });

  it('동일 입력 동시 호출을 1회 예약으로 합친다', async () => {
    const { syncWaterReminderNotifications } = loadWaterSyncModule();

    await Promise.all([
      syncWaterReminderNotifications({ routineStartHhmm: '09:00', routineEndHhmm: '23:00' }),
      syncWaterReminderNotifications({ routineStartHhmm: '09:00', routineEndHhmm: '23:00' }),
    ]);

    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(1);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'pokit:water-reminder:water:10:00',
        hour: 10,
        minute: 0,
        data: { eventType: 'waterIntervalReminder', blockId: 'water-block-1' },
      }),
    );
  });

  it('같은 스펙 재호출 시 재예약을 건너뛴다', async () => {
    const { syncWaterReminderNotifications } = loadWaterSyncModule();

    await syncWaterReminderNotifications({ routineStartHhmm: '09:00', routineEndHhmm: '23:00' });
    await syncWaterReminderNotifications({ routineStartHhmm: '09:00', routineEndHhmm: '23:00' });

    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(1);
    expect(mockCancelLocalNotificationsById).toHaveBeenCalledTimes(0);
  });

  it('권한 미허용 상태에서도 중복 정리 호출을 합친다', async () => {
    const { syncWaterReminderNotifications } = loadWaterSyncModule();
    mockPermission = 'denied';
    mockLoadWaterReminderScheduled.mockReturnValue([{ slotKey: 'water:10:00', notificationId: 'old-id' }]);

    await syncWaterReminderNotifications({ routineStartHhmm: '09:00', routineEndHhmm: '23:00' });
    await syncWaterReminderNotifications({ routineStartHhmm: '09:00', routineEndHhmm: '23:00' });

    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(0);
    expect(mockCancelLocalNotificationsById).toHaveBeenCalledTimes(1);
  });
});
