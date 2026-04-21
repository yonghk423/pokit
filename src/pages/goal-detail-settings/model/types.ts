import type { GoalDetailChecklistDerivedCategoryKey } from '@entities/day-plan';

export type GoalDetailCategoryKey =
  | 'work'
  | 'reading'
  | 'meditation'
  | 'yoga'
  | 'fasting'
  | 'water'
  | 'medicine'
  | 'other'
  | GoalDetailChecklistDerivedCategoryKey;

