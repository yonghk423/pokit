import { DayPlanTabScreenShell } from '@pages/day-plan';
import { PuzzleHistoryTabPage } from '@pages/puzzle-history';
import { freezeHeavyTabScreen } from '@shared/ui/freeze-heavy-tab-screen';

const FrozenPuzzleHistoryTabPage = freezeHeavyTabScreen(PuzzleHistoryTabPage);

export default function PuzzleHistoryTab() {
  return (
    <DayPlanTabScreenShell>
      <FrozenPuzzleHistoryTabPage />
    </DayPlanTabScreenShell>
  );
}
