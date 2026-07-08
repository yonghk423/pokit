import {
  getInitialCounterDataConfig,
  getInitialFocusDataConfig,
  getInitialHabitDataConfig,
  getInitialJournalDataConfig,
  getInitialMemoDataConfig,
  getInitialReminderDataConfig,
  normalizeCounterDetailConfig,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeMemoDetailConfig,
  normalizeReminderDetailConfig,
  resolveCustomFlowTemplateKeyFromRaw,
  type CustomFlowTemplateKey,
} from './customFlowTemplateConfigs';
import { addDaysToLocalDateKey, getLocalDateKey } from './localDateKey';
import {
  getInitialMeasurementDataConfig,
  getInitialOtherDataConfig,
  normalizeMeasurementDetailConfig,
  normalizeOtherDetailConfig,
  type MeasurementDetailDataConfig,
  type OtherDetailDataConfig,
} from './goalCategorySessionConfig';
import { pickCounterSettingsForCreate } from './counterPresetSamples';
import { pickMeasurementSettingsForCreate } from './measurementPresetSamples';
import { pickReminderSettingsForCreate } from './reminderPresetSamples';

export {
  CUSTOM_FLOW_TEMPLATE_KEYS,
  CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS,
  getInitialCounterDataConfig,
  getInitialFocusDataConfig,
  getInitialHabitDataConfig,
  getInitialJournalDataConfig,
  getInitialMemoDataConfig,
  getInitialReminderDataConfig,
  MAX_CUSTOM_REMINDER_TIMES,
  mergeCustomFlowGoalDetailData,
  normalizeCounterDetailConfig,
  normalizeFocusDetailConfig,
  normalizeHabitDetailConfig,
  normalizeJournalDetailConfig,
  normalizeMemoDetailConfig,
  normalizeReminderDetailConfig,
  resolveCustomFlowTemplateKeyFromRaw,
} from './customFlowTemplateConfigs';
export type { CustomFlowTemplateKey };

export const CUSTOM_FLOW_TEMPLATE_LABELS: Record<CustomFlowTemplateKey, string> = {
  checklist: '할 일 체크',
  abstain: '금지 지키기',
  measurement: '값 기록',
  habit: '오늘 했/안 했',
  counter: '횟수 채우기',
  focus: '집중 시간',
  journal: '한 줄 기록',
  memo: '간단한 메모',
  reminder: '시간 알림',
};

export const CUSTOM_FLOW_TEMPLATE_DESCRIPTIONS: Record<CustomFlowTemplateKey, string> = {
  checklist: '할 일을 하나씩 체크해요',
  abstain: '하지 않은 것을 체크해요',
  measurement: '숫자·값을 꾸준히 기록해요',
  habit: '했는지만 간단히 남겨요',
  counter: '목표 횟수를 채워요',
  focus: '정해진 시간 동안 집중해요',
  journal: '짧은 메모를 남겨요',
  memo: '자유롭게 메모를 적어요',
  reminder: '알림 시간에 맞춰 완료해요',
};

/** 템플릿 상세·선택 화면용 한 줄 설명 */
export const CUSTOM_FLOW_TEMPLATE_SUMMARIES: Record<CustomFlowTemplateKey, string> = {
  checklist: '할 일 목록을 만들고, 세션에서 하나씩 체크해요.',
  abstain: '하지 말아야 할 습관을 목록으로 두고, 오늘 지켰는지 체크해요.',
  measurement: '체중·혈압처럼 숫자를 기록하고 추이·목표를 확인해요.',
  habit: '오늘 했는지만 남기고 연속 기록을 쌓아요.',
  counter: '횟수를 세고 하루 목표까지 채워요.',
  focus: '정해 둔 시간 동안 집중 타이머로 진행해요.',
  journal: '질문에 답하고 기분과 함께 짧게 남겨요.',
  memo: '세션에서 짧은 메모를 자유롭게 적고 저장해요.',
  reminder: '정해 둔 시간마다 완료 여부를 체크해요.',
};

export function resolveCustomFlowTemplateKey(raw: unknown): CustomFlowTemplateKey {
  return resolveCustomFlowTemplateKeyFromRaw(raw);
}

export type CustomFlowDetailConfig =
  | OtherDetailDataConfig
  | MeasurementDetailDataConfig
  | ReturnType<typeof normalizeHabitDetailConfig>
  | ReturnType<typeof normalizeCounterDetailConfig>
  | ReturnType<typeof normalizeFocusDetailConfig>
  | ReturnType<typeof normalizeJournalDetailConfig>
  | ReturnType<typeof normalizeMemoDetailConfig>
  | ReturnType<typeof normalizeReminderDetailConfig>;

export function buildInitialCustomFlowDetailConfig(
  templateKey: CustomFlowTemplateKey,
  input: {
    displayName?: string;
    icon?: string;
    accentColor?: string;
    /** 만들기·미리보기에서 고른 템플릿 설정(런타임 기록값 제외) */
    templateSeed?: unknown;
  } = {},
): CustomFlowDetailConfig {
  const { displayName, icon, accentColor } = input;
  const appearance = {
    ...(displayName && displayName.trim().length > 0 ? { displayName: displayName.trim() } : {}),
    ...(icon ? { icon } : {}),
    ...(accentColor ? { accentColor } : {}),
  };

  switch (templateKey) {
    case 'measurement': {
      const measurementSeed = input.templateSeed
        ? pickMeasurementSettingsForCreate(input.templateSeed)
        : null;
      return normalizeMeasurementDetailConfig({
        ...getInitialMeasurementDataConfig(),
        ...appearance,
        ...(measurementSeed ?? {}),
      });
    }
    case 'habit':
      return normalizeHabitDetailConfig({ ...getInitialHabitDataConfig(), ...appearance });
    case 'counter': {
      const counterSeed = input.templateSeed ? pickCounterSettingsForCreate(input.templateSeed) : null;
      return normalizeCounterDetailConfig({
        ...getInitialCounterDataConfig(),
        ...appearance,
        ...(counterSeed ?? {}),
      });
    }
    case 'focus':
      return normalizeFocusDetailConfig({ ...getInitialFocusDataConfig(), ...appearance });
    case 'journal':
      return normalizeJournalDetailConfig({ ...getInitialJournalDataConfig(), ...appearance });
    case 'memo':
      return normalizeMemoDetailConfig({ ...getInitialMemoDataConfig(), ...appearance });
    case 'reminder': {
      const reminderSeed = input.templateSeed ? pickReminderSettingsForCreate(input.templateSeed) : null;
      return normalizeReminderDetailConfig({
        ...getInitialReminderDataConfig(),
        ...appearance,
        ...(reminderSeed ?? {}),
      });
    }
    case 'abstain':
      return normalizeOtherDetailConfig({
        ...getInitialOtherDataConfig(),
        ...appearance,
        templateKey: 'abstain',
      });
    case 'checklist':
    default:
      return normalizeOtherDetailConfig({
        ...getInitialOtherDataConfig(),
        ...appearance,
      });
  }
}

export function normalizeCustomFlowDetailConfig(
  templateKey: CustomFlowTemplateKey,
  raw: unknown,
): CustomFlowDetailConfig {
  switch (templateKey) {
    case 'measurement':
      return normalizeMeasurementDetailConfig(raw);
    case 'habit':
      return normalizeHabitDetailConfig(raw);
    case 'counter':
      return normalizeCounterDetailConfig(raw);
    case 'focus':
      return normalizeFocusDetailConfig(raw);
    case 'journal':
      return normalizeJournalDetailConfig(raw);
    case 'memo':
      return normalizeMemoDetailConfig(raw);
    case 'reminder':
      return normalizeReminderDetailConfig(raw);
    case 'abstain': {
      const base = normalizeOtherDetailConfig(raw);
      return { ...base, templateKey: 'abstain' } as CustomFlowDetailConfig;
    }
    case 'checklist':
    default: {
      const base = normalizeOtherDetailConfig(raw);
      return { ...base, templateKey: 'checklist' } as CustomFlowDetailConfig;
    }
  }
}

/** 템플릿 상세·만들기 시트 체험용 — 샘플 데이터 포함 */
export function buildTemplateDemoConfig(templateKey: CustomFlowTemplateKey): CustomFlowDetailConfig {
  const today = getLocalDateKey();
  const base = buildInitialCustomFlowDetailConfig(templateKey, {
    displayName: '체험',
    icon: 'star.fill',
    accentColor: '#356668',
  });

  switch (templateKey) {
    case 'measurement':
      return normalizeMeasurementDetailConfig({
        ...base,
        metricLabel: '체중',
        unit: 'kg',
        useGoalValue: true,
        goalValue: 65,
        currentValue: 68.5,
        previousValue: 68.9,
        lastRecordedDateKey: today,
        history: [
          { dateKey: addDaysToLocalDateKey(today, -6), value: 69.2 },
          { dateKey: addDaysToLocalDateKey(today, -5), value: 69.0 },
          { dateKey: addDaysToLocalDateKey(today, -4), value: 68.8 },
          { dateKey: addDaysToLocalDateKey(today, -3), value: 69.1 },
          { dateKey: addDaysToLocalDateKey(today, -2), value: 68.7 },
          { dateKey: addDaysToLocalDateKey(today, -1), value: 68.9 },
          { dateKey: today, value: 68.5 },
        ],
      });
    case 'counter':
      return normalizeCounterDetailConfig({
        ...base,
        activityLabel: '',
        unitKey: 'count',
        goalCount: 8,
        currentCount: 0,
        stepSize: 1,
        secondaryStepSize: 2,
        dailyReset: true,
        countDateKey: today,
        history: [],
      });
    case 'habit':
      return normalizeHabitDetailConfig({
        ...base,
        streakDays: 5,
        recentDoneDateKeys: [
          addDaysToLocalDateKey(today, -4),
          addDaysToLocalDateKey(today, -3),
          addDaysToLocalDateKey(today, -2),
          addDaysToLocalDateKey(today, -1),
        ],
      });
    case 'journal':
      return normalizeJournalDetailConfig({
        ...base,
        prompt: '오늘 기분은?',
        recentEntries: [
          { dateKey: addDaysToLocalDateKey(today, -1), text: '어제는 괜찮았어요', mood: '보통' },
          { dateKey: addDaysToLocalDateKey(today, -2), text: '운동하고 기분 좋음', mood: '좋음' },
        ],
      });
    case 'memo':
      return normalizeMemoDetailConfig({
        ...base,
        lastEntry: '오늘 할 일 정리 완료',
        recentEntries: [
          { dateKey: addDaysToLocalDateKey(today, -1), text: '어제 메모 예시' },
        ],
      });
    case 'reminder':
      return normalizeReminderDetailConfig({
        ...base,
        reminderItems: [
          { time: '09:00', label: '아침 영양제' },
          { time: '12:00', label: '물 한 잔' },
          { time: '18:00', label: '저녁 약' },
        ],
        completedTimes: ['09:00'],
      });
    case 'focus':
      return normalizeFocusDetailConfig({
        ...base,
        planMin: 25,
        focusMemo: '방해 금지 모드 켜기',
      });
    case 'abstain':
      return normalizeCustomFlowDetailConfig('abstain', {
        ...base,
        checklist: [
          { id: 'a1', text: '밤늦게 폰 보기', done: true },
          { id: 'a2', text: '과자·야식 먹기', done: false },
          { id: 'a3', text: 'SNS 무한 스크롤', done: false },
        ],
        templateKey: 'abstain',
      });
    case 'checklist':
    default:
      return normalizeCustomFlowDetailConfig('checklist', {
        ...base,
        checklist: [
          { id: 'd1', text: '물 한 잔 마시기', done: true },
          { id: 'd2', text: '5분 스트레칭', done: false },
          { id: 'd3', text: '창문 열고 환기', done: false },
        ],
        templateKey: 'checklist',
      });
  }
}
