import { DayPlanPage, DayPlanTabScreenShell } from '@pages/day-plan';
import { RoutineInlineSettingsPanel } from '@pages/goal-detail-settings';

export default function DayPlanTabScreen() {
  return (
    <DayPlanTabScreenShell>
      <DayPlanPage
        renderRoutineInlineSettings={(categoryKey, theme) => (
          <RoutineInlineSettingsPanel
            categoryKey={categoryKey}
            ink={theme.ink}
            muted={theme.muted}
            border={theme.border}
            isDark={theme.isDark}
            lockRename
          />
        )}
      />
    </DayPlanTabScreenShell>
  );
}
