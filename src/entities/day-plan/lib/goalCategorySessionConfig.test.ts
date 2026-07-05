import {
  emptyCategorySessionConfigs,
  getInitialFastingDataConfig,
  getInitialMedicineDataConfig,
  getInitialOtherDataConfig,
  getInitialWaterDataConfig,
  getInitialWorkDataConfig,
  getOtherCategoryResolvedDisplayLabel,
  normalizeFastingDetailConfig,
  normalizeMedicineDetailConfig,
  normalizeOtherDetailConfig,
  normalizeWaterDetailConfig,
  normalizeWorkDetailConfig,
  OTHER_CATEGORY_PICKER_FALLBACK_KO,
  readTrimmedOtherCustomDisplayNameFromRaw,
} from './goalCategorySessionConfig';

describe('normalizeWorkDetailConfig', () => {
  it('clamps plan and done minutes', () => {
    const cfg = normalizeWorkDetailConfig({ planMin: 10, doneMin: 999 });
    expect(cfg.planMin).toBe(15);
    expect(cfg.doneMin).toBe(15);
  });

  it('filters empty tasks', () => {
    const cfg = normalizeWorkDetailConfig({
      tasks: [{ id: '1', text: '  ', done: false }, { id: '2', text: '할 일', done: true }],
    });
    expect(cfg.tasks).toHaveLength(0);
    expect(cfg.focusMemo).toBe('할 일');
  });

  it('normalizes pomodoro break minutes', () => {
    const cfg = normalizeWorkDetailConfig({ studyMode: 'pomodoro', breakMin: 99 });
    expect(cfg.breakMin).toBe(30);
    expect(cfg.studyMode).toBe('pomodoro');
  });

  it('clears break minutes in free mode', () => {
    const cfg = normalizeWorkDetailConfig({ studyMode: 'free', breakMin: 10 });
    expect(cfg.breakMin).toBe(0);
  });
});

describe('normalizeFastingDetailConfig', () => {
  it('applies defaults for weight fields', () => {
    const cfg = normalizeFastingDetailConfig({});
    expect(cfg.fastingMin).toBe(16 * 60);
    expect(cfg.currentWeightKg).toBe(70);
    expect(cfg.fastingEnabled).toBe(true);
    expect(getInitialFastingDataConfig().targetWeightKg).toBe(65);
  });
});

describe('normalizeWaterDetailConfig', () => {
  it('clamps drank below goal', () => {
    const cfg = normalizeWaterDetailConfig({ goalMl: 2000, drankMl: 5000 });
    expect(cfg.drankMl).toBe(2000);
    expect(getInitialWaterDataConfig().reminderPreset).toBe('60');
  });

  it('does not default smart notification or reminder times', () => {
    const cfg = normalizeWaterDetailConfig({});
    expect(cfg.smartNotification).toBe(false);
    expect(cfg.reminderTimes).toEqual([]);
    expect(getInitialWaterDataConfig().reminderTimes).toEqual([]);
  });
});

describe('normalizeMedicineDetailConfig', () => {
  it('uses per-slot notify flags when provided', () => {
    const cfg = normalizeMedicineDetailConfig({
      morningOn: true,
      morningNotify: false,
      lunchOn: true,
      lunchNotify: true,
      dinnerOn: false,
      medicationNotify: false,
    });
    expect(cfg.morningNotify).toBe(false);
    expect(cfg.lunchNotify).toBe(true);
    expect(cfg.dinnerNotify).toBe(false);
  });

  it('defaults empty slots without legacy dose fields', () => {
    const cfg = normalizeMedicineDetailConfig({});
    expect(cfg.morningOn).toBe(false);
    expect(cfg.dosesPerDay).toBe(0);
    expect(cfg.morningNotify).toBe(true);
  });

  it('maps legacy dosesPerDay to slots', () => {
    const cfg = normalizeMedicineDetailConfig({ dosesPerDay: 2, takenCount: 1 });
    expect(cfg.morningOn).toBe(true);
    expect(cfg.lunchOn).toBe(true);
    expect(cfg.dinnerOn).toBe(false);
    expect(cfg.dosesPerDay).toBe(2);
    expect(cfg.takenCount).toBe(1);
  });

  it('uses explicit slot flags', () => {
    const cfg = normalizeMedicineDetailConfig({
      morningOn: true,
      lunchOn: false,
      dinnerOn: true,
    });
    expect(cfg.dosesPerDay).toBe(2);
    expect(getInitialMedicineDataConfig().morningTime).toBe('08:30');
  });
});

describe('normalizeOtherDetailConfig', () => {
  it('normalizes checklist tasks', () => {
    const cfg = normalizeOtherDetailConfig({
      displayName: '나만의',
      summary: '짧은 요약',
      checklist: [{ id: '1', text: '할 일', done: true }, { text: '' }],
    });
    expect(cfg.checklist).toHaveLength(1);
    expect(cfg.checklist[0]?.done).toBe(true);
    expect(cfg.summary).toBe('짧은 요약');
  });

  it('keeps allowed custom flow icon and accent color', () => {
    const cfg = normalizeOtherDetailConfig({
      displayName: '루틴',
      icon: 'heart.fill',
      accentColor: '#22C55E',
    });
    expect(cfg.icon).toBe('heart.fill');
    expect(cfg.accentColor).toBe('#22c55e');
  });

  it('resolves display label fallback', () => {
    expect(getOtherCategoryResolvedDisplayLabel(null)).toBe(OTHER_CATEGORY_PICKER_FALLBACK_KO);
    expect(
      getOtherCategoryResolvedDisplayLabel({ displayName: '나의 플로우' }),
    ).toBe('나의 플로우');
    expect(readTrimmedOtherCustomDisplayNameFromRaw(getInitialOtherDataConfig())).toBeNull();
    expect(emptyCategorySessionConfigs().reading).toBeNull();
    expect(getInitialWorkDataConfig().planMin).toBe(120);
    expect(normalizeOtherDetailConfig({ displayName: 'x'.repeat(100) }).displayName.length).toBe(
      40,
    );
  });
});
