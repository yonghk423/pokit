import { resolveFixedRoutineItemIconColor } from './fixedRoutineItemAppearance';

describe('resolveFixedRoutineItemIconColor', () => {
  it('keeps the category accent color before and after applying today', () => {
    const categoryAccentColor = '#356668';

    expect(
      resolveFixedRoutineItemIconColor({ categoryAccentColor, isInTodayPlan: false }),
    ).toBe(categoryAccentColor);
    expect(
      resolveFixedRoutineItemIconColor({ categoryAccentColor, isInTodayPlan: true }),
    ).toBe(categoryAccentColor);
  });
});
