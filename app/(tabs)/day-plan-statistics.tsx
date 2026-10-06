import { DayPlanTabScreenShell } from '@pages/day-plan';
import { DayPlanStatisticsPage } from '@pages/day-plan-statistics';
import { freezeHeavyTabScreen } from '@shared/ui/freeze-heavy-tab-screen';

const FrozenDayPlanStatisticsPage = freezeHeavyTabScreen(DayPlanStatisticsPage);

export default function DayPlanStatisticsTab() {
  return (
    <DayPlanTabScreenShell>
      <FrozenDayPlanStatisticsPage />
    </DayPlanTabScreenShell>
  );
}
