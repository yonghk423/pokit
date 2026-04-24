import type { WaterDetailDataConfig } from './goalCategorySessionConfig';
import { parseHHmmToMinutes } from './parseTime';
import { isOvernightPriorityWindow } from './priorityRoutineWindow';

export function waterReminderIntervalMinutes(
  cfg: Pick<WaterDetailDataConfig, 'reminderPreset' | 'reminderCustomMin'>,
): number {
  if (cfg.reminderPreset === '60') return 60;
  if (cfg.reminderPreset === '120') return 120;
  return Math.max(15, Math.min(24 * 60, Math.round(cfg.reminderCustomMin)));
}

export type WaterRoutineReminderSlot = {
  /** 담기 구간을 자정 넘김까지 이어 붙인 타임라인 순서 */
  sortKey: number;
  /** 0..1439 벽시계 분 (Expo 매일 알림 시·분) */
  wallMinuteOfDay: number;
};

/**
 * 담기 루틴 시작~마무리 구간 안에서 `intervalMinutes`마다 알림 시각을 만듭니다.
 * 자정을 넘기는 구간은 `isOvernightPriorityWindow`와 동일 규칙입니다.
 */
export function buildWaterRoutineReminderSlots(options: {
  routineStartHhmm: string;
  routineEndHhmm: string;
  intervalMinutes: number;
}): WaterRoutineReminderSlot[] {
  const ps = parseHHmmToMinutes(options.routineStartHhmm.trim());
  const pe = parseHHmmToMinutes(options.routineEndHhmm.trim());
  const step = Math.max(1, Math.floor(options.intervalMinutes));
  if (ps === null || pe === null || step < 1) return [];
  if (pe === ps) return [];

  const overnight = isOvernightPriorityWindow(
    options.routineStartHhmm,
    options.routineEndHhmm,
  );
  const endV = overnight ? pe + 24 * 60 : pe;

  const seenWall = new Set<number>();
  const out: WaterRoutineReminderSlot[] = [];

  for (let t = ps; t <= endV; t += step) {
    const wall = t % (24 * 60);
    if (seenWall.has(wall)) continue;
    seenWall.add(wall);
    out.push({ sortKey: t, wallMinuteOfDay: wall });
  }

  out.sort((a, b) => a.sortKey - b.sortKey);
  return out;
}
