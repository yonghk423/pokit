import { t, type I18nKey } from '@shared/lib/i18n';

import { pickCounterSettingsForCreate } from './counterPresetSamples';
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
import {
  getInitialMeasurementDataConfig,
  getInitialOtherDataConfig,
  normalizeMeasurementDetailConfig,
  normalizeOtherDetailConfig,
  type MeasurementDetailDataConfig,
  type OtherDetailDataConfig,
} from './goalCategorySessionConfig';
import { addDaysToLocalDateKey, getLocalDateKey } from './localDateKey';
import { pickMeasurementSettingsForCreate, applyMeasurementMetricPreset } from './measurementPresetSamples';
import { MEASUREMENT_METRIC_PRESETS } from './measurementUnits';
import { pickReminderSettingsForCreate } from './reminderPresetSamples';

export {
  CREATABLE_CUSTOM_FLOW_TEMPLATE_KEYS, CUSTOM_FLOW_TEMPLATE_KEYS, getInitialCounterDataConfig,
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
  resolveCustomFlowTemplateKeyFromRaw
} from './customFlowTemplateConfigs';
export type { CustomFlowTemplateKey };

/** @deprecated 표시용은 `resolveCustomFlowTemplateLabel` 사용 — 한국어 기본값 보관 */
export const CUSTOM_FLOW_TEMPLATE_LABELS: Record<CustomFlowTemplateKey, string> = {
  checklist: '할 일 체크',
  abstain: '금지 체크',
  measurement: '값 기록',
  habit: '오늘 했/안 했',
  counter: '횟수 채우기',
  focus: '집중 시간',
  journal: '한 줄 기록',
  memo: '간단한 메모',
  reminder: '시간 알림',
};

/** @deprecated 표시용은 `resolveCustomFlowTemplateDescription` 사용 */
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

/** @deprecated 표시용은 `resolveCustomFlowTemplateSummary` 사용 */
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

const TEMPLATE_NAME_KEYS: Record<CustomFlowTemplateKey, I18nKey> = {
  checklist: 'customFlowTemplate.name.checklist',
  abstain: 'customFlowTemplate.name.abstain',
  measurement: 'customFlowTemplate.name.measurement',
  habit: 'customFlowTemplate.name.habit',
  counter: 'customFlowTemplate.name.counter',
  focus: 'customFlowTemplate.name.focus',
  journal: 'customFlowTemplate.name.journal',
  memo: 'customFlowTemplate.name.memo',
  reminder: 'customFlowTemplate.name.reminder',
};

const TEMPLATE_DESC_KEYS: Record<CustomFlowTemplateKey, I18nKey> = {
  checklist: 'customFlowTemplate.desc.checklist',
  abstain: 'customFlowTemplate.desc.abstain',
  measurement: 'customFlowTemplate.desc.measurement',
  habit: 'customFlowTemplate.desc.habit',
  counter: 'customFlowTemplate.desc.counter',
  focus: 'customFlowTemplate.desc.focus',
  journal: 'customFlowTemplate.desc.journal',
  memo: 'customFlowTemplate.desc.memo',
  reminder: 'customFlowTemplate.desc.reminder',
};

const TEMPLATE_SUMMARY_KEYS: Record<CustomFlowTemplateKey, I18nKey> = {
  checklist: 'customFlowTemplate.summary.checklist',
  abstain: 'customFlowTemplate.summary.abstain',
  measurement: 'customFlowTemplate.summary.measurement',
  habit: 'customFlowTemplate.summary.habit',
  counter: 'customFlowTemplate.summary.counter',
  focus: 'customFlowTemplate.summary.focus',
  journal: 'customFlowTemplate.summary.journal',
  memo: 'customFlowTemplate.summary.memo',
  reminder: 'customFlowTemplate.summary.reminder',
};

export function resolveCustomFlowTemplateLabel(templateKey: CustomFlowTemplateKey): string {
  return t(TEMPLATE_NAME_KEYS[templateKey]);
}

export function resolveCustomFlowTemplateDescription(templateKey: CustomFlowTemplateKey): string {
  return t(TEMPLATE_DESC_KEYS[templateKey]);
}

export function resolveCustomFlowTemplateSummary(templateKey: CustomFlowTemplateKey): string {
  return t(TEMPLATE_SUMMARY_KEYS[templateKey]);
}

export function resolveCustomFlowTemplateKey(raw: unknown): CustomFlowTemplateKey {
  return resolveCustomFlowTemplateKeyFromRaw(raw);
}

/** 목표 상세 등 — 실제 적용 중인 템플릿 표기 (레거시 abstain → 할 일 체크) */
export function resolveAppliedCustomFlowTemplateLabel(
  templateKey: CustomFlowTemplateKey,
): string {
  if (templateKey === 'abstain') {
    return resolveCustomFlowTemplateLabel('checklist');
  }
  return resolveCustomFlowTemplateLabel(templateKey);
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

/** 만들기 시트 — 할 일 목록(체크리스트) 설정만 추출, 완료 상태는 초기화 */
export function pickChecklistSettingsForCreate(
  raw: unknown,
  templateKey: 'checklist' | 'abstain' = 'checklist',
): Record<string, unknown> | null {
  const cfg = normalizeOtherDetailConfig(raw);
  const checklist = cfg.checklist
    .map((item, index) => {
      const text = typeof item.text === 'string' ? item.text.trim() : '';
      if (!text) return null;
      const id =
        typeof item.id === 'string' && item.id.trim().length > 0
          ? item.id.trim()
          : `task_${index + 1}`;
      return { id, text, done: false as const };
    })
    .filter((item): item is { id: string; text: string; done: false } => item != null);
  if (checklist.length === 0) return null;
  return {
    checklist,
    templateKey,
    ...(cfg.summary.trim() ? { summary: cfg.summary.trim() } : {}),
  };
}

/** 만들기 시트 — 메모 템플릿은 요약만 반영(세션 기록은 제외) */
export function pickMemoSettingsForCreate(raw: unknown): Record<string, unknown> | null {
  const cfg = normalizeMemoDetailConfig(raw);
  if (!cfg.summary.trim()) return null;
  return { summary: cfg.summary.trim() };
}

/**
 * 만들기 시트용 설정 시드 — 바로 편집 가능한 기본값.
 * 체험용 진행도(완료 체크·히스토리 샘플)는 넣지 않는다.
 */
export function buildTemplateSetupConfig(templateKey: CustomFlowTemplateKey): CustomFlowDetailConfig {
  const base = buildInitialCustomFlowDetailConfig(templateKey, {
    displayName: '',
  });

  switch (templateKey) {
    case 'checklist':
      return normalizeCustomFlowDetailConfig('checklist', {
        ...base,
        checklist: [
          { id: 'd1', text: '물 한 잔 마시기', done: false },
          { id: 'd2', text: '5분 스트레칭', done: false },
          { id: 'd3', text: '창문 열고 환기', done: false },
        ],
        templateKey: 'checklist',
      });
    case 'abstain':
      return normalizeCustomFlowDetailConfig('abstain', {
        ...base,
        checklist: [
          { id: 'a1', text: '밤늦게 폰 보기', done: false },
          { id: 'a2', text: '과자·야식 먹기', done: false },
          { id: 'a3', text: 'SNS 무한 스크롤', done: false },
        ],
        templateKey: 'abstain',
      });
    case 'counter':
      return normalizeCounterDetailConfig({
        ...base,
        activityLabel: '',
        unitKey: 'count',
        goalCount: 10,
        currentCount: 0,
        stepSize: 1,
        secondaryStepSize: 5,
        dailyReset: true,
        history: [],
      });
    case 'reminder':
      return normalizeReminderDetailConfig({
        ...base,
        reminderItems: [
          { time: '09:00', label: '' },
          { time: '12:00', label: '' },
          { time: '18:00', label: '' },
        ],
        completedTimes: [],
      });
    case 'measurement':
      return normalizeMeasurementDetailConfig({
        ...base,
        ...applyMeasurementMetricPreset(
          normalizeMeasurementDetailConfig(base),
          MEASUREMENT_METRIC_PRESETS[0]!,
          { includeSampleData: false },
        ),
      });
    case 'memo':
    case 'habit':
    case 'focus':
    case 'journal':
    default:
      return base;
  }
}

export function buildInitialCustomFlowDetailConfig(
  templateKey: CustomFlowTemplateKey,
  input: {
    displayName?: string;
    summary?: string;
    icon?: string;
    accentColor?: string;
    /** 만들기·미리보기에서 고른 템플릿 설정(런타임 기록값 제외) */
    templateSeed?: unknown;
  } = {},
): CustomFlowDetailConfig {
  const { displayName, icon, accentColor } = input;
  const summary = typeof input.summary === 'string' ? input.summary.trim() : '';
  const appearance = {
    ...(displayName && displayName.trim().length > 0 ? { displayName: displayName.trim() } : {}),
    ...(summary.length > 0 ? { summary } : {}),
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
        ...(measurementSeed ?? {}),
        ...appearance,
      });
    }
    case 'habit':
      return normalizeHabitDetailConfig({ ...getInitialHabitDataConfig(), ...appearance });
    case 'counter': {
      const counterSeed = input.templateSeed ? pickCounterSettingsForCreate(input.templateSeed) : null;
      return normalizeCounterDetailConfig({
        ...getInitialCounterDataConfig(),
        ...(counterSeed ?? {}),
        ...appearance,
      });
    }
    case 'focus':
      return normalizeFocusDetailConfig({ ...getInitialFocusDataConfig(), ...appearance });
    case 'journal':
      return normalizeJournalDetailConfig({ ...getInitialJournalDataConfig(), ...appearance });
    case 'memo': {
      const memoSeed = input.templateSeed ? pickMemoSettingsForCreate(input.templateSeed) : null;
      return normalizeMemoDetailConfig({
        ...getInitialMemoDataConfig(),
        ...(memoSeed ?? {}),
        ...appearance,
      });
    }
    case 'reminder': {
      const reminderSeed = input.templateSeed ? pickReminderSettingsForCreate(input.templateSeed) : null;
      return normalizeReminderDetailConfig({
        ...getInitialReminderDataConfig(),
        ...(reminderSeed ?? {}),
        ...appearance,
      });
    }
    case 'abstain': {
      const abstainSeed = input.templateSeed
        ? pickChecklistSettingsForCreate(input.templateSeed, 'abstain')
        : null;
      return normalizeOtherDetailConfig({
        ...getInitialOtherDataConfig(),
        templateKey: 'abstain',
        ...(abstainSeed ?? {}),
        ...appearance,
      });
    }
    case 'checklist':
    default: {
      const checklistSeed = input.templateSeed
        ? pickChecklistSettingsForCreate(input.templateSeed, 'checklist')
        : null;
      return normalizeOtherDetailConfig({
        ...getInitialOtherDataConfig(),
        templateKey: 'checklist',
        ...(checklistSeed ?? {}),
        ...appearance,
      });
    }
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
