import {
  emptyCategorySessionConfigs,
  getInitialMedicineDataConfig,
  getInitialOtherDataConfig,
  getInitialWaterDataConfig,
  getInitialWorkDataConfig,
  getInitialYogaDataConfig,
  getOtherCategoryResolvedDisplayLabel,
  normalizeFastingDetailConfig,
  normalizeMedicineDetailConfig,
  normalizeMeditationDetailConfig,
  normalizeOtherDetailConfig,
  normalizeWaterDetailConfig,
  normalizeWorkDetailConfig,
  normalizeYogaDetailConfig,
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
    expect(cfg.tasks).toHaveLength(1);
    expect(cfg.tasks[0]!.text).toBe('할 일');
  });
});

describe('normalizeMeditationDetailConfig', () => {
  it('clamps session and elapsed', () => {
    const cfg = normalizeMeditationDetailConfig({ sessionMin: 999, elapsedMin: 50 });
    expect(cfg.sessionMin).toBe(180);
    expect(cfg.elapsedMin).toBe(50);
  });
});

describe('normalizeFastingDetailConfig', () => {
  it('applies defaults for weight fields', () => {
    const cfg = normalizeFastingDetailConfig({});
    expect(cfg.fastingMin).toBe(16 * 60);
    expect(cfg.currentWeightKg).toBe(70);
    expect(cfg.fastingEnabled).toBe(true);
  });
});

describe('normalizeWaterDetailConfig', () => {
  it('clamps drank below goal', () => {
    const cfg = normalizeWaterDetailConfig({ goalMl: 2000, drankMl: 5000 });
    expect(cfg.drankMl).toBe(2000);
    expect(getInitialWaterDataConfig().reminderPreset).toBe('60');
  });
});

describe('normalizeYogaDetailConfig', () => {
  it('defaults flow label', () => {
    expect(normalizeYogaDetailConfig({}).flowLabel).toBe('플로우');
    expect(getInitialYogaDataConfig().sessionMin).toBe(40);
  });
});

describe('normalizeMedicineDetailConfig', () => {
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
