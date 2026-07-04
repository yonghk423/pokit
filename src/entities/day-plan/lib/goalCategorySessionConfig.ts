/** 목표 상세(플로우별) 저장 구조 — 세션·위젯에서 공용으로 사용 */

import type { ReadingLiveActivityConfig } from './readingLiveActivityConfig';
import { normalizeWaterReminderTimes } from './normalizeWaterReminderTimes';
import { parseHHmmToMinutes } from './parseTime';
import { normalizeRoutineDisplayName } from './routineDisplayName';
import { normalizeRoutineSummary } from './routineSummary';

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function clampStr(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > max ? t.slice(0, max) : t;
}

// --- work ---
export type WorkTask = { id: string; text: string; done: boolean };

export type WorkDetailDataConfig = {
  displayName: string;
  planMin: number;
  doneMin: number;
  tasks: WorkTask[];
  focusMemo: string;
  summary: string;
};

export function normalizeWorkDetailConfig(raw: unknown): WorkDetailDataConfig {
  const o = asObj(raw);
  const planMin = Math.max(15, Math.min(720, Number(o.planMin) || 120));
  const doneRaw = Number(o.doneMin);
  const doneMin = Math.max(0, Math.min(planMin, Number.isFinite(doneRaw) ? doneRaw : 0));
  const tasks: WorkTask[] = Array.isArray(o.tasks)
    ? (o.tasks as unknown[])
        .filter((t): t is Record<string, unknown> => t != null && typeof t === 'object')
        .map((t) => ({
          id: typeof t.id === 'string' ? t.id : `t-${Math.random().toString(36).slice(2, 8)}`,
          text: clampStr(t.text, 120),
          done: typeof t.done === 'boolean' ? t.done : false,
        }))
        .filter((t) => t.text.length > 0)
    : [];
  const focusMemo = clampStr(o.focusMemo, 200);
  const summary = normalizeRoutineSummary(o.summary);
  const displayName = normalizeRoutineDisplayName(o.displayName);
  return { displayName, planMin, doneMin, tasks, focusMemo, summary };
}

export function getInitialWorkDataConfig(): WorkDetailDataConfig {
  return { displayName: '', planMin: 120, doneMin: 0, tasks: [], focusMemo: '', summary: '' };
}

// --- meditation ---
export type MeditationDetailDataConfig = {
  displayName: string;
  sessionMin: number;
  elapsedMin: number;
  summary: string;
};

export function normalizeMeditationDetailConfig(raw: unknown): MeditationDetailDataConfig {
  const o = asObj(raw);
  const sessionMin = Math.max(1, Math.min(180, Number(o.sessionMin) || 15));
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(0, Math.min(sessionMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0));
  const summary = normalizeRoutineSummary(o.summary);
  const displayName = normalizeRoutineDisplayName(o.displayName);
  return { displayName, sessionMin, elapsedMin, summary };
}

export function getInitialMeditationDataConfig(): MeditationDetailDataConfig {
  return { displayName: '', sessionMin: 15, elapsedMin: 0, summary: '' };
}

// --- yoga ---
export type YogaDetailDataConfig = {
  displayName: string;
  sessionMin: number;
  elapsedMin: number;
  flowLabel: string;
  summary: string;
};

export function normalizeYogaDetailConfig(raw: unknown): YogaDetailDataConfig {
  const o = asObj(raw);
  const sessionMin = Math.max(1, Math.min(180, Number(o.sessionMin) || 40));
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(0, Math.min(sessionMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0));
  const flowLabel = clampStr(o.flowLabel, 40) || '루틴';
  const summary = normalizeRoutineSummary(o.summary);
  const displayName = normalizeRoutineDisplayName(o.displayName);
  return { displayName, sessionMin, elapsedMin, flowLabel, summary };
}

export function getInitialYogaDataConfig(): YogaDetailDataConfig {
  return { displayName: '', sessionMin: 40, elapsedMin: 0, flowLabel: '루틴', summary: '' };
}

// --- fasting ---
export type FastingDetailDataConfig = {
  displayName: string;
  fastingMin: number;
  elapsedMin: number;
  currentWeightKg: number;
  targetWeightKg: number;
  weeklyLossTargetKg: number;
  fastingEnabled: boolean;
  summary: string;
};

const FASTING_MIN = 60;
const FASTING_MAX = 48 * 60;

export function normalizeFastingDetailConfig(raw: unknown): FastingDetailDataConfig {
  const o = asObj(raw);
  const fastingMin = Math.max(FASTING_MIN, Math.min(FASTING_MAX, Number(o.fastingMin) || 16 * 60));
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(0, Math.min(fastingMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0));
  const currentWeightRaw = Number(o.currentWeightKg);
  const currentWeightKg = Math.max(
    30,
    Math.min(250, Number.isFinite(currentWeightRaw) ? currentWeightRaw : 70),
  );
  const targetWeightRaw = Number(o.targetWeightKg);
  const targetWeightKg = Math.max(
    30,
    Math.min(250, Number.isFinite(targetWeightRaw) ? targetWeightRaw : currentWeightKg - 5),
  );
  const weeklyLossRaw = Number(o.weeklyLossTargetKg);
  const weeklyLossTargetKg = Math.max(
    0.1,
    Math.min(2, Number.isFinite(weeklyLossRaw) ? weeklyLossRaw : 0.5),
  );
  const fastingEnabled = typeof o.fastingEnabled === 'boolean' ? o.fastingEnabled : true;
  const summary = normalizeRoutineSummary(o.summary);
  const displayName = normalizeRoutineDisplayName(o.displayName);
  return {
    displayName,
    fastingMin,
    elapsedMin,
    currentWeightKg,
    targetWeightKg,
    weeklyLossTargetKg,
    fastingEnabled,
    summary,
  };
}

export function getInitialFastingDataConfig(): FastingDetailDataConfig {
  return {
    displayName: '',
    fastingMin: 16 * 60,
    elapsedMin: 0,
    currentWeightKg: 70,
    targetWeightKg: 65,
    weeklyLossTargetKg: 0.5,
    fastingEnabled: true,
    summary: '',
  };
}

// --- water ---
export type WaterReminderPreset = '60' | '120' | 'custom';

export type WaterDetailDataConfig = {
  displayName: string;
  goalMl: number;
  drankMl: number;
  /** 60=1시간, 120=2시간, custom=reminderCustomMin — 「시각 일괄 채우기」에만 사용 */
  reminderPreset: WaterReminderPreset;
  reminderCustomMin: number;
  smartNotification: boolean;
  /** 사용자가 직접 추가한 알림 시각(HH:mm). 비어 있으면 예약하지 않음 */
  reminderTimes: string[];
  summary: string;
};

export function normalizeWaterDetailConfig(raw: unknown): WaterDetailDataConfig {
  const o = asObj(raw);
  const goalMl = Math.max(100, Math.min(10000, Number(o.goalMl) || 2000));
  const drankRaw = Number(o.drankMl);
  const drankMl = Math.max(0, Math.min(goalMl, Number.isFinite(drankRaw) ? drankRaw : 0));

  let reminderPreset: WaterReminderPreset = '60';
  if (o.reminderPreset === '120' || o.reminderPreset === 'custom') {
    reminderPreset = o.reminderPreset;
  }
  const customRaw = Number(o.reminderCustomMin);
  const reminderCustomMin = Math.max(
    15,
    Math.min(24 * 60, Number.isFinite(customRaw) ? Math.round(customRaw) : 90),
  );

  const smartNotification =
    typeof o.smartNotification === 'boolean' ? o.smartNotification : false;

  const reminderTimes = normalizeWaterReminderTimes(o.reminderTimes);
  const summary = normalizeRoutineSummary(o.summary);
  const displayName = normalizeRoutineDisplayName(o.displayName);

  return {
    displayName,
    goalMl,
    drankMl,
    reminderPreset,
    reminderCustomMin,
    smartNotification,
    reminderTimes,
    summary,
  };
}

export function getInitialWaterDataConfig(): WaterDetailDataConfig {
  return {
    displayName: '',
    goalMl: 2000,
    drankMl: 0,
    reminderPreset: '60',
    reminderCustomMin: 90,
    smartNotification: false,
    reminderTimes: [],
    summary: '',
  };
}

// --- medicine ---
function formatHHmmFromMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function normalizeMedicineHHmm(raw: unknown, fallback: string): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  const parsed = parseHHmmToMinutes(t.length > 0 ? t : fallback);
  if (parsed === null) return fallback;
  return formatHHmmFromMinutes(parsed);
}

export type MedicineDetailDataConfig = {
  displayName: string;
  /** 약 이름(표시용) */
  doseLabel: string;
  /** 활성화된 복용 슬롯 수(0이면 슬롯 미설정) */
  dosesPerDay: number;
  takenCount: number;
  morningOn: boolean;
  lunchOn: boolean;
  dinnerOn: boolean;
  morningTime: string;
  lunchTime: string;
  dinnerTime: string;
  /** 슬롯별 매일 로컬 알림(슬롯이 켜져 있을 때만 적용) */
  morningNotify: boolean;
  lunchNotify: boolean;
  dinnerNotify: boolean;
  summary: string;
};

export function normalizeMedicineDetailConfig(raw: unknown): MedicineDetailDataConfig {
  const o = asObj(raw);
  const doseLabel = clampStr(o.doseLabel, 48);

  const hasSlotKeys = 'morningOn' in o || 'lunchOn' in o || 'dinnerOn' in o;
  const hasLegacyDoseFields = 'dosesPerDay' in o || 'takenCount' in o;
  const legacyDoses = Math.max(1, Math.min(12, Number(o.dosesPerDay) || 3));

  let morningOn: boolean;
  let lunchOn: boolean;
  let dinnerOn: boolean;
  if (hasSlotKeys) {
    /** 명시 키가 있으면 기본은 끔 — 사용자가 탭으로 슬롯을 켜도록 함 */
    morningOn = typeof o.morningOn === 'boolean' ? o.morningOn : false;
    lunchOn = typeof o.lunchOn === 'boolean' ? o.lunchOn : false;
    dinnerOn = typeof o.dinnerOn === 'boolean' ? o.dinnerOn : false;
  } else if (hasLegacyDoseFields) {
    /** 예전 `{ dosesPerDay, takenCount }` 만 있던 데이터: 횟수만큼 아침→점심→저녁 순으로 켬 */
    morningOn = legacyDoses >= 1;
    lunchOn = legacyDoses >= 2;
    dinnerOn = legacyDoses >= 3;
  } else {
    /** 새/빈 데이터는 기본 슬롯을 자동 활성화하지 않음 */
    morningOn = false;
    lunchOn = false;
    dinnerOn = false;
  }

  const morningTime = normalizeMedicineHHmm(o.morningTime, '08:30');
  const lunchTime = normalizeMedicineHHmm(o.lunchTime, '12:30');
  const dinnerTime = normalizeMedicineHHmm(o.dinnerTime, '19:30');

  const enabledCount = [morningOn, lunchOn, dinnerOn].filter(Boolean).length;
  const dosesPerDay = Math.max(0, Math.min(12, enabledCount));

  const takenRaw = Number(o.takenCount);
  const takenCount = Math.max(
    0,
    Math.min(dosesPerDay, Number.isFinite(takenRaw) ? takenRaw : 0),
  );

  const legacyMedicationNotify =
    typeof o.medicationNotify === 'boolean' ? o.medicationNotify : undefined;

  let morningNotify: boolean;
  let lunchNotify: boolean;
  let dinnerNotify: boolean;
  if (
    typeof o.morningNotify === 'boolean' ||
    typeof o.lunchNotify === 'boolean' ||
    typeof o.dinnerNotify === 'boolean'
  ) {
    const fallbackLegacy = legacyMedicationNotify !== false;
    morningNotify = typeof o.morningNotify === 'boolean' ? o.morningNotify : fallbackLegacy;
    lunchNotify = typeof o.lunchNotify === 'boolean' ? o.lunchNotify : fallbackLegacy;
    dinnerNotify = typeof o.dinnerNotify === 'boolean' ? o.dinnerNotify : fallbackLegacy;
  } else if (legacyMedicationNotify === false) {
    morningNotify = false;
    lunchNotify = false;
    dinnerNotify = false;
  } else {
    morningNotify = true;
    lunchNotify = true;
    dinnerNotify = true;
  }

  return {
    displayName: normalizeRoutineDisplayName(o.displayName),
    doseLabel,
    dosesPerDay,
    takenCount,
    morningOn,
    lunchOn,
    dinnerOn,
    morningTime,
    lunchTime,
    dinnerTime,
    morningNotify,
    lunchNotify,
    dinnerNotify,
    summary: normalizeRoutineSummary(o.summary),
  };
}

export function getInitialMedicineDataConfig(): MedicineDetailDataConfig {
  return {
    displayName: '',
    doseLabel: '',
    dosesPerDay: 0,
    takenCount: 0,
    morningOn: false,
    lunchOn: false,
    dinnerOn: false,
    morningTime: '08:30',
    lunchTime: '12:30',
    dinnerTime: '19:30',
    morningNotify: true,
    lunchNotify: true,
    dinnerNotify: true,
    summary: '',
  };
}

import {
  normalizeCustomFlowAccentColor,
  normalizeCustomFlowIcon,
} from '@shared/lib/customFlowAppearanceCatalog';

// --- other ---
export type OtherChecklistTask = {
  id: string;
  text: string;
  done: boolean;
};

export type OtherDetailDataConfig = {
  /** 비어 있으면 담기·목록 등에서 기본 문구(`OTHER_CATEGORY_PICKER_FALLBACK_KO`) 사용 */
  displayName: string;
  /** 루틴 한 줄 요약 — 담기·목표 상세 부제 등에 표시 */
  summary: string;
  checklist: OtherChecklistTask[];
  /** SF Symbol — 사용자 커스텀 플로우 전용 */
  icon?: string;
  /** #RRGGBB — 사용자 커스텀 플로우 집중 아이콘 강조색 */
  accentColor?: string;
};

/** 담기·일정 등에서 `other` 키의 기본 표기(사용자가 이름을 비운 경우) */
export const OTHER_CATEGORY_PICKER_FALLBACK_KO = '루틴 직접 설정';

export function getOtherCategoryResolvedDisplayLabel(raw: unknown | null): string {
  const cfg = normalizeOtherDetailConfig(raw ?? getInitialOtherDataConfig());
  const d = cfg.displayName.trim();
  return d.length > 0 ? d : OTHER_CATEGORY_PICKER_FALLBACK_KO;
}

/** `resolveCategoryKeyFromLabel`용 — 사용자가 지정한 이름만(없으면 null) */
export function readTrimmedOtherCustomDisplayNameFromRaw(raw: unknown | null): string | null {
  const cfg = normalizeOtherDetailConfig(raw ?? getInitialOtherDataConfig());
  const d = cfg.displayName.trim();
  return d.length > 0 ? d : null;
}

export function normalizeOtherDetailConfig(raw: unknown): OtherDetailDataConfig {
  const o = asObj(raw);
  const displayName = normalizeRoutineDisplayName(o.displayName);
  const summary = normalizeRoutineSummary(o.summary);
  const checklist: OtherChecklistTask[] = Array.isArray(o.checklist)
    ? (o.checklist as unknown[])
        .filter((t): t is Record<string, unknown> => t != null && typeof t === 'object')
        .map((t) => ({
          id: typeof t.id === 'string' ? t.id : `o_${Math.random().toString(36).slice(2, 8)}`,
          text: clampStr(t.text, 160),
          done: typeof t.done === 'boolean' ? t.done : false,
        }))
        .filter((t) => t.text.length > 0)
    : [];

  const icon = normalizeCustomFlowIcon(o.icon);
  const accentColor = normalizeCustomFlowAccentColor(o.accentColor);

  return {
    displayName,
    summary,
    checklist,
    ...(icon ? { icon } : {}),
    ...(accentColor ? { accentColor } : {}),
  };
}

export function getInitialOtherDataConfig(): OtherDetailDataConfig {
  return {
    displayName: '',
    summary: '',
    checklist: [],
  };
}

/** 액티브 세션 화면: 현재 블록 카테고리에 맞춰 하나만 채움 */
export type CategoryConfigsForActiveSession = {
  reading: ReadingLiveActivityConfig | null;
  work: WorkDetailDataConfig | null;
  meditation: MeditationDetailDataConfig | null;
  yoga: YogaDetailDataConfig | null;
  fasting: FastingDetailDataConfig | null;
  water: WaterDetailDataConfig | null;
  medicine: MedicineDetailDataConfig | null;
  other: OtherDetailDataConfig | null;
};

export function emptyCategorySessionConfigs(): CategoryConfigsForActiveSession {
  return {
    reading: null,
    work: null,
    meditation: null,
    yoga: null,
    fasting: null,
    water: null,
    medicine: null,
    other: null,
  };
}
