import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { HeroCardToolsProvider } from '../../src/pages/day-plan/model/heroCardToolsPortal';
import { HeroCharacterPickerActionProvider } from '../../src/pages/day-plan/model/heroCharacterPickerAction';

import { Tabs } from 'expo-router';

import { DayPlanCustomTabBar, DayPlanTabBridgeProvider } from '@pages/day-plan';
import { useTranslation } from '@shared/lib/i18n';

export const unstable_settings = { initialRouteName: 'index' };

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <DayPlanTabBridgeProvider><HeroCardToolsProvider><HeroCharacterPickerActionProvider>
      <Tabs
        initialRouteName="index"
        detachInactiveScreens
        tabBar={(props) => <DayPlanCustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}>
        <Tabs.Screen name="index" options={{ title: t('tabs.comicDay') }} />
        <Tabs.Screen
          name="fixed-routines"
          options={{ title: t('tabs.routines'), href: FEATURE_FLAGS.routinesManageTab ? undefined : null }}
        />
        <Tabs.Screen
          name="puzzle-history"
          options={{ title: t('tabs.puzzle'), href: FEATURE_FLAGS.puzzle ? undefined : null }}
        />
        <Tabs.Screen name="pokit-story" options={{ title: t('tabs.story') }} />
      </Tabs>
    </HeroCharacterPickerActionProvider></HeroCardToolsProvider></DayPlanTabBridgeProvider>
  );
}
