/** 목표 상세(플로우별) 저장 구조 — 세션·위젯에서 공용으로 사용 */

import type { ReadingLiveActivityConfig } from './readingLiveActivityConfig';
import type { RunDetailDataConfig } from './runDetailConfig';

function asObj(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
}

function clampStr(s: unknown, max: number): string {
  const t = typeof s === 'string' ? s.trim() : '';
  return t.length > max ? t.slice(0, max) : t;
}

// --- work ---
export type WorkDetailDataConfig = { planMin: number; doneMin: number };

export function normalizeWorkDetailConfig(raw: unknown): WorkDetailDataConfig {
  const o = asObj(raw);
  const planMin = Math.max(15, Math.min(720, Number(o.planMin) || 120));
  const doneRaw = Number(o.doneMin);
  const doneMin = Math.max(0, Math.min(planMin, Number.isFinite(doneRaw) ? doneRaw : 0));
  return { planMin, doneMin };
}

export function getInitialWorkDataConfig(): WorkDetailDataConfig {
  return { planMin: 120, doneMin: 0 };
}

// --- study ---
export type StudyDetailDataConfig = { goalMemo: string };

export function normalizeStudyDetailConfig(raw: unknown): StudyDetailDataConfig {
  const o = asObj(raw);
  return { goalMemo: clampStr(o.goalMemo, 80) };
}

export function getInitialStudyDataConfig(): StudyDetailDataConfig {
  return { goalMemo: '' };
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

// --- rest ---
export type RestDetailDataConfig = { restMin: number; elapsedMin: number };

export function normalizeRestDetailConfig(raw: unknown): RestDetailDataConfig {
  const o = asObj(raw);
  const restMin = Math.max(1, Math.min(240, Number(o.restMin) || 20));
  const elapsedRaw = Number(o.elapsedMin);
  const elapsedMin = Math.max(0, Math.min(restMin, Number.isFinite(elapsedRaw) ? elapsedRaw : 0));
  return { restMin, elapsedMin };
}

export function getInitialRestDataConfig(): RestDetailDataConfig {
  return { restMin: 20, elapsedMin: 0 };
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
export type WaterDetailDataConfig = { goalMl: number; drankMl: number };

export function normalizeWaterDetailConfig(raw: unknown): WaterDetailDataConfig {
  const o = asObj(raw);
  const goalMl = Math.max(100, Math.min(10000, Number(o.goalMl) || 2000));
  const drankRaw = Number(o.drankMl);
  const drankMl = Math.max(0, Math.min(goalMl, Number.isFinite(drankRaw) ? drankRaw : 0));
  return { goalMl, drankMl };
}

export function getInitialWaterDataConfig(): WaterDetailDataConfig {
  return { goalMl: 2000, drankMl: 0 };
}

// --- medicine ---
export type MedicineDetailDataConfig = {
  doseLabel: string;
  dosesPerDay: number;
  takenCount: number;
};

export function normalizeMedicineDetailConfig(raw: unknown): MedicineDetailDataConfig {
  const o = asObj(raw);
  const doseLabel = clampStr(o.doseLabel, 48) || '비타민';
  const dosesPerDay = Math.max(1, Math.min(12, Number(o.dosesPerDay) || 3));
  const takenRaw = Number(o.takenCount);
  const takenCount = Math.max(0, Math.min(dosesPerDay, Number.isFinite(takenRaw) ? takenRaw : 0));
  return { doseLabel, dosesPerDay, takenCount };
}

export function getInitialMedicineDataConfig(): MedicineDetailDataConfig {
  return { doseLabel: '비타민', dosesPerDay: 3, takenCount: 0 };
}

// --- stretch ---
export type StretchDetailDataConfig = { totalSets: number; holdSec: number; doneSets: number };

export function normalizeStretchDetailConfig(raw: unknown): StretchDetailDataConfig {
  const o = asObj(raw);
  const totalSets = Math.max(1, Math.min(50, Number(o.totalSets) || 8));
  const holdSec = Math.max(5, Math.min(300, Number(o.holdSec) || 30));
  const doneRaw = Number(o.doneSets);
  const doneSets = Math.max(0, Math.min(totalSets, Number.isFinite(doneRaw) ? doneRaw : 0));
  return { totalSets, holdSec, doneSets };
}

export function getInitialStretchDataConfig(): StretchDetailDataConfig {
  return { totalSets: 8, holdSec: 30, doneSets: 0 };
}

// --- other ---
export type OtherDetailDataConfig = { memo: string };

export function normalizeOtherDetailConfig(raw: unknown): OtherDetailDataConfig {
  const o = asObj(raw);
  return { memo: clampStr(o.memo, 120) };
}

export function getInitialOtherDataConfig(): OtherDetailDataConfig {
  return { memo: '' };
}

/** 액티브 세션 화면: 현재 블록 카테고리에 맞춰 하나만 채움 */
export type CategoryConfigsForActiveSession = {
  reading: ReadingLiveActivityConfig | null;
  run: RunDetailDataConfig | null;
  work: WorkDetailDataConfig | null;
  study: StudyDetailDataConfig | null;
  meditation: MeditationDetailDataConfig | null;
  yoga: YogaDetailDataConfig | null;
  rest: RestDetailDataConfig | null;
  fasting: FastingDetailDataConfig | null;
  water: WaterDetailDataConfig | null;
  medicine: MedicineDetailDataConfig | null;
  stretch: StretchDetailDataConfig | null;
  other: OtherDetailDataConfig | null;
};

export function emptyCategorySessionConfigs(): CategoryConfigsForActiveSession {
  return {
    reading: null,
    run: null,
    work: null,
    study: null,
    meditation: null,
    yoga: null,
    rest: null,
    fasting: null,
    water: null,
    medicine: null,
    stretch: null,
    other: null,
  };
}
