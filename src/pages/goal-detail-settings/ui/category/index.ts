import {
  isCustomFlowCategoryKey,
  resolveCustomFlowTemplateKey,
  type CustomFlowCategoryKey,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';
import { DEFAULT_BUILTIN_CUSTOM_FLOWS } from '@shared/lib/storage/defaultPriorityCatalog';

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
import { MedicineSettings, getInitialMedicineDataConfig } from './medicine';
import { OtherSettings, getInitialOtherDataConfig } from './other';
import type { GoalDetailCategoryModule } from './types';
import { FastingSettings, getInitialFastingDataConfig } from './fasting';
import { HealthIntakeSettings, getInitialHealthIntakeDataConfig } from './health-intake';
import { ReadingSettings, getInitialReadingDataConfig } from './reading';
import { WaterSettings, getInitialWaterDataConfig } from './water';
import { WorkSettings, getInitialWorkDataConfig } from './work';

const registry: Record<Exclude<GoalDetailCategoryKey, CustomFlowCategoryKey>, GoalDetailCategoryModule> = {
  work: {
    key: 'work',
    titleKo: '노트',
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
    titleKo: '체중조절',
    getInitialDataConfig: getInitialFastingDataConfig,
    Settings: FastingSettings,
  },
  healthIntake: {
    key: 'healthIntake',
    titleKo: '건강을 위한 섭취',
    getInitialDataConfig: getInitialHealthIntakeDataConfig,
    Settings: HealthIntakeSettings,
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
    titleKo: '루틴 직접 설정',
    getInitialDataConfig: getInitialOtherDataConfig,
    Settings: OtherSettings,
  },
};

const customFlowTemplateModules: Record<
  Exclude<CustomFlowTemplateKey, 'checklist' | 'abstain'>,
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
  return registry[key] ?? registry.other;
}

function resolveBuiltinCustomFlowTemplateKey(
  key: CustomFlowCategoryKey,
  raw: unknown,
): CustomFlowTemplateKey | null {
  if (raw && typeof raw === 'object' && 'templateKey' in (raw as object)) {
    return null;
  }
  const builtin = DEFAULT_BUILTIN_CUSTOM_FLOWS.find((flow) => flow.id === key);
  if (!builtin?.templateKey) return null;
  return builtin.templateKey;
}

export function resolveCustomFlowGoalDetailModule(
  key: CustomFlowCategoryKey,
  rawConfig?: unknown,
): GoalDetailCategoryModule {
  const raw = rawConfig ?? loadGoalDetailCategoryConfig(key);
  let templateKey = resolveCustomFlowTemplateKey(raw);
  const builtinTemplateKey = resolveBuiltinCustomFlowTemplateKey(key, raw);
  if (builtinTemplateKey && templateKey === 'checklist') {
    templateKey = builtinTemplateKey;
  }
  if (templateKey === 'checklist' || templateKey === 'abstain') {
    return { ...registry.other, key };
  }
  const mod = customFlowTemplateModules[templateKey];
  if (!mod) {
    return { ...registry.other, key };
  }
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
