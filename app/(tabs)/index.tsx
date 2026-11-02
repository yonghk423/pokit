import { useIsFocused } from 'expo-router';
import { DayPlanTabFocusContext } from '../../src/pages/day-plan/model/dayPlanTabFocus';
import { NativeTabContent } from '@shared/ui/native-tab-content';
import { ComicDayPage, DayPlanTabScreenShell } from '@pages/day-plan';
import { freezeHeavyTabScreen } from '@shared/ui/freeze-heavy-tab-screen';

const FrozenComicDayPage = freezeHeavyTabScreen(ComicDayPage);

export default function ComicDayTabScreen() {
  const focused = useIsFocused();
  return (
    <DayPlanTabFocusContext.Provider value={focused}><NativeTabContent>
      <DayPlanTabScreenShell tabName="comic-day">
        <FrozenComicDayPage />
      </DayPlanTabScreenShell>
    </NativeTabContent></DayPlanTabFocusContext.Provider>
  );
}
