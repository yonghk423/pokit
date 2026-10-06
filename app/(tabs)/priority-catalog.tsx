import { DayPlanTabScreenShell, PriorityCatalogPage } from '@pages/day-plan';
import { freezeHeavyTabScreen } from '@shared/ui/freeze-heavy-tab-screen';

const FrozenPriorityCatalogPage = freezeHeavyTabScreen(PriorityCatalogPage);

export default function PriorityCatalogTabScreen() {
  return (
    <DayPlanTabScreenShell>
      <FrozenPriorityCatalogPage />
    </DayPlanTabScreenShell>
  );
}
