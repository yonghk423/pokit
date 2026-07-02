export type TodoPriority = 'high' | 'medium' | 'low';

/** 투두 리스트 모드 — 사용자가 직접 적는 할 일 행 */
export type DayPlanTodoItem = {
  id: string;
  /** 할 일 내용 */
  what: string;
  /** 대상·장소·담당 */
  who: string;
  priority: TodoPriority;
  startMinutes: number;
  endMinutes: number;
  inProgress: boolean;
  isDone: boolean;
  order: number;
};

/** 새 플로우 설정 — 퀵메모 모드에서 캡처만 하다가 시간/우선순위로 옮길 수 있는 항목 */
export type DayPlanQuickMemo = {
  id: string;
  text: string;
  createdAt: number;
  isDone: boolean;
};

/**
 * 오늘 하루 일정(타임라인)의 최소 단위.
 * Day Plan 화면과 Activity Session이 같은 배열을 공유합니다.
 */
export type DayPlanBlock = {
  id: string;
  title: string;
  category: string;
  /** 우선순위·사용자 플로우 등 내부 키(`customFlow:…`). 없으면 `category` 문자열로 역추적 */
  categoryKey?: string;
  /**
   * 하루 기준 분 단위 (0 = 00:00, 7:30 = 450).
   * endMinutes > startMinutes 인 구간을 기대합니다.
   */
  startMinutes: number;
  endMinutes: number;
  /**
   * true면 `endMinutes`는 시작일 **다음 날**의 시각(0~1439)입니다.
   * (예: 당일 13:00 ~ 익일 01:00)
   */
  endsNextCalendarDay?: boolean;
  /** 타임라인 표시 순서 */
  order: number;
  /**
   * 블록 생성 출처.
   * - `quickMemo`: 빠른 메모 저장 블록(메모 전용 표시)
   * - `prioritySession`: 우선순위 시작 시 내부 세션/동기화용 블록(타임라인 행에는 노출하지 않음)
   */
  blockOrigin?: 'quickMemo' | 'prioritySession';
};
