import { resolveCustomFlowCatalogIcon } from '@shared/lib/storage';

import { isCustomFlowCategoryKey } from './customFlowCategoryKey';
import { GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS } from './goalDetailChecklistCategoryKeys';

/** 카테고리별 반복 알림 설정 UI·스케줄에 쓰는 키 순서 */
export const CATEGORY_REMINDER_KEYS = [
  'work',
  'reading',
  'meditation',
  'yoga',
  'fasting',
  'water',
  'medicine',
  'other',
  ...GOAL_DETAIL_CHECKLIST_DERIVED_CATEGORY_KEYS,
] as const;

export type CategoryReminderCatalogKey = (typeof CATEGORY_REMINDER_KEYS)[number];

const LABELS: Record<string, string> = {
  water: '수분',
  medicine: '약 복용',
  vitamins: '영양제',
  fasting: '체중 관리',
  stretching: '스트레칭',
  straightenBack: '바른 자세',
  neckPosture: '목·자세',
  posture: '자세 교정',
  meditation: '명상',
  workout: '운동',
  walking: '산책',
  yoga: '요가',
  sleep: '수면 관리',
  breathing: '호흡 운동',
  skincare: '피부 관리',
  eyerest: '눈 휴식',
  reading: '독서',
  study: '공부·학습',
  planning: '하루·주간 정리',
  writing: '글쓰기',
  language: '언어 학습',
  creative: '창작·아이디어',
  deepwork: '딥 워크',
  journal: '일기',
  pomodoro: '포모도로',
  review: '회고·복습',
  news: '뉴스·정보',
  organize: '정리정돈',
  podcast: '팟캐스트',
  inbox: '메일·소통 정리',
  work: '업무 집중',
  coding: '코딩·개발',
  other: '기타',
};

/** SF Symbol 이름 — 담기·데이플랜 카탈로그와 동일 매핑 */
const ICONS: Record<string, string> = {
  water: 'drop.fill',
  medicine: 'cross.case.fill',
  vitamins: 'pill.fill',
  fasting: 'figure.stand',
  stretching: 'figure.run',
  straightenBack: 'figure.yoga',
  neckPosture: 'tortoise.fill',
  posture: 'figure.stand.line.dotted.figure.stand',
  meditation: 'brain.head.profile',
  workout: 'dumbbell.fill',
  walking: 'figure.walk',
  yoga: 'figure.mind.and.body',
  sleep: 'moon.fill',
  breathing: 'wind',
  skincare: 'sparkles',
  eyerest: 'eye',
  reading: 'book.fill',
  study: 'graduationcap.fill',
  planning: 'calendar.badge.clock',
  writing: 'square.and.pencil',
  language: 'character.bubble',
  creative: 'paintpalette.fill',
  deepwork: 'brain',
  journal: 'book.closed.fill',
  pomodoro: 'timer',
  review: 'arrow.counterclockwise',
  news: 'newspaper.fill',
  organize: 'tray.and.arrow.down.fill',
  podcast: 'headphones',
  inbox: 'tray.2.fill',
  work: 'bag.fill',
  coding: 'chevron.left.forwardslash.chevron.right',
  other: 'person.fill',
};

export function categoryReminderLabelKo(key: string): string {
  if (isCustomFlowCategoryKey(key)) return '나만의 플로우';
  return LABELS[key] ?? key;
}

export function categoryReminderIconName(key: string): string {
  if (isCustomFlowCategoryKey(key)) return resolveCustomFlowCatalogIcon(key);
  return ICONS[key] ?? 'star.fill';
}
