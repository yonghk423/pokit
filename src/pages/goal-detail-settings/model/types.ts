import type { CustomFlowCategoryKey } from '@entities/day-plan';

export type GoalDetailCategoryKey =
  | 'work'
  | 'reading'
  | 'fasting'
  | 'healthIntake'
  | 'water'
  | 'medicine'
  | 'other'
  | CustomFlowCategoryKey;
