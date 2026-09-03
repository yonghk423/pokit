import type { AppLocale } from '@shared/lib/i18n/model/locale';

import type { HorizonGoalDocument } from '../../horizonGoalsStorage';
import { createHorizonBlock } from '../../horizonGoalsStorage';

type HorizonCopy = {
  emptyActivity: string;
  activityItem: (index: number, label: string, count: number) => string;
  formatWeekLabel: (month: number, weekOfMonth: number) => string;
  formatMonthLabel: (year: number, month: number) => string;
  buildWeekly: (weekIndex: number) => HorizonGoalDocument[];
  buildMonthly: (monthIndex: number) => HorizonGoalDocument[];
};

const KO: HorizonCopy = {
  emptyActivity: '이 기간 활동 기록이 없어요.',
  activityItem: (index, label, count) => `${index}. ${label} · ${count}개`,
  formatWeekLabel: (month, weekOfMonth) => `${month}월 ${weekOfMonth}주차`,
  formatMonthLabel: (year, month) => `${year}년 ${month}월`,
  buildWeekly: (weekIndex) => [
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: '섹션제목1', bold: true }),
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
  ],
  buildMonthly: (monthIndex) => [
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: '섹션제목1', bold: true }),
        createHorizonBlock('paragraph', {
          text: '꾸준함보다 회복력 — 놓친 날 바로 이어가기',
          underline: true,
        }),
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
  ],
};

const EN: HorizonCopy = {
  emptyActivity: 'No activity recorded for this period.',
  activityItem: (index, label, count) => `${index}. ${label} · ${count}`,
  formatWeekLabel: (month, weekOfMonth) => `Week ${weekOfMonth} of ${month}`,
  formatMonthLabel: (year, month) =>
    new Date(year, month - 1, 1).toLocaleString('en', { month: 'long', year: 'numeric' }),
  buildWeekly: (weekIndex) => [
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: 'Section 1', bold: true }),
        createHorizonBlock('paragraph', {
          text: 'Keep a focused 30-minute morning routine',
          underline: true,
        }),
        createHorizonBlock('heading3', { text: 'Focus items' }),
        createHorizonBlock('bullet', { text: 'Read 3+ times' }),
        createHorizonBlock('bullet', { text: 'Study twice', bold: true }),
        createHorizonBlock('numbered', { text: 'Midweek check-in on Wednesday' }),
        createHorizonBlock('numbered', { text: 'Friday weekly review' }),
        createHorizonBlock('checklist', {
          text: 'Weekend stretch',
          checked: weekIndex % 2 === 0,
        }),
      ],
    },
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading2', { text: 'Fitness & routines', bold: true }),
        createHorizonBlock('paragraph', { text: 'Keep 7 hours of sleep', underline: true }),
        createHorizonBlock('bullet', { text: 'Water reminders 5×/day' }),
        createHorizonBlock('bullet', { text: 'Stretch 4 times' }),
        createHorizonBlock('checklist', { text: 'Take medicine', checked: true }),
        createHorizonBlock('checklist', {
          text: '10-minute daily wrap-up',
          checked: weekIndex % 3 !== 0,
        }),
      ],
    },
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: 'Growth goals' }),
        createHorizonBlock('paragraph', {
          text: 'Protect two deep-work blocks',
          bold: true,
          underline: true,
        }),
        createHorizonBlock('numbered', { text: 'Focus Mon/Wed mornings' }),
        createHorizonBlock('numbered', { text: 'Wrap up Thu/Fri afternoons' }),
        createHorizonBlock('bullet', { text: 'Cut distractions' }),
      ],
    },
  ],
  buildMonthly: (monthIndex) => [
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: 'Section 1', bold: true }),
        createHorizonBlock('paragraph', {
          text: 'Resilience over streak — pick up right after a miss',
          underline: true,
        }),
        createHorizonBlock('heading2', { text: 'Monthly priorities' }),
        createHorizonBlock('numbered', { text: 'About 12 books of reading' }),
        createHorizonBlock('numbered', { text: 'Exercise 16 times' }),
        createHorizonBlock('numbered', { text: 'One long review per week' }),
        createHorizonBlock('checklist', {
          text: 'Lock in week-1 routines',
          checked: monthIndex === 0,
        }),
        createHorizonBlock('checklist', {
          text: 'Mid-month check in week 3',
          checked: monthIndex !== 1,
        }),
      ],
    },
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading2', { text: 'Daily rhythm', bold: true }),
        createHorizonBlock('bullet', { text: 'Wake within ±30 minutes' }),
        createHorizonBlock('bullet', { text: 'Digital OFF before bed', underline: true }),
        createHorizonBlock('heading3', { text: 'Success bar' }),
        createHorizonBlock('paragraph', { text: '4+ completed days = a successful week' }),
      ],
    },
  ],
};

const JA: HorizonCopy = {
  emptyActivity: 'この期間の活動記録はありません。',
  activityItem: (index, label, count) => `${index}. ${label} · ${count}件`,
  formatWeekLabel: (month, weekOfMonth) => `${month}月 第${weekOfMonth}週`,
  formatMonthLabel: (year, month) => `${year}年${month}月`,
  buildWeekly: (weekIndex) => [
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: 'セクション1', bold: true }),
        createHorizonBlock('paragraph', {
          text: '朝30分の集中ルーチンを守る',
          underline: true,
        }),
        createHorizonBlock('heading3', { text: '集中項目' }),
        createHorizonBlock('bullet', { text: '読書3回以上' }),
        createHorizonBlock('bullet', { text: '勉強2回', bold: true }),
        createHorizonBlock('numbered', { text: '水曜日に中間チェック' }),
        createHorizonBlock('numbered', { text: '金曜日に週間振り返り' }),
        createHorizonBlock('checklist', {
          text: '週末ストレッチ',
          checked: weekIndex % 2 === 0,
        }),
      ],
    },
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading2', { text: '体力・ルーチン', bold: true }),
        createHorizonBlock('paragraph', { text: '睡眠7時間を維持', underline: true }),
        createHorizonBlock('bullet', { text: '水分リマインダー 5回/日' }),
        createHorizonBlock('bullet', { text: 'ストレッチ4回' }),
        createHorizonBlock('checklist', { text: '薬を用意する', checked: true }),
        createHorizonBlock('checklist', {
          text: '1日の整理10分',
          checked: weekIndex % 3 !== 0,
        }),
      ],
    },
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: '成長目標' }),
        createHorizonBlock('paragraph', {
          text: '深い作業を2ブロック確保',
          bold: true,
          underline: true,
        }),
        createHorizonBlock('numbered', { text: '月・水 午前に集中' }),
        createHorizonBlock('numbered', { text: '木・金 午後に仕上げ' }),
        createHorizonBlock('bullet', { text: '邪魔を減らす' }),
      ],
    },
  ],
  buildMonthly: (monthIndex) => [
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading1', { text: 'セクション1', bold: true }),
        createHorizonBlock('paragraph', {
          text: '継続より回復力 — 休んだ日のすぐ続きから',
          underline: true,
        }),
        createHorizonBlock('heading2', { text: '月間優先順位' }),
        createHorizonBlock('numbered', { text: '読書12冊分' }),
        createHorizonBlock('numbered', { text: '運動16回' }),
        createHorizonBlock('numbered', { text: '週1回の長い振り返り' }),
        createHorizonBlock('checklist', {
          text: '初週ルーチンを固定',
          checked: monthIndex === 0,
        }),
        createHorizonBlock('checklist', {
          text: '第3週に中間チェック',
          checked: monthIndex !== 1,
        }),
      ],
    },
    {
      version: 2,
      blocks: [
        createHorizonBlock('heading2', { text: '生活リズム', bold: true }),
        createHorizonBlock('bullet', { text: '起床時間 ±30分以内' }),
        createHorizonBlock('bullet', { text: '就寝前デジタルOFF', underline: true }),
        createHorizonBlock('heading3', { text: '完了の基準' }),
        createHorizonBlock('paragraph', { text: '週4日以上完了すれば成功の週' }),
      ],
    },
  ],
};

const BY_LOCALE: Record<AppLocale, HorizonCopy> = {
  ko: KO,
  en: EN,
  ja: JA,
};

export function getHorizonCompletionCopy(locale: AppLocale): HorizonCopy {
  return BY_LOCALE[locale] ?? EN;
}
