/** Time-free routines follow the scheduled routines, retaining their list order. */
export function orderCircularRoutines<T extends { startMinutes?: number; startsNextDay?: boolean }>(items: readonly T[]): T[] {
  return items.map((item, index) => ({ item, index })).sort((a, b) => {
    const time = (item: T) => item.startMinutes == null
      ? Number.POSITIVE_INFINITY
      : item.startMinutes + (item.startsNextDay ? 1440 : 0);
    return time(a.item) - time(b.item) || a.index - b.index;
  }).map(({ item }) => item);
}
