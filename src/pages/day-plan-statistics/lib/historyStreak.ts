/**
 * 완료 일(boolean[])에서 연속 스트릭을 계산합니다.
 * upToIndex 포함해 끝에서부터 역순으로 셉니다.
 */
export function countTrailingStreak(dayDone: readonly boolean[], upToIndex?: number): number {
  if (dayDone.length === 0) return 0;
  const end =
    typeof upToIndex === 'number'
      ? Math.min(Math.max(0, Math.floor(upToIndex)), dayDone.length - 1)
      : dayDone.length - 1;
  let streak = 0;
  for (let i = end; i >= 0; i -= 1) {
    if (!dayDone[i]) break;
    streak += 1;
  }
  return streak;
}

/** 구간 안 최장 연속 완료 일수 */
export function countBestStreak(dayDone: readonly boolean[]): number {
  let best = 0;
  let current = 0;
  for (const done of dayDone) {
    if (done) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}

/**
 * 표시용 스트릭: 현재(또는 기간 끝) 연속이 2 이상이면 그걸,
 * 아니면 기간 내 최장 연속이 2 이상일 때 best를 씁니다.
 */
export function resolveDisplayStreak(dayDone: readonly boolean[], upToIndex?: number): number {
  const trailing = countTrailingStreak(dayDone, upToIndex);
  if (trailing >= 2) return trailing;
  const best = countBestStreak(dayDone);
  return best >= 2 ? best : trailing >= 1 ? trailing : 0;
}
