import { useEffect, useState } from 'react';
import { getClockNow } from '@shared/lib/time/appClock';
import { useTodayDate } from '@shared/lib/time/useTodayDate';
import { ThemedText } from '@shared/ui/themed-text';

/** Live display only; the timestamp never becomes the card's title or saved memo. */
export function HeroEmptyCardTimestamp({ color }: { color: string }) {
  const [, refresh] = useState(0);
  const now = useTodayDate();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => { refresh(value => value + 1); schedule(); }, 60_000 - getClockNow().getTime() % 60_000);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);
  const date = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return <ThemedText testID="hero-empty-card-timestamp" numberOfLines={1} style={{ flex: 1, color, fontSize: 11, lineHeight: 18 }}>{date} · {time}</ThemedText>;
}
