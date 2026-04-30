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
  work: '작업',
  reading: '독서',
  meditation: '명상',
  yoga: '요가',
  fasting: '체중 관리',
  water: '수분',
  medicine: '약 복용',
  other: '기타',
  study: '공부·학습',
  stretching: '스트레칭',
  straightenBack: '바른 자세',
  neckPosture: '목·자세',
  planning: '하루·주간 정리',
  writing: '글쓰기',
  journal: '일기',
  language: '언어 학습',
  creative: '창작·아이디어',
  inbox: '메일·소통 정리',
};

export function categoryReminderLabelKo(key: string): string {
  if (isCustomFlowCategoryKey(key)) return '나만의 플로우';
  return LABELS[key] ?? key;
}
