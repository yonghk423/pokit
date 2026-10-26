const mockFilterDayPlanFlowBlocks = jest.fn();
const mockLoadGoalDetailBlockConfig = jest.fn();
const mockLoadGoalDetailCategoryConfig = jest.fn();
const mockLoadMedicineReminderScheduled = jest.fn();
const mockSaveMedicineReminderScheduled = jest.fn();
const mockCancelLocalNotificationsById = jest.fn();
const mockCancelScheduledNotificationsByEventType = jest.fn();
const mockScheduleDailyLocalNotification = jest.fn();

jest.mock('@entities/day-plan', () => {
  const actual = jest.requireActual('@entities/day-plan') as Record<string, unknown>;
  return {
    ...actual,
    filterDayPlanFlowBlocks: (...args: unknown[]) => mockFilterDayPlanFlowBlocks(...args),
  };
});

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
    mockLoadMedicineReminderScheduled.mockReturnValue([{ slotKey: 'old', notificationId: 'nid-1' }]);
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
    mockCancelScheduledNotificationsByEventType.mockResolvedValue(undefined);
    mockScheduleDailyLocalNotification.mockResolvedValue('med-1');
    mockFilterDayPlanFlowBlocks.mockReturnValue([]);
    mockLoadGoalDetailBlockConfig.mockReturnValue(null);
    mockLoadGoalDetailCategoryConfig.mockImplementation((key: string) =>
      key === 'healthIntake' ? intakeConfig : null,
    );
  });

  it('collects bag health-intake slots without scheduling (notify feature off)', async () => {
    const { collectMedicineReminderSlots, syncMedicineReminderNotifications } = loadModule();
    const slots = collectMedicineReminderSlots();
    expect(slots.map((s) => s.slotKey)).toEqual(['healthIntake:morning', 'healthIntake:lunch']);
    expect(slots[0]).toMatchObject({ hour: 8, minute: 30 });

    await syncMedicineReminderNotifications();
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledWith('medicineDoseReminder');
    expect(mockCancelLocalNotificationsById).toHaveBeenCalledWith(['nid-1']);
    expect(mockSaveMedicineReminderScheduled).toHaveBeenCalledWith([]);
    expect(mockScheduleDailyLocalNotification).not.toHaveBeenCalled();
  });

  it('skips slots when notify is off', () => {
    mockLoadGoalDetailCategoryConfig.mockReturnValue({
      ...intakeConfig,
      medicine: { ...intakeConfig.medicine, morningNotify: false },
    });
    const { collectMedicineReminderSlots } = loadModule();
    expect(collectMedicineReminderSlots().map((s) => s.slotKey)).toEqual(['healthIntake:lunch']);
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

  it('cancels existing reminders even when overlay would have scheduled', async () => {
    const { syncMedicineReminderNotifications } = loadModule();
    const overlay = {
      categoryKey: 'healthIntake',
      raw: {
        ...intakeConfig,
        medicine: { ...intakeConfig.medicine, morningNotify: true },
      },
    };
    await syncMedicineReminderNotifications(overlay);
    expect(mockScheduleDailyLocalNotification).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledWith('medicineDoseReminder');
  });

  it('동일 입력 동시 호출을 1회 정리로 합친다', async () => {
    const { syncMedicineReminderNotifications } = loadModule();

    await Promise.all([syncMedicineReminderNotifications(), syncMedicineReminderNotifications()]);

    expect(mockScheduleDailyLocalNotification).not.toHaveBeenCalled();
    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledTimes(1);
  });

  it('같은 스펙 재호출 시 취소를 건너뛴다', async () => {
    const { syncMedicineReminderNotifications } = loadModule();

    await syncMedicineReminderNotifications();
    await syncMedicineReminderNotifications();

    expect(mockCancelScheduledNotificationsByEventType).toHaveBeenCalledTimes(1);
  });
});
