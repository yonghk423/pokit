import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { Redirect } from 'expo-router';
import { NativeTabContent } from '@shared/ui/native-tab-content';
import { DayPlanTabScreenShell } from '@pages/day-plan';
import { PuzzleHistoryTabPage } from '@pages/puzzle-history';
import { freezeHeavyTabScreen } from '@shared/ui/freeze-heavy-tab-screen';

const FrozenPuzzleHistoryTabPage = freezeHeavyTabScreen(PuzzleHistoryTabPage);

export default function PuzzleHistoryTab() {
  if (!FEATURE_FLAGS.puzzle) return <Redirect href="/(tabs)/day-plan" />;
  return (
    <NativeTabContent>
      <DayPlanTabScreenShell>
        <FrozenPuzzleHistoryTabPage />
      </DayPlanTabScreenShell>
    </NativeTabContent>
  );
}
