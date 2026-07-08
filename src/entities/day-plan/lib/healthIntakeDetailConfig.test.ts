import {
  HEALTH_INTAKE_CATEGORY_KEY,
  normalizeCatalogKeysAfterHealthIntakeMerge,
} from './healthIntakeDetailConfig';

describe('normalizeCatalogKeysAfterHealthIntakeMerge', () => {
  it('merges legacy water and medicine into healthIntake once', () => {
    expect(
      normalizeCatalogKeysAfterHealthIntakeMerge(['water', 'medicine', 'reading', 'healthIntake']),
    ).toEqual([HEALTH_INTAKE_CATEGORY_KEY, 'reading']);
  });

  it('drops duplicate legacy keys after merge', () => {
    expect(normalizeCatalogKeysAfterHealthIntakeMerge(['water', 'work', 'water'])).toEqual([
      HEALTH_INTAKE_CATEGORY_KEY,
      'work',
    ]);
  });
});
