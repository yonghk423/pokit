const mockFilterDayPlanFlowBlocks = jest.fn();
const mockLoadGoalDetailBlockConfig = jest.fn();
const mockLoadGoalDetailCategoryConfig = jest.fn();
const mockLoadMedicineReminderScheduled = jest.fn();
const mockSaveMedicineReminderScheduled = jest.fn();
const mockCancelLocalNotificationsById = jest.fn();
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
  scheduleDailyLocalNotification: (...args: unknown[]) => mockScheduleDailyLocalNotification(...args),
}));

jest.mock('@shared/lib/i18n', () => ({
  t: (key: string, vars?: Record<string, string>) =>
    vars ? `${key}:${JSON.stringify(vars)}` : key,
}));

import { useDayPlanDraftStore } from '@entities/day-plan/model/dayPlanDraftStore';
import { useDayPlanStore } from '@entities/day-plan/model/dayPlanStore';
import { useFixedFlowSetsStore } from '@entities/day-plan/model/fixedFlowSetsStore';

type MedicineSyncModule = typeof import('./syncMedicineReminderNotifications');

function loadModule(): MedicineSyncModule {
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
    jest.clearAllMocks();
    mockPermission = 'granted';
    mockRefreshPermission.mockResolvedValue(undefined);
    mockEnsurePermission.mockImplementation(async () => {
      mockPermission = 'granted';
      return true;
    });
    mockLoadMedicineReminderScheduled.mockReturnValue([]);
    mockCancelLocalNotificationsById.mockResolvedValue(undefined);
    mockScheduleDailyLocalNotification.mockResolvedValue('med-1');
    mockFilterDayPlanFlowBlocks.mockReturnValue([]);
    useDayPlanStore.setState({ ...useDayPlanStore.getState(), blocks: [] });
    useFixedFlowSetsStore.setState({
      ...useFixedFlowSetsStore.getState(),
      todayAppliedCategoryKeys: [],
    });
    useDayPlanDraftStore.setState({
      ...useDayPlanDraftStore.getState(),
      priorityCategoryOrder: ['healthIntake'],
      prioritySectionsCategoryOrder: [],
    });
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
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledTimes(2);
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({ hour: 8, minute: 30 }),
    );
    expect(mockScheduleDailyLocalNotification).toHaveBeenCalledWith(
      expect.objectContaining({ hour: 12, minute: 30 }),
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

  it('includes custom health-intake routines on today', () => {
    useDayPlanDraftStore.setState({
      ...useDayPlanDraftStore.getState(),
      priorityCategoryOrder: ['customFlow:vitamins'],
      prioritySectionsCategoryOrder: [],
    });
    mockLoadGoalDetailCategoryConfig.mockImplementation((key: string) =>
      key === 'customFlow:vitamins' ? intakeConfig : null,
    );
    const { collectMedicineReminderSlots } = loadModule();
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
      expect.objectContaining({ hour: 8, minute: 30 }),
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
    expect(mockSaveMedicineReminderScheduled).toHaveBeenCalledWith([]);
  });
});
