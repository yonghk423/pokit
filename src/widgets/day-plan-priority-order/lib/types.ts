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
  onSettings?: () => void;
  onFocusDetail?: () => void;
  animateOnMount?: boolean;
};
