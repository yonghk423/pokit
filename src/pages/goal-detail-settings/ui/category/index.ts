import type { GoalDetailCategoryKey } from '../../model/types';

import { MeditationPreview, MeditationSettings, getInitialMeditationDataConfig } from './meditation';
import { MedicinePreview, MedicineSettings, getInitialMedicineDataConfig } from './medicine';
import { OtherPreview, OtherSettings, getInitialOtherDataConfig } from './other';
import { ReadingPreview, ReadingSettings, getInitialReadingDataConfig } from './reading';
import { RestPreview, RestSettings, getInitialRestDataConfig } from './rest';
import { RunPreview, RunSettings, getInitialRunDataConfig } from './run';
import { StretchPreview, StretchSettings, getInitialStretchDataConfig } from './stretch';
import type { GoalDetailCategoryModule } from './types';
import { StudyPreview, StudySettings, getInitialStudyDataConfig } from './study';
import { WaterPreview, WaterSettings, getInitialWaterDataConfig } from './water';
import { WorkPreview, WorkSettings, getInitialWorkDataConfig } from './work';
import { YogaPreview, YogaSettings, getInitialYogaDataConfig } from './yoga';

const registry: Record<GoalDetailCategoryKey, GoalDetailCategoryModule> = {
  run: {
    key: 'run',
    titleKo: '러닝',
    getInitialDataConfig: getInitialRunDataConfig,
    Preview: RunPreview,
    Settings: RunSettings,
  },
  work: {
    key: 'work',
    titleKo: '업무',
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
  study: {
    key: 'study',
    titleKo: '공부',
    getInitialDataConfig: getInitialStudyDataConfig,
    Preview: StudyPreview,
    Settings: StudySettings,
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
  rest: {
    key: 'rest',
    titleKo: '휴식',
    getInitialDataConfig: getInitialRestDataConfig,
    Preview: RestPreview,
    Settings: RestSettings,
  },
  water: {
    key: 'water',
    titleKo: '수분',
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
  stretch: {
    key: 'stretch',
    titleKo: '스트레칭',
    getInitialDataConfig: getInitialStretchDataConfig,
    Preview: StretchPreview,
    Settings: StretchSettings,
  },
  other: {
    key: 'other',
    titleKo: '기타',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: OtherSettings,
  },
};

export function getGoalDetailCategoryModule(key: GoalDetailCategoryKey): GoalDetailCategoryModule {
  return registry[key];
}
