import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { Redirect } from 'expo-router';
import { PuzzleHistoryDetailPage } from '@pages/puzzle-history';

export default function PuzzleHistoryDetailRoute() {
  if (!FEATURE_FLAGS.puzzle) return <Redirect href="/day-plan" />;
  return <PuzzleHistoryDetailPage />;
}
