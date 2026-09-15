const mockFilterDayPlanFlowBlocks = jest.fn();
const mockLoadGoalDetailBlockConfig = jest.fn();
const mockLoadGoalDetailCategoryConfig = jest.fn();
const mockLoadMedicineReminderScheduled = jest.fn();
const mockSaveMedicineReminderScheduled = jest.fn();
const mockCancelLocalNotificationsById = jest.fn();
const mockCancelScheduledNotificationsByEventType = jest.fn();
const mockScheduleDailyLocalNotification = jest.fn();
const mockRefreshPermission = jest.fn();
const mockEnsurePermission = jest.fn();

let mockPermission: 'granted' | 'denied' = 'granted';

jest.mock('@entities/day-plan', () => {
  const actual = jest.requireActual('@entities/day-plan') as Record<string, unknown>;
  return {
    ...actual,
    filterDayPlanFlowBlocks: (...args: unknown[]) => mockFilterDayPlanFlowBlocks(...args),
  };
});

jest.mock('@entities/local-notifications', () => ({
  useLocalNotificationsStore: {
    getState: () => ({
      refreshPermission: (...args: unknown[]) => mockRefreshPermission(...args),
      ensurePermission: (...args: unknown[]) => mockEnsurePermission(...args),
      permission: mockPermission,
    }),
  },
}));

jest.mock('@shared/lib/storage', () => ({
  loadGoalDetailBlockConfig: (...args: unknown[]) => mockLoadGoalDetailBlockConfig(...args),
  loadGoalDetailCategoryConfig: (...args: unknown[]) => mockLoadGoalDetailCategoryConfig(...args),
  loadMedicineReminderScheduled: (...args: unknown[]) => mockLoadMedicineReminderScheduled(...args),
  saveMedicineReminderScheduled: (...args: unknown[]) => mockSaveMedicineReminderScheduled(...args),
}));

jest.mock('@shared/lib/notifications', () => ({
  cancelLocalNotificationsById: (...args: unknown[]) => mockCancelLocalNotificationsById(...args),
  cancelScheduledNotificationsByEventType: (...args: unknown[]) =>
    mockCancelScheduledNotificationsByEventType(...args),
  scheduleDailyLocalNotification: (...args: unknown[]) => mockScheduleDailyLocalNotification(...args),
}));

jest.mock('@shared/lib/i18n', () => ({
  t: (key: string, vars?: Record<string, string>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

type MedicineSyncModule = typeof import('./syncMedicineReminderNotifications');
type DayPlanBarrel = typeof import('@entities/day-plan');

function loadModule(seed?: (dayPlan: DayPlanBarrel) => void): MedicineSyncModule {
  const dayPlan = require('@entities/day-plan') as DayPlanBarrel;
  dayPlan.useDayPlanStore.setState({ ...dayPlan.useDayPlanStore.getState(), blocks: [] });
  dayPlan.useFixedFlowSetsStore.setState({
    ...dayPlan.useFixedFlowSetsStore.getState(),
    todayAppliedCategoryKeys: [],
  });
  dayPlan.useDayPlanDraftStore.setState({
    ...dayPlan.useDayPlanDraftStore.getState(),
    priorityCategoryOrder: ['healthIntake'],
    prioritySectionsCategoryOrder: [],
  });
  seed?.(dayPlan);
  return require('./syncMedicineReminderNotifications') as MedicineSyncModule;
}

const intakeConfig = {
  templateKey: 'healthIntake',
  medicine: {
    doseLabel: '비타민 D',
    morningOn: true,
    lunchOn: true,
    dinnerOn: false,
    morningTime: '08:30',
    lunchTime: '12:30',
    dinnerTime: '19:30',
    morningNotify: true,
    lunchNotify: true,
    dinnerNotify: true,
  },
};

describe('syncMedicineReminderNotifications', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockPermission = 'granted';
    mockRefreshPermission.mockResolvedValue(undefined);
    mockEnsurePermission.mockImplementation(async () => {
      mockPermission = 'granted';
      return true;
    });
    mockLoadMedicineReminderScheduled.mockReturnValue([]);
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
    mockCancelScheduledNotificationsByEventType.mockResolvedValue(undefined);
    mockScheduleDailyLocalNotification.mockResolvedValue('med-1');
    mockFilterDayPlanFlowBlocks.mockReturnValue([]);
    mockLoadGoalDetailBlockConfig.mockReturnValue(null);
    mockLoadGoalDetailCategoryConfig.mockImplementation((key: string) =>
      key === 'healthIntake' ? intakeConfig : null,
    );
  });

  it('schedules bag health-intake slots without a timed block', async () => {
    const { collectMedicineReminderSlots, syncMedicineReminderNotifications } = loadModule();
    const slots = collectMedicineReminderSlots();
    expect(slots.map((s) => s.slotKey)).toEqual(['healthIntake:morning', 'healthIntake:lunch']);
    expect(slots[0]).toMatchObject({ hour: 8, minute: 30 });

    await syncMedicineReminderNotifications();
    expect(mockEnsurePermission).toHaveBeenCalled();
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledWith('medicineDoseReminder');
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(2);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'pokit:medicine-reminder:healthIntake:morning',
        hour: 8,
        minute: 30,
        data: { eventType: 'medicineDoseReminder', blockId: 'healthIntake' },
      }),
    );
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'pokit:medicine-reminder:healthIntake:lunch',
        hour: 12,
        minute: 30,
      }),
    );
  });

  it('skips slots when notify is off', () => {
    mockLoadGoalDetailCategoryConfig.mockReturnValue({
      ...intakeConfig,
      medicine: { ...intakeConfig.medicine, morningNotify: false },
    });
    const { collectMedicineReminderSlots } = loadModule();
    expect(collectMedicineReminderSlots().map((s) => s.slotKey)).toEqual(['healthIntake:lunch']);
  });

  it('아침·점심·저녁을 각각 고정 ID와 지정 시각으로 예약한다', async () => {
    mockLoadGoalDetailCategoryConfig.mockReturnValue({
      ...intakeConfig,
      medicine: {
        ...intakeConfig.medicine,
        dinnerOn: true,
        dinnerNotify: true,
      },
    });
    const { syncMedicineReminderNotifications } = loadModule();

    await syncMedicineReminderNotifications();

    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(3);
    expect(mockScheduleDailyLocalNotification).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        identifier: 'pokit:medicine-reminder:healthIntake:morning',
        hour: 8,
        minute: 30,
      }),
    );
    expect(mockScheduleDailyLocalNotification).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        identifier: 'pokit:medicine-reminder:healthIntake:lunch',
        hour: 12,
        minute: 30,
      }),
    );
    expect(mockScheduleDailyLocalNotification).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        identifier: 'pokit:medicine-reminder:healthIntake:dinner',
        hour: 19,
        minute: 30,
      }),
    );
  });

  it('includes custom health-intake routines on today', () => {
    mockLoadGoalDetailCategoryConfig.mockImplementation((key: string) =>
      key === 'customFlow:vitamins' ? intakeConfig : null,
    );
    const { collectMedicineReminderSlots } = loadModule((dayPlan) => {
      dayPlan.useDayPlanDraftStore.setState({
        ...dayPlan.useDayPlanDraftStore.getState(),
        priorityCategoryOrder: ['customFlow:vitamins'],
        prioritySectionsCategoryOrder: [],
      });
    });
    expect(collectMedicineReminderSlots().map((s) => s.slotKey)).toEqual([
      'customFlow:vitamins:morning',
      'customFlow:vitamins:lunch',
    ]);
  });

  it('uses overlay notify so a just-toggled slot is scheduled before storage persist', async () => {
    mockLoadGoalDetailCategoryConfig.mockReturnValue({
      ...intakeConfig,
      medicine: { ...intakeConfig.medicine, morningNotify: false, lunchNotify: false },
    });
    const { collectMedicineReminderSlots, syncMedicineReminderNotifications } = loadModule();
    const overlay = {
      categoryKey: 'healthIntake',
      raw: {
        ...intakeConfig,
        medicine: { ...intakeConfig.medicine, morningNotify: true, lunchNotify: false },
      },
    };
    expect(collectMedicineReminderSlots(overlay).map((s) => s.slotKey)).toEqual([
      'healthIntake:morning',
    ]);

    await syncMedicineReminderNotifications(overlay);
    expect(mockEnsurePermission).toHaveBeenCalled();
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(1);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'pokit:medicine-reminder:healthIntake:morning',
        hour: 8,
        minute: 30,
      }),
    );
  });

  it('requests permission and skips schedule when denied', async () => {
    mockEnsurePermission.mockImplementation(async () => {
      mockPermission = 'denied';
      return false;
    });
    const { syncMedicineReminderNotifications } = loadModule();
    const ok = await syncMedicineReminderNotifications();
    expect(ok).toBe(false);
    expect(mockScheduleDailyLocalNotification).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledWith('medicineDoseReminder');
    expect(mockSaveMedicineReminderScheduled).toHaveBeenCalledWith([]);
  });

  it('동일 입력 동시 호출을 1회 예약으로 합친다', async () => {
    const { syncMedicineReminderNotifications } = loadModule();

    await Promise.all([syncMedicineReminderNotifications(), syncMedicineReminderNotifications()]);

    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(2);
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledTimes(1);
  });

  it('같은 스펙 재호출 시 재예약을 건너뛴다', async () => {
    const { syncMedicineReminderNotifications } = loadModule();

    await syncMedicineReminderNotifications();
    await syncMedicineReminderNotifications();

    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(2);
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledTimes(1);
  });

  it('지정 시각이 바뀌면 옛 예약을 정리하고 새 시각으로 다시 예약한다', async () => {
    const { syncMedicineReminderNotifications } = loadModule();

    await syncMedicineReminderNotifications();
    mockLoadGoalDetailCategoryConfig.mockReturnValue({
      ...intakeConfig,
      medicine: { ...intakeConfig.medicine, morningTime: '10:17' },
    });
    await syncMedicineReminderNotifications();

    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledTimes(2);
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenLastCalledWith(
      'medicineDoseReminder',
    );
    expect(mockScheduleDailyLocalNotification).toHaveBeenLastCalledWith(
      expect.objectContaining({
        identifier: 'pokit:medicine-reminder:healthIntake:lunch',
        hour: 12,
        minute: 30,
      }),
    );
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'pokit:medicine-reminder:healthIntake:morning',
        hour: 10,
        minute: 17,
      }),
    );
  });
});
