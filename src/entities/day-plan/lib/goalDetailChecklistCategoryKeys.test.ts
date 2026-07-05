import {
  GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS,
  isGoalDetailChecklistDerivedCategoryKey,
  isGoalDetailChecklistStyleCategoryKey,
} from './goalDetailChecklistCategoryKeys';

describe('goalDetailChecklistCategoryKeys', () => {
  it('has no derived keys after standard routine cleanup', () => {
    expect(GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS).toEqual([]);
    expect(isGoalDetailChecklistDerivedCategoryKey('study')).toBe(false);
    expect(isGoalDetailChecklistDerivedCategoryKey('reading')).toBe(false);
  });

  it('treats other and customFlow as checklist style', () => {
    expect(isGoalDetailChecklistStyleCategoryKey('other')).toBe(true);
    expect(isGoalDetailChecklistStyleCategoryKey('customFlow:abc12345')).toBe(false);
    expect(isGoalDetailChecklistStyleCategoryKey('water')).toBe(false);
  });
});
