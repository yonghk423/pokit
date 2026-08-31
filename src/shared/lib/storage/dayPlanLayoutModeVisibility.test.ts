import { localStorageClient } from './localStorageClient';
import {
  coerceDayPlanLayoutMode,
  DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY,
  listVisibleDayPlanLayoutModes,
  loadDayPlanLayoutModeVisibility,
  normalizeDayPlanLayoutModeVisibility,
} from './dayPlanLayoutModeVisibility';
import { StorageKeys } from './storageKeys';

describe('dayPlanLayoutModeVisibility', () => {
  beforeEach(() => {
    localStorageClient.removeItem(StorageKeys.settings);
  });

  it('defaults to bag/sections and keeps spine hidden', () => {
    expect(normalizeDayPlanLayoutModeVisibility(undefined)).toEqual({
      bag: true,
      sections: true,
      spine: false,
    });
    expect(DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY).toEqual({
      bag: true,
      sections: true,
      spine: false,
    });
  });

  it('keeps at least one mode enabled', () => {
    expect(
      normalizeDayPlanLayoutModeVisibility({ bag: false, sections: false, spine: false }),
    ).toEqual(DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY);
  });

  it('lists only enabled modes in order', () => {
    const visibility = normalizeDayPlanLayoutModeVisibility({
      bag: false,
      sections: true,
      spine: true,
    });
    expect(
      listVisibleDayPlanLayoutModes(visibility),
    ).toEqual(['sections']);
  });

  it('coerces hidden mode to first visible mode', () => {
    const visibility = normalizeDayPlanLayoutModeVisibility({
      bag: false,
      sections: false,
      spine: true,
    });
    expect(coerceDayPlanLayoutMode('bag', visibility)).toBe('bag');
    expect(coerceDayPlanLayoutMode('sections', visibility)).toBe('sections');
    expect(coerceDayPlanLayoutMode('spine', visibility)).toBe('bag');
  });

  it('loads legacy visibility but keeps spine hidden', () => {
    localStorageClient.setJson(StorageKeys.settings, {
      dayPlanLayoutModeVisibility: { bag: true, sections: false, spine: true },
    });
    expect(loadDayPlanLayoutModeVisibility()).toEqual({
      bag: true,
      sections: true,
      spine: false,
    });
    expect(loadDayPlanLayoutModeVisibility()).toEqual({
      bag: true,
      sections: true,
      spine: false,
    });
  });

  it('does not re-enable sections after user turns it off post-migration', () => {
    localStorageClient.setJson(StorageKeys.settings, {
      dayPlanLayoutModeVisibility: { bag: true, sections: false, spine: true },
      dayPlanLayoutModeVisibilityAllOnMigrated: true,
    });
    expect(loadDayPlanLayoutModeVisibility()).toEqual({
      bag: true,
      sections: false,
      spine: false,
    });
  });
});
