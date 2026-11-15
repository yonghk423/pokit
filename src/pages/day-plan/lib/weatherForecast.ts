export type ForecastDay = { date: string; high: number; low: number; icon: string };
type ForecastResponse = { city?: { timezone?: number }; list?: { dt: number; main?: { temp_min?: number; temp_max?: number }; weather?: { icon?: string }[] }[] };
/** Range of forecast samples in the location's calendar day, not the device timezone. */
export function weatherForecastDays(data: ForecastResponse, now = Date.now()): ForecastDay[] {
  const offset = (data.city?.timezone ?? 0) * 1000;
  const dateKey = (time: number) => new Date(time + offset).toISOString().slice(0, 10);
  const today = dateKey(now);
  const days = new Map<string, ForecastDay>();
  for (const entry of data.list ?? []) {
    const date = dateKey(entry.dt * 1000);
    const low = entry.main?.temp_min, high = entry.main?.temp_max;
    if (date < today || !Number.isFinite(low) || !Number.isFinite(high)) continue;
    const current = days.get(date);
    days.set(date, { date, low: Math.min(current?.low ?? Infinity, low!), high: Math.max(current?.high ?? -Infinity, high!), icon: current?.icon ?? entry.weather?.[0]?.icon ?? '' });
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
}
