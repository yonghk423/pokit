import type { GoalDetailCategoryKey } from '../../model/types';

import { FastingPreview, FastingSettings, getInitialFastingDataConfig } from './fasting';
import { MeditationPreview, MeditationSettings, getInitialMeditationDataConfig } from './meditation';
import { MedicinePreview, MedicineSettings, getInitialMedicineDataConfig } from './medicine';
import { OtherPreview, OtherSettings, getInitialOtherDataConfig } from './other';
import { ReadingPreview, ReadingSettings, getInitialReadingDataConfig } from './reading';
import type { GoalDetailCategoryModule } from './types';
import { WaterPreview, WaterSettings, getInitialWaterDataConfig } from './water';
import { WorkPreview, WorkSettings, getInitialWorkDataConfig } from './work';
import { YogaPreview, YogaSettings, getInitialYogaDataConfig } from './yoga';

const registry: Record<GoalDetailCategoryKey, GoalDetailCategoryModule> = {
  work: {
    key: 'work',
    titleKo: '작업',
    getInitialDataConfig: getInitialWorkDataConfig,
    Preview: WorkPreview,
    Settings: WorkSettings,
  },
  reading: {
    key: 'reading',
    titleKo: '독서',
    getInitialDataConfig: getInitialReadingDataConfig,
    Preview: ReadingPreview,
    Settings: ReadingSettings,
  },
  meditation: {
    key: 'meditation',
    titleKo: '명상',
    getInitialDataConfig: getInitialMeditationDataConfig,
    Preview: MeditationPreview,
    Settings: MeditationSettings,
  },
  yoga: {
    key: 'yoga',
    titleKo: '요가',
    getInitialDataConfig: getInitialYogaDataConfig,
    Preview: YogaPreview,
    Settings: YogaSettings,
  },
  fasting: {
    key: 'fasting',
    titleKo: '단식',
    getInitialDataConfig: getInitialFastingDataConfig,
    Preview: FastingPreview,
    Settings: FastingSettings,
  },
  water: {
    key: 'water',
    titleKo: '수분섭취',
    getInitialDataConfig: getInitialWaterDataConfig,
    Preview: WaterPreview,
    Settings: WaterSettings,
  },
  medicine: {
    key: 'medicine',
    titleKo: '약 복용',
    getInitialDataConfig: getInitialMedicineDataConfig,
    Preview: MedicinePreview,
    Settings: MedicineSettings,
  },
  other: {
    key: 'other',
    titleKo: '사용자',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: OtherSettings,
  },
};

export function getGoalDetailCategoryModule(key: GoalDetailCategoryKey): GoalDetailCategoryModule {
  return registry[key];
}
