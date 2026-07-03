import type { DayPlanBlock } from '../model/types';

export type SpineTimelineAnchorRow = {
  kind: 'anchor';
  role: 'dayStart' | 'dayEnd';
  minutes: number;
  label: string;
};

export type SpineTimelineBlockRow = {
  kind: 'block';
  block: DayPlanBlock;
  startMinutes: number;
  endMinutes: number;
};

export type SpineTimelineGapRow = {
  kind: 'gap';
  fromMinutes: number;
  toMinutes: number;
  durationMin: number;
  coachingLine: string;
  /** 갭 안에 현재 시각이 있을 때 좌측 눈금용 */
  nowMinutes?: number;
};

export type SpineTimelineRow =
  | SpineTimelineAnchorRow
  | SpineTimelineBlockRow
  | SpineTimelineGapRow;
