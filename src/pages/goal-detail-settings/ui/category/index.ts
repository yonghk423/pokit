import {
  isCustomFlowCategoryKey,
  resolveCustomFlowTemplateKey,
  type CustomFlowCategoryKey,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import type { GoalDetailCategoryKey } from '../../model/types';

import {
  CounterSettings,
  FocusSettings,
  HabitSettings,
  JournalSettings,
  ReminderSettings,
  getInitialCounterDataConfig,
  getInitialFocusDataConfig,
  getInitialHabitDataConfig,
  getInitialJournalDataConfig,
  getInitialReminderDataConfig,
} from './custom-templates';
import { MeasurementSettings, getInitialMeasurementDataConfig } from './measurement';
import { OtherSettings, getInitialOtherDataConfig } from './other';
import type { GoalDetailCategoryModule } from './types';
import { FastingSettings, getInitialFastingDataConfig } from './fasting';
import { HealthIntakeSettings, getInitialHealthIntakeDataConfig } from './health-intake';
import { ReadingSettings, getInitialReadingDataConfig } from './reading';
import { WorkSettings, getInitialWorkDataConfig } from './work';

const registry: Record<Exclude<GoalDetailCategoryKey, CustomFlowCategoryKey>, GoalDetailCategoryModule> = {
  work: {
    key: 'work',
    titleKo: '스터디',
    getInitialDataConfig: getInitialWorkDataConfig,
    Settings: WorkSettings,
  },
  reading: {
    key: 'reading',
    titleKo: '독서',
    getInitialDataConfig: getInitialReadingDataConfig,
    Settings: ReadingSettings,
  },
  fasting: {
    key: 'fasting',
    titleKo: '체중관리',
    getInitialDataConfig: getInitialFastingDataConfig,
    Settings: FastingSettings,
  },
  healthIntake: {
    key: 'healthIntake',
    titleKo: '건강을 위한 섭취',
    getInitialDataConfig: getInitialHealthIntakeDataConfig,
    Settings: HealthIntakeSettings,
  },
  other: {
    key: 'other',
    titleKo: '루틴 직접 설정',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: OtherSettings,
  },
};

const customFlowTemplateModules: Record<
  Exclude<CustomFlowTemplateKey, 'checklist'>,
  Omit<GoalDetailCategoryModule, 'key'>
> = {
  measurement: {
    titleKo: '값 기록',
    getInitialDataConfig: getInitialMeasurementDataConfig,
    Settings: MeasurementSettings,
  },
  habit: {
    titleKo: '오늘 했/안 했',
    getInitialDataConfig: getInitialHabitDataConfig,
    Settings: HabitSettings,
  },
  counter: {
    titleKo: '횟수 채우기',
    getInitialDataConfig: getInitialCounterDataConfig,
    Settings: CounterSettings,
  },
  focus: {
    titleKo: '집중 시간',
    getInitialDataConfig: getInitialFocusDataConfig,
    Settings: FocusSettings,
  },
  journal: {
    titleKo: '한 줄 기록',
    getInitialDataConfig: getInitialJournalDataConfig,
    Settings: JournalSettings,
  },
  reminder: {
    titleKo: '시간 알림',
    getInitialDataConfig: getInitialReminderDataConfig,
    Settings: ReminderSettings,
  },
};

export function getGoalDetailCategoryModule(key: GoalDetailCategoryKey): GoalDetailCategoryModule {
  if (isCustomFlowCategoryKey(key)) {
    return resolveCustomFlowGoalDetailModule(key);
  }
  return registry[key];
}

export function resolveCustomFlowGoalDetailModule(
  key: CustomFlowCategoryKey,
  rawConfig?: unknown,
): GoalDetailCategoryModule {
  const raw = rawConfig ?? loadGoalDetailCategoryConfig(key);
  const templateKey = resolveCustomFlowTemplateKey(raw);
  if (templateKey === 'checklist') {
    return { ...registry.other, key };
  }
  const mod = customFlowTemplateModules[templateKey];
  return { ...mod, key };
}

export function resolveGoalDetailModuleForTarget(
  categoryKey: GoalDetailCategoryKey,
  dataConfig?: unknown,
): GoalDetailCategoryModule {
  if (isCustomFlowCategoryKey(categoryKey)) {
    return resolveCustomFlowGoalDetailModule(categoryKey, dataConfig);
  }
  return getGoalDetailCategoryModule(categoryKey);
}
