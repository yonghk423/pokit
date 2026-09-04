import {
  createDefaultFixedFlowSetsState,
  createBuiltinExampleCustomFlowSets,
  mergeBuiltInExampleCustomSets,
  mergeBuiltInPresetSets,
} from './defaultFixedFlowSets';
import {
  BUILTIN_DAILY_LIFE_FLOW_IDS,
  BUILTIN_FOCUS_FLOW_ID,
} from './defaultPriorityCatalog';

describe('createDefaultFixedFlowSetsState', () => {
  it('creates daily and weekend preset sets only', () => {
    const state = createDefaultFixedFlowSetsState();
    expect(state.sets).toHaveLength(2);
    expect(state.sets.map((s) => s.name)).toEqual(['데일리 루틴', '주말 루틴']);
    expect(state.sets.map((s) => s.applyRule)).toEqual(['daily', 'weekend']);
    const daily = state.sets.find((s) => s.id === 'set_daily');
    expect(daily?.items.map((x) => x.categoryKey)).toEqual([
      'healthIntake',
      'fasting',
      'customFlow:preset_daily_clean',
    ]);
    const weekend = state.sets.find((s) => s.id === 'set_weekend');
    expect(weekend?.items.map((x) => x.categoryKey)).toEqual([
      BUILTIN_DAILY_LIFE_FLOW_IDS[5],
      BUILTIN_DAILY_LIFE_FLOW_IDS[6],
    ]);
    expect(state.activeSetIds).toEqual([]);
  });

  it('merges missing built-in preset sets into stored state', () => {
    const merged = mergeBuiltInPresetSets([
      {
        id: 'set_daily',
        name: '데일리 루틴',
        applyRule: 'daily',
        applyWeekdays: [0, 1, 2, 3, 4, 5, 6],
        items: [{ categoryKey: 'reading', enabled: true }],
      },
    ]);
    expect(merged.map((set) => set.id)).toEqual(['set_daily', 'set_weekend']);
    expect(merged.find((set) => set.id === 'set_weekend')?.items.map((item) => item.categoryKey)).toEqual([
      BUILTIN_DAILY_LIFE_FLOW_IDS[5],
      BUILTIN_DAILY_LIFE_FLOW_IDS[6],
    ]);
  });

  it('refills empty weekend preset with current defaults', () => {
    const merged = mergeBuiltInPresetSets([
      {
        id: 'set_daily',
        name: '데일리 루틴',
        applyRule: 'daily',
        applyWeekdays: [0, 1, 2, 3, 4, 5, 6],
        items: [{ categoryKey: 'healthIntake', enabled: true }],
      },
      {
        id: 'set_weekend',
        name: '주말 루틴',
        applyRule: 'weekend',
        applyWeekdays: [0, 6],
        items: [],
      },
    ]);
    expect(merged.find((set) => set.id === 'set_weekend')?.items.map((item) => item.categoryKey)).toEqual([
      BUILTIN_DAILY_LIFE_FLOW_IDS[5],
      BUILTIN_DAILY_LIFE_FLOW_IDS[6],
    ]);
  });

  it('migrates legacy weekend reading-only default', () => {
    const merged = mergeBuiltInPresetSets([
      {
        id: 'set_weekend',
        name: '주말 루틴',
        applyRule: 'weekend',
        applyWeekdays: [0, 6],
        items: [{ categoryKey: 'reading', enabled: true }],
      },
    ]);
    expect(merged.find((set) => set.id === 'set_weekend')?.items.map((item) => item.categoryKey)).toEqual([
      BUILTIN_DAILY_LIFE_FLOW_IDS[5],
      BUILTIN_DAILY_LIFE_FLOW_IDS[6],
    ]);
  });

  it('migrates legacy daily default items to the new preset', () => {
    const merged = mergeBuiltInPresetSets([
      {
        id: 'set_daily',
        name: '데일리 루틴',
        applyRule: 'daily',
        applyWeekdays: [0, 1, 2, 3, 4, 5, 6],
        items: [
          { categoryKey: 'healthIntake', enabled: true },
          { categoryKey: 'reading', enabled: true },
          { categoryKey: 'work', enabled: true },
        ],
      },
    ]);
    expect(merged.find((set) => set.id === 'set_daily')?.items.map((item) => item.categoryKey)).toEqual([
      'healthIntake',
      'fasting',
      'customFlow:preset_daily_clean',
    ]);
  });

  it('keeps customized daily items when legacy defaults were changed', () => {
    const merged = mergeBuiltInPresetSets([
      {
        id: 'set_daily',
        name: '데일리 루틴',
        applyRule: 'daily',
        applyWeekdays: [0, 1, 2, 3, 4, 5, 6],
        items: [
          { categoryKey: 'healthIntake', enabled: true },
          { categoryKey: 'reading', enabled: true },
        ],
      },
    ]);
    expect(merged.find((set) => set.id === 'set_daily')?.items.map((item) => item.categoryKey)).toEqual([
      'healthIntake',
      'reading',
    ]);
  });

  it('creates two builtin example custom sets', () => {
    const examples = createBuiltinExampleCustomFlowSets();
    expect(examples).toHaveLength(2);
    expect(examples.map((set) => set.name)).toEqual(['건강 루틴 예시', '집중 루틴 예시']);
    expect(examples[1]?.items.map((item) => item.categoryKey)).toEqual([BUILTIN_FOCUS_FLOW_ID]);
  });

  it('merges missing builtin example custom sets into stored state', () => {
    const merged = mergeBuiltInExampleCustomSets([
      {
        id: 'set_daily',
        name: '데일리 루틴',
        applyRule: 'daily',
        applyWeekdays: [0, 1, 2, 3, 4, 5, 6],
        items: [{ categoryKey: 'reading', enabled: true }],
      },
      {
        id: 'set_weekend',
        name: '주말 루틴',
        applyRule: 'weekend',
        applyWeekdays: [0, 6],
        items: [{ categoryKey: 'reading', enabled: true }],
      },
    ]);
    expect(merged.map((set) => set.id)).toEqual([
      'set_daily',
      'set_weekend',
      'set_example_health',
      'set_example_focus',
    ]);
  });

  it('migrates legacy empty or reading/work focus example items', () => {
    const merged = mergeBuiltInExampleCustomSets([
      {
        id: 'set_example_focus',
        name: '집중 루틴 예시',
        applyRule: 'manual',
        applyWeekdays: [],
        items: [
          { categoryKey: 'reading', enabled: true },
          { categoryKey: 'work', enabled: true },
        ],
      },
    ]);
    expect(merged.find((set) => set.id === 'set_example_focus')?.items.map((item) => item.categoryKey)).toEqual([
      BUILTIN_FOCUS_FLOW_ID,
    ]);
  });

  it('skips dismissed builtin example custom sets', () => {
    const merged = mergeBuiltInExampleCustomSets([], { dismissedIds: ['set_example_health'] });
    expect(merged.map((set) => set.id)).toEqual(['set_example_focus']);
  });
});
