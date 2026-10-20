import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { Redirect } from 'expo-router';
import { PuzzleHistoryAlbumPage } from '@pages/puzzle-history';

export default function PuzzleHistoryAlbumRoute() {
  if (!FEATURE_FLAGS.puzzle) return <Redirect href="/(tabs)/day-plan" />;
  return <PuzzleHistoryAlbumPage />;
}
