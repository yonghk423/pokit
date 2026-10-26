import { useIsFocused, useRouter } from 'expo-router';
import { DayPlanTabFocusContext } from '../src/pages/day-plan/model/dayPlanTabFocus';
import { NativeTabContent } from '@shared/ui/native-tab-content';
import { DayPlanPage, DayPlanTabScreenShell, DayPlanTabBridgeProvider } from '@pages/day-plan';
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

export default function DayPlanBagScreen() {
  const focused = useIsFocused();
  const router = useRouter();
  const close = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/comic-day'); };
  return (
    <DayPlanTabBridgeProvider><DayPlanTabFocusContext.Provider value={focused}><NativeTabContent >
      <DayPlanTabScreenShell tabName="day-plan" onClose={close}>
        <FrozenDayPlanPage renderRoutineInlineSettings={renderRoutineInlineSettings} />
      </DayPlanTabScreenShell>
    </NativeTabContent></DayPlanTabFocusContext.Provider></DayPlanTabBridgeProvider>
  );
}
