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

  it('defaults all modes to visible', () => {
    expect(normalizeDayPlanLayoutModeVisibility(undefined)).toEqual({
      bag: true,
      sections: true,
      spine: true,
    });
    expect(DEFAULT_DAY_PLAN_LAYOUT_MODE_VISIBILITY).toEqual({
      bag: true,
      sections: true,
      spine: true,
    });
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

  it('upgrades legacy default (sections off) to all-on once', () => {
    localStorageClient.setJson(StorageKeys.settings, {
      dayPlanLayoutModeVisibility: { bag: true, sections: false, spine: true },
    });
    expect(loadDayPlanLayoutModeVisibility()).toEqual({
      bag: true,
      sections: true,
      spine: true,
    });
    expect(loadDayPlanLayoutModeVisibility()).toEqual({
      bag: true,
      sections: true,
      spine: true,
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
      spine: true,
    });
  });
});
