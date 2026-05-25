import {
  GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS,
  isGoalDetailChecklistDerivedCategoryKey,
  isGoalDetailChecklistStyleCategoryKey,
} from './goalDetailChecklistCategoryKeys';

describe('goalDetailChecklistCategoryKeys', () => {
  it('identifies derived keys', () => {
    expect(isGoalDetailChecklistDerivedCategoryKey('study')).toBe(true);
    expect(isGoalDetailChecklistDerivedCategoryKey('reading')).toBe(false);
    expect(GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS).toContain('inbox');
  });

  it('treats other and derived as checklist style', () => {
    expect(isGoalDetailChecklistStyleCategoryKey('other')).toBe(true);
    expect(isGoalDetailChecklistStyleCategoryKey('journal')).toBe(true);
    expect(isGoalDetailChecklistStyleCategoryKey('water')).toBe(false);
  });
});
