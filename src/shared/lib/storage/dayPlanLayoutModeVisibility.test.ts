import {
  coerceDayPlanLayoutMode,
  DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY,
  listVisibleDayPlanLayoutModes,
  normalizeDayPlanLayoutModeVisibility,
} from './dayPlanLayoutModeVisibility';

describe('dayPlanLayoutModeVisibility', () => {
  it('defaults all modes to visible', () => {
    expect(normalizeDayPlanLayoutModeVisibility(undefined)).toEqual(
      DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY,
    );
  });

  it('keeps at least one mode enabled', () => {
    expect(
      normalizeDayPlanLayoutModeVisibility({ bag: false, sections: false, spine: false }),
    ).toEqual(DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY);
  });

  it('lists only enabled modes in order', () => {
    expect(
      listVisibleDayPlanLayoutModes({ bag: false, sections: true, spine: true }),
    ).toEqual(['sections', 'spine']);
  });

  it('coerces hidden mode to first visible mode', () => {
    const visibility = { bag: false, sections: false, spine: true };
    expect(coerceDayPlanLayoutMode('bag', visibility)).toBe('spine');
    expect(coerceDayPlanLayoutMode('sections', visibility)).toBe('spine');
    expect(coerceDayPlanLayoutMode('spine', visibility)).toBe('spine');
  });
});
