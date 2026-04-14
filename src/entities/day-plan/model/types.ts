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
  /** 빠른 메모 저장으로만 만들어진 블록 — 잠금화면 전용 레이아웃에 사용 */
  blockOrigin?: 'quickMemo';
};

export type DayPlanStartNotificationTiming = '5min' | 'atStart';

export type DayPlanNotificationSettings = {
  startEnabled: boolean;
  endEnabled: boolean;
  startTiming: DayPlanStartNotificationTiming;
};
