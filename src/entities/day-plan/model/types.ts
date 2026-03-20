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
  /** 타임라인 표시 순서 */
  order: number;
};
