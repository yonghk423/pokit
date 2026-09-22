import { t, type I18nKey } from '@shared/lib/i18n';

import { applyCounterActivityPreset, pickCounterSettingsForCreate } from './counterPresetSamples';
import { COUNTER_ACTIVITY_PRESETS } from './counterUnits';
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
  getInitialFastingDataConfig,
  getInitialMeasurementDataConfig,
  getInitialMedicineDataConfig,
  getInitialOtherDataConfig,
  normalizeFastingDetailConfig,
  normalizeMeasurementDetailConfig,
  normalizeOtherDetailConfig,
  type FastingDetailDataConfig,
  type MeasurementDetailDataConfig,
  type OtherDetailDataConfig,
} from './goalCategorySessionConfig';
import {
  getInitialHealthIntakeDataConfig,
  normalizeHealthIntakeDetailConfig,
  type HealthIntakeDetailDataConfig,
} from './healthIntakeDetailConfig';
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
  healthIntake: '약 복용',
  fasting: '체중조절',
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
  healthIntake: '약·영양제를 챙겨요',
  fasting: '체중 목표를 기록해요',
  habit: '했는지만 간단히 남겨요',
  counter: '목표 횟수를 채워요',
  focus: '정해진 시간 동안 집중해요',
  journal: '짧은 메모를 남겨요',
  memo: '장보기·약속·할 일을 짧게 남겨요',
  reminder: '알림 시간에 맞춰 완료해요',
};

/** @deprecated 표시용은 `resolveCustomFlowTemplateSummary` 사용 */
export const CUSTOM_FLOW_TEMPLATE_SUMMARIES: Record<CustomFlowTemplateKey, string> = {
  checklist: '할 일 목록을 만들고, 세션에서 하나씩 체크해요.',
  abstain: '하지 말아야 할 습관을 목록으로 두고, 오늘 지켰는지 체크해요.',
  measurement: '체중·혈압처럼 숫자를 기록하고 추이·목표를 확인해요.',
  healthIntake: '약·영양제 복용을 챙기고 세션에서 기록해요.',
  fasting: '현재·목표 체중과 주간 감량 목표를 두고 날짜별로 기록해요.',
  habit: '오늘 했는지만 남기고 연속 기록을 쌓아요.',
  counter: '횟수를 세고 하루 목표까지 채워요.',
  focus: '정해 둔 시간 동안 집중 타이머로 진행해요.',
  journal: '질문에 답하고 기분과 함께 짧게 남겨요.',
  memo: '세션에서 할 일·약속·쇼핑 목록을 짧게 적고 저장해요.',
  reminder: '정해 둔 시간마다 완료 여부를 체크해요.',
};

const TEMPLATE_NAME_KEYS: Record<CustomFlowTemplateKey, I18nKey> = {
  checklist: 'customFlowTemplate.name.checklist',
  abstain: 'customFlowTemplate.name.abstain',
  measurement: 'customFlowTemplate.name.measurement',
  healthIntake: 'customFlowTemplate.name.healthIntake',
  fasting: 'customFlowTemplate.name.fasting',
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
  healthIntake: 'customFlowTemplate.desc.healthIntake',
  fasting: 'customFlowTemplate.desc.fasting',
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
  healthIntake: 'customFlowTemplate.summary.healthIntake',
  fasting: 'customFlowTemplate.summary.fasting',
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
  | HealthIntakeDetailDataConfig
  | FastingDetailDataConfig
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
      /** 새로 만든 루틴에는 템플릿 예시를 넣지 않음 — 빈 목록에서 「할 일 추가」 */
      return normalizeCustomFlowDetailConfig('checklist', {
        ...base,
        checklist: [],
        templateKey: 'checklist',
      });
    case 'abstain':
      /** 새로 만든 루틴에는 템플릿 예시를 넣지 않음 */
      return normalizeCustomFlowDetailConfig('abstain', {
        ...base,
        checklist: [],
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
    case 'healthIntake':
    case 'fasting':
    case 'memo':
    case 'habit':
    case 'focus':
    case 'journal':
    default:
      return base;
  }
}

/** 만들기 시 시드에 섞인 체험·세션 기록은 전부 비운다(설정값만 유지). */
export function clearCustomFlowRuntimeRecords(
  templateKey: CustomFlowTemplateKey,
  raw: unknown,
): CustomFlowDetailConfig {
  switch (templateKey) {
    case 'measurement': {
      const cfg = normalizeMeasurementDetailConfig(raw);
      return normalizeMeasurementDetailConfig({
        ...cfg,
        currentValue: 0,
        previousValue: 0,
        history: [],
        lastRecordedDateKey: '',
      });
    }
    case 'counter': {
      const cfg = normalizeCounterDetailConfig(raw);
      return normalizeCounterDetailConfig({
        ...cfg,
        currentCount: 0,
        history: [],
        countDateKey: getLocalDateKey(),
      });
    }
    case 'reminder': {
      const cfg = normalizeReminderDetailConfig(raw);
      return normalizeReminderDetailConfig({
        ...cfg,
        completedTimes: [],
      });
    }
    case 'habit': {
      const cfg = normalizeHabitDetailConfig(raw);
      return normalizeHabitDetailConfig({
        ...cfg,
        doneToday: false,
        streakDays: 0,
        lastDoneDateKey: '',
        recentDoneDateKeys: [],
      });
    }
    case 'focus': {
      const cfg = normalizeFocusDetailConfig(raw);
      return normalizeFocusDetailConfig({
        ...cfg,
        doneMin: 0,
        focusMemo: '',
      });
    }
    case 'journal': {
      const cfg = normalizeJournalDetailConfig(raw);
      return normalizeJournalDetailConfig({
        ...cfg,
        lastEntry: '',
        moodToday: '',
        recentEntries: [],
      });
    }
    case 'memo': {
      const cfg = normalizeMemoDetailConfig(raw);
      return normalizeMemoDetailConfig({
        ...cfg,
        lastEntry: '',
        recentEntries: [],
      });
    }
    case 'fasting': {
      const cfg = normalizeFastingDetailConfig(raw);
      return normalizeFastingDetailConfig({
        ...cfg,
        elapsedMin: 0,
        fastingEnabled: false,
        weightLogs: {},
      });
    }
    case 'healthIntake': {
      const cfg = normalizeHealthIntakeDetailConfig(raw);
      return normalizeHealthIntakeDetailConfig({
        ...cfg,
        water: {
          ...cfg.water,
          drankMl: 0,
        },
        medicine: {
          ...cfg.medicine,
          takenCount: 0,
        },
      });
    }
    case 'abstain':
    case 'checklist':
    default: {
      const cfg = normalizeOtherDetailConfig(raw);
      const key = templateKey === 'abstain' ? 'abstain' : 'checklist';
      return normalizeOtherDetailConfig({
        ...cfg,
        templateKey: key,
        checklist: cfg.checklist.map((item) => ({ ...item, done: false })),
      });
    }
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

  let built: CustomFlowDetailConfig;
  switch (templateKey) {
    case 'measurement': {
      const measurementSeed = input.templateSeed
        ? pickMeasurementSettingsForCreate(input.templateSeed)
        : null;
      built = normalizeMeasurementDetailConfig({
        ...getInitialMeasurementDataConfig(),
        ...(measurementSeed ?? {}),
        ...appearance,
      });
      break;
    }
    case 'healthIntake': {
      const intakeSeed = input.templateSeed
        ? normalizeHealthIntakeDetailConfig(input.templateSeed)
        : null;
      built = normalizeHealthIntakeDetailConfig({
        ...getInitialHealthIntakeDataConfig(),
        ...(intakeSeed
          ? {
              summary: intakeSeed.summary,
              water: {
                ...intakeSeed.water,
                drankMl: 0,
              },
              medicine: {
                ...intakeSeed.medicine,
                takenCount: 0,
              },
            }
          : {}),
        ...appearance,
      });
      break;
    }
    case 'fasting': {
      const fastingSeed = input.templateSeed ? normalizeFastingDetailConfig(input.templateSeed) : null;
      built = normalizeFastingDetailConfig({
        ...getInitialFastingDataConfig(),
        ...(fastingSeed
          ? {
              summary: fastingSeed.summary,
              currentWeightKg: fastingSeed.currentWeightKg,
              targetWeightKg: fastingSeed.targetWeightKg,
              weeklyLossTargetKg: fastingSeed.weeklyLossTargetKg,
            }
          : {}),
        ...appearance,
      });
      break;
    }
    case 'habit':
      built = normalizeHabitDetailConfig({ ...getInitialHabitDataConfig(), ...appearance });
      break;
    case 'counter': {
      const counterSeed = input.templateSeed ? pickCounterSettingsForCreate(input.templateSeed) : null;
      built = normalizeCounterDetailConfig({
        ...getInitialCounterDataConfig(),
        ...(counterSeed ?? {}),
        ...appearance,
      });
      break;
    }
    case 'focus':
      built = normalizeFocusDetailConfig({ ...getInitialFocusDataConfig(), ...appearance });
      break;
    case 'journal':
      built = normalizeJournalDetailConfig({ ...getInitialJournalDataConfig(), ...appearance });
      break;
    case 'memo': {
      const memoSeed = input.templateSeed ? pickMemoSettingsForCreate(input.templateSeed) : null;
      built = normalizeMemoDetailConfig({
        ...getInitialMemoDataConfig(),
        ...(memoSeed ?? {}),
        ...appearance,
      });
      break;
    }
    case 'reminder': {
      const reminderSeed = input.templateSeed ? pickReminderSettingsForCreate(input.templateSeed) : null;
      built = normalizeReminderDetailConfig({
        ...getInitialReminderDataConfig(),
        ...(reminderSeed ?? {}),
        ...appearance,
      });
      break;
    }
    case 'abstain': {
      const abstainSeed = input.templateSeed
        ? pickChecklistSettingsForCreate(input.templateSeed, 'abstain')
        : null;
      built = normalizeOtherDetailConfig({
        ...getInitialOtherDataConfig(),
        templateKey: 'abstain',
        ...(abstainSeed ?? {}),
        ...appearance,
      });
      break;
    }
    case 'checklist':
    default: {
      const checklistSeed = input.templateSeed
        ? pickChecklistSettingsForCreate(input.templateSeed, 'checklist')
        : null;
      built = normalizeOtherDetailConfig({
        ...getInitialOtherDataConfig(),
        templateKey: 'checklist',
        ...(checklistSeed ?? {}),
        ...appearance,
      });
      break;
    }
  }
  return clearCustomFlowRuntimeRecords(templateKey, built);
}

export function normalizeCustomFlowDetailConfig(
  templateKey: CustomFlowTemplateKey,
  raw: unknown,
): CustomFlowDetailConfig {
  switch (templateKey) {
    case 'measurement':
      return normalizeMeasurementDetailConfig(raw);
    case 'healthIntake':
      return normalizeHealthIntakeDetailConfig(raw);
    case 'fasting':
      return normalizeFastingDetailConfig(raw);
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
        previousValue: 68.8,
        lastRecordedDateKey: today,
        history: [
          { dateKey: addDaysToLocalDateKey(today, -6), value: 70.2 },
          { dateKey: addDaysToLocalDateKey(today, -5), value: 69.8 },
          { dateKey: addDaysToLocalDateKey(today, -4), value: 69.4 },
          { dateKey: addDaysToLocalDateKey(today, -3), value: 69.9 },
          { dateKey: addDaysToLocalDateKey(today, -2), value: 69.1 },
          { dateKey: addDaysToLocalDateKey(today, -1), value: 68.8 },
          { dateKey: today, value: 68.5 },
        ],
      });
    case 'healthIntake':
      return normalizeHealthIntakeDetailConfig({
        ...base,
        medicine: getInitialMedicineDataConfig(),
      });
    case 'fasting':
      return normalizeFastingDetailConfig({
        ...base,
        currentWeightKg: 68.5,
        targetWeightKg: 65,
        weeklyLossTargetKg: 0.5,
        weightLogs: {
          [addDaysToLocalDateKey(today, -2)]: 69.0,
          [addDaysToLocalDateKey(today, -1)]: 68.8,
          [today]: 68.5,
        },
      });
    case 'counter': {
      const pushup = COUNTER_ACTIVITY_PRESETS.find((row) => row.id === 'pushup');
      if (!pushup) {
        return normalizeCounterDetailConfig({
          ...base,
          activityLabel: '푸쉬업',
          unitKey: 'rep',
          goalCount: 50,
          currentCount: 0,
          stepSize: 5,
          secondaryStepSize: 10,
          dailyReset: true,
          countDateKey: today,
          history: [],
        });
      }
      return applyCounterActivityPreset(
        normalizeCounterDetailConfig({
          ...base,
          dailyReset: true,
          countDateKey: today,
        }),
        pushup,
        { includeSampleData: true },
      );
    }
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
        lastEntry: '출근 전 가방에 충전기·이어폰 챙기기',
        recentEntries: [
          {
            dateKey: addDaysToLocalDateKey(today, -1),
            text: '장보기: 계란·우유·샐러드 재료',
          },
          {
            dateKey: addDaysToLocalDateKey(today, -2),
            text: '병원 예약 — 목요일 오후 3시',
          },
          {
            dateKey: addDaysToLocalDateKey(today, -3),
            text: '책 30쪽까지 읽기 (챕터 4)',
          },
          {
            dateKey: addDaysToLocalDateKey(today, -4),
            text: '팀 회고: 다음 주 스프린트 목표 정리',
          },
          {
            dateKey: addDaysToLocalDateKey(today, -5),
            text: '세탁·빨래 개기 끝',
          },
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
