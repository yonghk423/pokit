import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { NativeTabContent } from '@shared/ui/native-tab-content';
import { DayPlanTabScreenShell, FixedRoutinePage } from '@pages/day-plan';
import { DayPlanStatisticsPage } from '@pages/day-plan-statistics';
import { freezeHeavyTabScreen } from '@shared/ui/freeze-heavy-tab-screen';
import { Redirect } from 'expo-router';

const FrozenFixedRoutinePage = freezeHeavyTabScreen(FixedRoutinePage);

export default function FixedRoutinesTabScreen() {
  if (!FEATURE_FLAGS.routinesManageTab) return <Redirect href="/day-plan" />;
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
