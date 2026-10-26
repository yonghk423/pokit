import { Redirect } from 'expo-router';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { DailyRhythmSettingsPage } from '@pages/day-plan';

export default function DailyRhythmSettingsRoute() {
  if (!FEATURE_FLAGS.dailyRhythmWindow) return <Redirect href="/day-plan" />;
  return <DailyRhythmSettingsPage />;
}
