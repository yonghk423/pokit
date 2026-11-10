import { Redirect, useLocalSearchParams } from 'expo-router';

/** Compatibility for widget links; the calendar widget also restores the calendar view. */
export default function LegacyComicDayLink() {
  const { calendarWidget } = useLocalSearchParams<{ calendarWidget?: string }>();
  return <Redirect href={calendarWidget === '1' ? { pathname: '/(tabs)', params: { calendarWidget: '1' } } : '/(tabs)'} />;
}
