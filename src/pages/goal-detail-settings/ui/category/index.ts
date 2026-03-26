import type { GoalDetailCategoryModule } from './types';
import type { GoalDetailCategoryKey } from '../../model/types';

import { StudyPreview, StudySettings, getInitialStudyDataConfig } from './study';

const FALLBACK: GoalDetailCategoryModule = {
  key: 'other',
  titleKo: '기타',
  getInitialDataConfig: getInitialStudyDataConfig,
  Preview: StudyPreview,
  Settings: StudySettings,
};

const registry: Partial<Record<GoalDetailCategoryKey, GoalDetailCategoryModule>> = {
  reading: {
    key: 'reading',
    titleKo: '독서',
    getInitialDataConfig: getInitialStudyDataConfig,
    Preview: StudyPreview,
    Settings: StudySettings,
  },
  study: {
    key: 'study',
    titleKo: '공부',
    getInitialDataConfig: getInitialStudyDataConfig,
    Preview: StudyPreview,
    Settings: StudySettings,
  },
};

export function getGoalDetailCategoryModule(
  key: GoalDetailCategoryKey,
): GoalDetailCategoryModule {
  return registry[key] ?? FALLBACK;
}

