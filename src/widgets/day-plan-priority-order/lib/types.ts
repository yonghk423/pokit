export type PriorityOrderRowProps = {
  categoryKey: string;
  icon: string;
  label: string;
  /** 목표 상세에서 온 부가 한 줄 */
  subtitle?: string | null;
  priorityLabel?: string;
  isTopPriority?: boolean;
  priorityColor?: { bg: string; fg: string };
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
  animateOnMount?: boolean;
};
