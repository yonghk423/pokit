import type { ReactNode } from 'react';

import type { PriorityMarkColorId } from '@entities/day-plan';

export type PriorityOrderRowProps = {
  categoryKey: string;
  icon: string;
  label: string;
  /** 목표 상세에서 온 부가 한 줄 */
  subtitle?: string | null;
  /** 루틴 요약 — 접힌 목록에서도 표시 */
  summaryHint?: string | null;
  /** 부제(시간) 옆 시계 — 탭하면 시간 설정 */
  onEditTime?: () => void;
  /** 중요도 표시 색 — 미설정 시 표시 없음 */
  itemMarkColor?: PriorityMarkColorId | null;
  /** 색 스와치에서 직접 선택 (null = 표시 해제) */
  onSelectItemMarkColor?: (color: PriorityMarkColorId | null) => void;
  isFocusStarted?: boolean;
  isCompleted?: boolean;
  isDark: boolean;
  ink: string;
  inkMuted: string;
  line: string;
  /** 집중 중 완료 라디오 — 탭 시 완료 ↔ 완료 취소 */
  onToggleFocusComplete?: () => void;
  /** 길게 눌러 본문 드래그 후 손 뗄 때 y 이동(px) — 메인 담기 순서 변경 */
  onReorderDragTranslationEnd?: (translationY: number) => void;
  /** 드래그 중 y 이동(px) — 다른 행이 즉시 비켜가도록 실시간 순서 반영 */
  onReorderDragTranslationChange?: (translationY: number) => void;
  /** 드래그 중 스크롤 잠금 등 */
  onReorderDragActiveChange?: (active: boolean) => void;
  onSettings?: () => void;
  onFocusDetail?: () => void;
  /** 오늘 담기 목록에서 완전 종료 — 구간 만료와 같이 목록에서 제거 */
  onFinishForToday?: () => void;
  animateOnMount?: boolean;
  /** 행 아코디언 펼침 — 액션 열 브루탈 › 버튼 */
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** 펼침 패널 — pages에서 조립한 노트 스타일 콘텐츠 */
  expandedContent?: ReactNode;
};
