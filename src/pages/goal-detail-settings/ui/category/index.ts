import type { GoalDetailChecklistDerivedCategoryKey } from '@entities/day-plan';

import { isCustomFlowCategoryKey } from '@entities/day-plan';

import type { GoalDetailCategoryKey } from '../../model/types';

import {
  NeckPostureSettings,
  StraightenBackSettings,
  StretchingSettings,
} from './body-habit-checklist';
import { FastingPreview, FastingSettings, getInitialFastingDataConfig } from './fasting';
import { MeditationPreview, MeditationSettings, getInitialMeditationDataConfig } from './meditation';
import { MedicinePreview, MedicineSettings, getInitialMedicineDataConfig } from './medicine';
import { OtherPreview, OtherSettings, getInitialOtherDataConfig } from './other';
import { ReadingPreview, ReadingSettings, getInitialReadingDataConfig } from './reading';
import type { GoalDetailCategoryModule } from './types';
import { WaterPreview, WaterSettings, getInitialWaterDataConfig } from './water';
import { WorkPreview, WorkSettings, getInitialWorkDataConfig } from './work';
import { YogaPreview, YogaSettings, getInitialYogaDataConfig } from './yoga';

/** 체크리스트형 목표 상세 — `other`와 동일 UI·저장 구조, 키만 분리 */
const CHECKLIST_STYLE_CATEGORY_MODULES: Record<
  GoalDetailChecklistDerivedCategoryKey,
  GoalDetailCategoryModule
> = {
  study: {
    key: 'study',
    titleKo: '공부·학습',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: OtherSettings,
  },
  stretching: {
    key: 'stretching',
    titleKo: '스트레칭하기',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: StretchingSettings,
  },
  straightenBack: {
    key: 'straightenBack',
    titleKo: '허리펴기',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: StraightenBackSettings,
  },
  neckPosture: {
    key: 'neckPosture',
    titleKo: '거북목 바르게하기',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: NeckPostureSettings,
  },
  planning: {
    key: 'planning',
    titleKo: '하루·주간 정리',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: OtherSettings,
  },
  writing: {
    key: 'writing',
    titleKo: '글쓰기',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: OtherSettings,
  },
  journal: {
    key: 'journal',
    titleKo: '일기',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: OtherSettings,
  },
  language: {
    key: 'language',
    titleKo: '언어 학습',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: OtherSettings,
  },
  creative: {
    key: 'creative',
    titleKo: '창작·아이디어',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: OtherSettings,
  },
  inbox: {
    key: 'inbox',
    titleKo: '메일·소통 정리',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: OtherSettings,
  },
};

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
    titleKo: '체중관리',
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
    titleKo: '플로우 직접 설정',
    getInitialDataConfig: getInitialOtherDataConfig,
    Preview: OtherPreview,
    Settings: OtherSettings,
  },
  ...CHECKLIST_STYLE_CATEGORY_MODULES,
};

export function getGoalDetailCategoryModule(key: GoalDetailCategoryKey): GoalDetailCategoryModule {
  if (isCustomFlowCategoryKey(key)) {
    const base = registry.other;
    return { ...base, key };
  }
  return registry[key as keyof typeof registry];
}
