import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { Redirect } from 'expo-router';
import { PuzzleGuidePage } from '@pages/puzzle-guide';

export default function PuzzleGuideRoute() {
  if (!FEATURE_FLAGS.puzzle) return <Redirect href="/(tabs)/day-plan" />;
  return <PuzzleGuidePage />;
}
