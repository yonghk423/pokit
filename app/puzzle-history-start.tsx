import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { Redirect } from 'expo-router';
import { PuzzleHistoryStartPage } from '@pages/puzzle-history';

export default function PuzzleHistoryStartRoute() {
  if (!FEATURE_FLAGS.puzzle) return <Redirect href="/(tabs)/day-plan" />;
  return <PuzzleHistoryStartPage />;
}
