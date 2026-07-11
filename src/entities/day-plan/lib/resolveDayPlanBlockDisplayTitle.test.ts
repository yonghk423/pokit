import { looksLikeRawCategoryKeyTitle, resolveDayPlanBlockDisplayTitle } from './resolveDayPlanBlockDisplayTitle';

describe('looksLikeRawCategoryKeyTitle', () => {
  it('detects english catalog keys and customFlow ids', () => {
    expect(looksLikeRawCategoryKeyTitle('reading', 'reading')).toBe(true);
    expect(looksLikeRawCategoryKeyTitle('customFlow:preset_daily_recycle')).toBe(true);
    expect(looksLikeRawCategoryKeyTitle('독서', 'reading')).toBe(false);
  });
});

describe('resolveDayPlanBlockDisplayTitle', () => {
  it('falls back to korean catalog labels for raw titles', () => {
    expect(
      resolveDayPlanBlockDisplayTitle({ title: 'reading', categoryKey: 'reading' }),
    ).toBe('독서');
    expect(
      resolveDayPlanBlockDisplayTitle({
        title: 'customFlow:preset_daily_recycle',
        categoryKey: 'customFlow:preset_daily_recycle',
      }),
    ).toBe('분리수거');
  });

  it('keeps user-edited titles', () => {
    expect(
      resolveDayPlanBlockDisplayTitle({ title: '주말 독서', categoryKey: 'reading' }),
    ).toBe('주말 독서');
  });
});
