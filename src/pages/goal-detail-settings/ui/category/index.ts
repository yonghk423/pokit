import type { GoalDetailChecklistDerivedCategoryKey } from '@entities/day-plan';

import { isCustomFlowCategoryKey } from '@entities/day-plan';

import type { GoalDetailCategoryKey } from '../../model/types';

import {
  NeckPostureSettings,
  StraightenBackSettings,
  StretchingSettings,
} from './body-habit-checklist';
import { FastingSettings, getInitialFastingDataConfig } from './fasting';
import { MeditationSettings, getInitialMeditationDataConfig } from './meditation';
import { MedicineSettings, getInitialMedicineDataConfig } from './medicine';
import { OtherSettings, getInitialOtherDataConfig } from './other';
import { ReadingSettings, getInitialReadingDataConfig } from './reading';
import type { GoalDetailCategoryModule } from './types';
import { WaterSettings, getInitialWaterDataConfig } from './water';
import { WorkSettings, getInitialWorkDataConfig } from './work';
import { YogaSettings, getInitialYogaDataConfig } from './yoga';

/** 체크리스트형 목표 상세 — `other`와 동일 UI·저장 구조, 키만 분리 */
const CHECKLIST_STYLE_CATEGORY_MODULES: Record<
  GoalDetailChecklistDerivedCategoryKey,
  GoalDetailCategoryModule
> = {
  study: {
    key: 'study',
    titleKo: '공부·학습',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: OtherSettings,
  },
  stretching: {
    key: 'stretching',
    titleKo: '스트레칭하기',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: StretchingSettings,
  },
  straightenBack: {
    key: 'straightenBack',
    titleKo: '허리펴기',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: StraightenBackSettings,
  },
  neckPosture: {
    key: 'neckPosture',
    titleKo: '거북목 바르게하기',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: NeckPostureSettings,
  },
  planning: {
    key: 'planning',
    titleKo: '하루·주간 정리',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: OtherSettings,
  },
  writing: {
    key: 'writing',
    titleKo: '글쓰기',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: OtherSettings,
  },
  journal: {
    key: 'journal',
    titleKo: '일기',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: OtherSettings,
  },
  language: {
    key: 'language',
    titleKo: '언어 학습',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: OtherSettings,
  },
  creative: {
    key: 'creative',
    titleKo: '창작·아이디어',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: OtherSettings,
  },
  inbox: {
    key: 'inbox',
    titleKo: '메일·소통 정리',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: OtherSettings,
  },
};

const registry: Record<GoalDetailCategoryKey, GoalDetailCategoryModule> = {
  work: {
    key: 'work',
    titleKo: '작업',
    getInitialDataConfig: getInitialWorkDataConfig,
    Settings: WorkSettings,
  },
  reading: {
    key: 'reading',
    titleKo: '독서',
    getInitialDataConfig: getInitialReadingDataConfig,
    Settings: ReadingSettings,
  },
  meditation: {
    key: 'meditation',
    titleKo: '명상',
    getInitialDataConfig: getInitialMeditationDataConfig,
    Settings: MeditationSettings,
  },
  yoga: {
    key: 'yoga',
    titleKo: '요가',
    getInitialDataConfig: getInitialYogaDataConfig,
    Settings: YogaSettings,
  },
  fasting: {
    key: 'fasting',
    titleKo: '체중관리',
    getInitialDataConfig: getInitialFastingDataConfig,
    Settings: FastingSettings,
  },
  water: {
    key: 'water',
    titleKo: '수분섭취',
    getInitialDataConfig: getInitialWaterDataConfig,
    Settings: WaterSettings,
  },
  medicine: {
    key: 'medicine',
    titleKo: '약 복용',
    getInitialDataConfig: getInitialMedicineDataConfig,
    Settings: MedicineSettings,
  },
  other: {
    key: 'other',
    titleKo: '플로우 직접 설정',
    getInitialDataConfig: getInitialOtherDataConfig,
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
