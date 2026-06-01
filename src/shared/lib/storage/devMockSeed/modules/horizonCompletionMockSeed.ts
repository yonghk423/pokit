import {
  clearHorizonCompletionsStorage,
  saveMonthlyCompletion,
  saveWeeklyCompletion,
  type HorizonCompletionEntry,
} from '../../horizonCompletionsStorage';
import {
  clearHorizonGoalsStorage,
  createHorizonBlock,
  saveMonthlyGoalDocument,
  saveWeeklyGoalDocument,
  type HorizonGoalDocument,
} from '../../horizonGoalsStorage';
import { loadHistoryDailyStats, type HistoryDailyStatRow } from '../../historyStorage';

import type { DevMockSeedModule } from '../types';

const WEEKLY_SEED_COUNT = 12;
const MONTHLY_SEED_COUNT = 3;

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  date.setDate(date.getDate() + deltaDays);
  return formatDateKey(date);
}

function getWeekStartKey(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
  const dow = date.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return addDaysToDateKey(dateKey, mondayOffset);
}

function getMonthKey(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey.slice(0, 7);
  return `${m[1]}-${m[2]}`;
}

function shiftMonthKey(monthKey: string, deltaMonths: number): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!m) return monthKey;
  const date = new Date(Number(m[1]), Number(m[2]) - 1 + deltaMonths, 1, 12, 0, 0, 0);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatWeekLabel(weekStartKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(weekStartKey.trim());
  if (!m) return weekStartKey;
  const month = Number(m[2]);
  const day = Number(m[3]);
  const weekOfMonth = Math.max(1, Math.ceil(day / 7));
  return `${month}월 ${weekOfMonth}주차`;
}

function formatMonthLabel(monthKey: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!m) return monthKey;
  return `${Number(m[1])}년 ${Number(m[2])}월`;
}

function isBetween(dateKey: string, startDateKey: string, endDateKey: string): boolean {
  return dateKey >= startDateKey && dateKey <= endDateKey;
}

function aggregateCategoryCounts(
  rows: HistoryDailyStatRow[],
  startDateKey: string,
  endDateKey: string,
): Array<{ key: string; count: number }> {
  const map: Record<string, number> = {};
  for (const row of rows) {
    if (!isBetween(row.dateKey, startDateKey, endDateKey)) continue;
    for (const [key, raw] of Object.entries(row.categoryCompletions ?? {})) {
      const count = Math.max(0, Math.floor(Number(raw) || 0));
      if (count <= 0) continue;
      map[key] = (map[key] ?? 0) + count;
    }
  }
  return Object.entries(map)
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

const CATEGORY_LABEL_KO: Record<string, string> = {
  reading: '독서',
  study: '공부',
  stretching: '스트레칭',
  water: '물 마시기',
  planning: '하루·주간 정리',
  fasting: '체중 관리',
  medicine: '약 챙기기',
};

function formatActivitySummary(rows: HistoryDailyStatRow[], startDateKey: string, endDateKey: string): string {
  const top = aggregateCategoryCounts(rows, startDateKey, endDateKey).slice(0, 3);
  if (top.length === 0) return '이 기간 활동 기록이 없어요.';
  return top
    .map((row, idx) => `${idx + 1}. ${CATEGORY_LABEL_KO[row.key] ?? row.key} · ${row.count}개`)
    .join('\n');
}

function buildWeeklyStrategyDocument(weekIndex: number): HorizonGoalDocument {
  const templates: HorizonGoalDocument[] = [
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: '이번 주 핵심 전략', bold: true }),
        createHorizonBlock('paragraph', { text: '아침 30분 집중 루틴을 지키기', underline: true }),
        createHorizonBlock('heading3', { text: '집중 항목' }),
        createHorizonBlock('bullet', { text: '독서 3회 이상' }),
        createHorizonBlock('bullet', { text: '공부 2회', bold: true }),
        createHorizonBlock('numbered', { text: '수요일 중간 점검' }),
        createHorizonBlock('numbered', { text: '금요일 주간 회고' }),
        createHorizonBlock('checklist', { text: '주말 스트레칭', checked: weekIndex % 2 === 0 }),
      ],
    },
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading2', { text: '체력·루틴', bold: true }),
        createHorizonBlock('paragraph', { text: '수면 7시간 유지', underline: true }),
        createHorizonBlock('bullet', { text: '물 마시기 알림 5회/일' }),
        createHorizonBlock('bullet', { text: '스트레칭 4회' }),
        createHorizonBlock('checklist', { text: '약 챙기기', checked: true }),
        createHorizonBlock('checklist', { text: '하루 정리 10분', checked: weekIndex % 3 !== 0 }),
      ],
    },
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: '성장 목표' }),
        createHorizonBlock('paragraph', { text: '깊은 작업 2블록 확보', bold: true, underline: true }),
        createHorizonBlock('numbered', { text: '월·수 오전 집중' }),
        createHorizonBlock('numbered', { text: '목·금 오후 마무리' }),
        createHorizonBlock('bullet', { text: '방해 요소 줄이기' }),
      ],
    },
  ];
  return templates[weekIndex % templates.length];
}

function buildMonthlyStrategyDocument(monthIndex: number): HorizonGoalDocument {
  const templates: HorizonGoalDocument[] = [
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: '이번 달 한 줄 목표', bold: true }),
        createHorizonBlock('paragraph', { text: '꾸준함보다 회복력 — 놓친 날 바로 이어가기', underline: true }),
        createHorizonBlock('heading2', { text: '월간 우선순위' }),
        createHorizonBlock('numbered', { text: '독서 12권 분량' }),
        createHorizonBlock('numbered', { text: '운동 16회' }),
        createHorizonBlock('numbered', { text: '주 1회 긴 회고' }),
        createHorizonBlock('checklist', { text: '첫 주 루틴 고정', checked: monthIndex === 0 }),
        createHorizonBlock('checklist', { text: '셋째 주 중간 점검', checked: monthIndex !== 1 }),
      ],
    },
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading2', { text: '생활 리듬', bold: true }),
        createHorizonBlock('bullet', { text: '기상 시간 ±30분 이내' }),
        createHorizonBlock('bullet', { text: '취침 전 디지털 OFF', underline: true }),
        createHorizonBlock('heading3', { text: '마무리 기준' }),
        createHorizonBlock('paragraph', { text: '주 4일 이상 완료하면 성공한 주' }),
      ],
    },
  ];
  return templates[monthIndex % templates.length];
}

function seedHorizonCompletions(historyRows: HistoryDailyStatRow[]): { weekly: number; monthly: number } {
  const today = formatDateKey(new Date());
  const currentWeekStart = getWeekStartKey(today);
  const currentMonthKey = getMonthKey(today);

  let weekly = 0;
  for (let i = 0; i < WEEKLY_SEED_COUNT; i += 1) {
    const weekStartKey = addDaysToDateKey(currentWeekStart, -7 * i);
    const weekEndKey = addDaysToDateKey(weekStartKey, 6);
    const activitySummary = formatActivitySummary(historyRows, weekStartKey, weekEndKey);
    const document = buildWeeklyStrategyDocument(i);
    saveWeeklyGoalDocument(weekStartKey, document);
    const entry: HorizonCompletionEntry = {
      periodKey: weekStartKey,
      label: formatWeekLabel(weekStartKey),
      completedAt: `${weekEndKey}T20:00:00.000Z`,
      summaryText: activitySummary,
      document,
    };
    saveWeeklyCompletion(entry);
    weekly += 1;
  }

  let monthly = 0;
  for (let i = 0; i < MONTHLY_SEED_COUNT; i += 1) {
    const monthKey = shiftMonthKey(currentMonthKey, -i);
    const monthStart = `${monthKey}-01`;
    const monthEndMatch = /^(\d{4})-(\d{2})$/.exec(monthKey);
    const monthEnd =
      monthEndMatch
        ? `${monthKey}-${String(new Date(Number(monthEndMatch[1]), Number(monthEndMatch[2]), 0, 12, 0, 0, 0).getDate()).padStart(2, '0')}`
        : monthStart;
    const activitySummary = formatActivitySummary(historyRows, monthStart, monthEnd);
    const document = buildMonthlyStrategyDocument(i);
    saveMonthlyGoalDocument(monthKey, document);
    const entry: HorizonCompletionEntry = {
      periodKey: monthKey,
      label: formatMonthLabel(monthKey),
      completedAt: `${monthEnd}T20:00:00.000Z`,
      summaryText: activitySummary,
      document,
    };
    saveMonthlyCompletion(entry);
    monthly += 1;
  }

  return { weekly, monthly };
}

/** history-daily 모듈 이후에 실행해야 한다. */
export const horizonCompletionMockSeed: DevMockSeedModule = {
  id: 'horizon-completions',
  version: 4,
  async seed() {
    const historyRows = loadHistoryDailyStats();
    const horizon = seedHorizonCompletions(historyRows);
    return {
      weeklyCompletions: horizon.weekly,
      monthlyCompletions: horizon.monthly,
    };
  },
  async clear() {
    clearHorizonCompletionsStorage();
    clearHorizonGoalsStorage();
  },
};
