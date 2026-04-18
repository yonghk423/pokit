/** 목표 상세(플로우별) 저장 구조 — 세션·위젯에서 공용으로 사용 */

import type { ReadingLiveActivityConfig } from './readingLiveActivityConfig';
import { parseHHmmToMinutes } from './parseTime';

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
  planMin: number;
  doneMin: number;
  tasks: WorkTask[];
  focusMemo: string;
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
  return { planMin, doneMin, tasks, focusMemo };
}

export function getInitialWorkDataConfig(): WorkDetailDataConfig {
  return { planMin: 120, doneMin: 0, tasks: [], focusMemo: '' };
}

// --- meditation ---
export type MeditationDetailDataConfig = { sessionMin: number; elapsedMin: number };

export function normalizeMeditationDetailConfig(raw: unknown): MeditationDetailDataConfig {
  const o = asObj(raw);
  const sessionMin = Math.max(1, Math.min(180, Number(o.sessionMin) || 15));
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(0, Math.min(sessionMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0));
  return { sessionMin, elapsedMin };
}

export function getInitialMeditationDataConfig(): MeditationDetailDataConfig {
  return { sessionMin: 15, elapsedMin: 0 };
}

// --- yoga ---
export type YogaDetailDataConfig = {
  sessionMin: number;
  elapsedMin: number;
  flowLabel: string;
};

export function normalizeYogaDetailConfig(raw: unknown): YogaDetailDataConfig {
  const o = asObj(raw);
  const sessionMin = Math.max(1, Math.min(180, Number(o.sessionMin) || 40));
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(0, Math.min(sessionMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0));
  const flowLabel = clampStr(o.flowLabel, 40) || '플로우';
  return { sessionMin, elapsedMin, flowLabel };
}

export function getInitialYogaDataConfig(): YogaDetailDataConfig {
  return { sessionMin: 40, elapsedMin: 0, flowLabel: '플로우' };
}

// --- fasting ---
export type FastingDetailDataConfig = { fastingMin: number; elapsedMin: number };

const FASTING_MIN = 60;
const FASTING_MAX = 48 * 60;

export function normalizeFastingDetailConfig(raw: unknown): FastingDetailDataConfig {
  const o = asObj(raw);
  const fastingMin = Math.max(FASTING_MIN, Math.min(FASTING_MAX, Number(o.fastingMin) || 16 * 60));
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(0, Math.min(fastingMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0));
  return { fastingMin, elapsedMin };
}

export function getInitialFastingDataConfig(): FastingDetailDataConfig {
  return { fastingMin: 16 * 60, elapsedMin: 0 };
}

// --- water ---
export type WaterReminderPreset = '60' | '120' | 'custom';

export type WaterDetailDataConfig = {
  goalMl: number;
  drankMl: number;
  /** 60=1시간, 120=2시간, custom=reminderCustomMin 사용 */
  reminderPreset: WaterReminderPreset;
  reminderCustomMin: number;
  smartNotification: boolean;
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
    typeof o.smartNotification === 'boolean' ? o.smartNotification : true;

  return { goalMl, drankMl, reminderPreset, reminderCustomMin, smartNotification };
}

export function getInitialWaterDataConfig(): WaterDetailDataConfig {
  return {
    goalMl: 2000,
    drankMl: 0,
    reminderPreset: '60',
    reminderCustomMin: 90,
    smartNotification: true,
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
  medicationNotify: boolean;
};

export function normalizeMedicineDetailConfig(raw: unknown): MedicineDetailDataConfig {
  const o = asObj(raw);
  const doseLabel = clampStr(o.doseLabel, 48) || '비타민';

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

  const medicationNotify = typeof o.medicationNotify === 'boolean' ? o.medicationNotify : true;

  return {
    doseLabel,
    dosesPerDay,
    takenCount,
    morningOn,
    lunchOn,
    dinnerOn,
    morningTime,
    lunchTime,
    dinnerTime,
    medicationNotify,
  };
}

export function getInitialMedicineDataConfig(): MedicineDetailDataConfig {
  return {
    doseLabel: '비타민',
    dosesPerDay: 0,
    takenCount: 0,
    morningOn: false,
    lunchOn: false,
    dinnerOn: false,
    morningTime: '08:30',
    lunchTime: '12:30',
    dinnerTime: '19:30',
    medicationNotify: true,
  };
}

// --- other ---
export type OtherChecklistTask = {
  id: string;
  text: string;
  done: boolean;
};

export type OtherDetailDataConfig = {
  checklist: OtherChecklistTask[];
};

export function normalizeOtherDetailConfig(raw: unknown): OtherDetailDataConfig {
  const o = asObj(raw);
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

  return { checklist };
}

export function getInitialOtherDataConfig(): OtherDetailDataConfig {
  return {
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
