import type { ReadingLiveActivityConfig } from '@entities/day-plan';

export type PokitLiveActivityStatus = 'active' | 'paused' | 'standby' | 'finished';

export type PokitLiveActivityChecklistRowState =
  | 'completed'
  | 'current'
  | 'upcoming'
  | 'skipped';

export type PokitLiveActivityChecklistRow = {
  blockId: string;
  title: string;
  timeLabel: string;
  state: PokitLiveActivityChecklistRowState;
};

export type PokitLiveActivityPlanMode = 'time' | 'priority' | 'quickMemo';

export type PriorityLiveActivityUpcomingRow = {
  order: number;
  title: string;
  timeLabel: string;
};

export type PriorityLiveActivityContent = {
  windowLabel: string;
  activeTitle: string;
  activeOrder: number;
  totalTasks: number;
  /** 블록 구간 내 진행 0~1 (링·활성 할 일 인덱스에 사용) */
  progress01: number;
  upcoming: PriorityLiveActivityUpcomingRow[];
  /** 복합 블록 전체 줄(순서·시간). 잠금화면에서 최대 4줄 + 생략 표시에 사용 */
  listRows: PriorityLiveActivityUpcomingRow[];
};

/** 빠른 메모로 저장된 블록 전용 잠금화면 카드(타이머 없음) */
export type QuickMemoLiveActivityContent = {
  /** 번호 제거 후 줄 단위 본문 */
  bodyText: string;
  /** 세션 상태만 표시 — `진행 중` / `일시정지` / `시작 대기` / `완료` */
  statusLabel: string;
};

export type PokitLiveActivityPayload = {
  blockId: string;
  title: string;
  category: string;
  categoryKey: string | null;
  timeRangeLabel: string;
  totalSeconds: number;
  pausedRemainingSeconds: number | null;
  endsAtIso: string | null;
  startsAtIso: string | null;
  status: PokitLiveActivityStatus;
  readingDataConfig: ReadingLiveActivityConfig | null;
  checklistTitle: string;
  checklistCountLabel: string;
  checklistRows: PokitLiveActivityChecklistRow[];
  checklistSummaryLine1: string;
  checklistSummaryLine2: string;
  /** `priority` 일 때 `priorityLive`, `quickMemo` 일 때 `quickMemoLive` */
  planMode: PokitLiveActivityPlanMode;
  priorityLive: PriorityLiveActivityContent | null;
  quickMemoLive: QuickMemoLiveActivityContent | null;
};
