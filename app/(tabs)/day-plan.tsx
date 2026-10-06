import { DayPlanPage, DayPlanTabScreenShell } from '@pages/day-plan';
import { RoutineInlineSettingsPanel } from '@pages/goal-detail-settings';
import { freezeHeavyTabScreen } from '@shared/ui/freeze-heavy-tab-screen';

const FrozenDayPlanPage = freezeHeavyTabScreen(DayPlanPage);

function renderRoutineInlineSettings(
  categoryKey: string,
  theme: { ink: string; muted: string; border: string; isDark: boolean },
) {
  return (
    <RoutineInlineSettingsPanel
      categoryKey={categoryKey}
      ink={theme.ink}
      muted={theme.muted}
      border={theme.border}
      isDark={theme.isDark}
    />
  );
}

export default function DayPlanTabScreen() {
  return (
    <DayPlanTabScreenShell>
      <FrozenDayPlanPage renderRoutineInlineSettings={renderRoutineInlineSettings} />
    </DayPlanTabScreenShell>
  );
}
