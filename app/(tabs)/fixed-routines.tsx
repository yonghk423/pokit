import { NativeTabContent } from '@shared/ui/native-tab-content';
import { DayPlanTabScreenShell, FixedRoutinePage } from '@pages/day-plan';
import { DayPlanStatisticsPage } from '@pages/day-plan-statistics';
import { freezeHeavyTabScreen } from '@shared/ui/freeze-heavy-tab-screen';

const FrozenFixedRoutinePage = freezeHeavyTabScreen(FixedRoutinePage);

export default function FixedRoutinesTabScreen() {
  return (
    <NativeTabContent>
      <DayPlanTabScreenShell>
        <FrozenFixedRoutinePage
          historyContent={<DayPlanStatisticsPage embedded />}
        />
      </DayPlanTabScreenShell>
    </NativeTabContent>
  );
}
