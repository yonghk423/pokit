import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'react-native';
import { freePhotoCalendar } from '../../src/pages/day-plan/model/freePhotoCalendars';
import { useHeroCalendarDesign, useCalendarBackdropVisible } from '../../src/pages/day-plan/model/heroCalendarDesign';
import { View } from 'react-native';
import { useContext } from 'react';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { HeroCardToolsProvider } from '../../src/pages/day-plan/model/heroCardToolsPortal';
import { HeroCharacterPickerActionContext, HeroCharacterPickerActionProvider } from '../../src/pages/day-plan/model/heroCharacterPickerAction';

import { Tabs, useSegments } from 'expo-router';

import { DayPlanCustomTabBar, DayPlanTabBridgeProvider } from '@pages/day-plan';
import { useTranslation } from '@shared/lib/i18n';

export const unstable_settings = { initialRouteName: 'index' };

function TabWallpaper() {
  const insets = useSafeAreaInsets();
  const calendarVisible = useCalendarBackdropVisible();
  const photoCalendar = freePhotoCalendar(useHeroCalendarDesign());
  const photoActive = useContext(HeroCharacterPickerActionContext)?.photoActive;
  const segments = useSegments();
  const home = segments.every(segment => segment === '(tabs)');
  if (photoActive && home) return null;
  return <>
    {home && calendarVisible ? <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: photoCalendar?.id === 'cream-kitten' ? '#D8CDBB' : '#FAFAF6' }}>{photoCalendar && <Image source={photoCalendar.background} resizeMode="cover" style={{ position: 'absolute', width: '100%', height: '100%', left: 0, right: 0, top: photoCalendar.id === 'cream-kitten' ? Math.max(0, insets.top - 28) : 0 }} />}</View> : null}
  </>;
}

export default function TabLayout() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const segments = useSegments();
  const tabBackground = isDark ? '#262B28' : '#F7F6F4';

  return (
    <DayPlanTabBridgeProvider><HeroCardToolsProvider><HeroCharacterPickerActionProvider>
      <View style={{ flex: 1, backgroundColor: tabBackground }}>
      <TabWallpaper />
      <Tabs
        initialRouteName="index"
        // Keep native scene visibility in sync with the custom camera/home tabs.
        detachInactiveScreens={false}
        tabBar={(props) => <DayPlanCustomTabBar {...props} />}
        screenOptions={{
          animation: 'none',
          headerShown: false,
          sceneStyle: { backgroundColor: 'transparent' },
          lazy: true,
          freezeOnBlur: false,
          tabBarStyle: {
            backgroundColor: 'transparent',
            borderTopWidth: 0,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}>
        <Tabs.Screen name="index" options={{ title: t('tabs.comicDay') }} />
        <Tabs.Screen name="calendar" options={{ title: t('tabs.calendar'), lazy: false, animation: 'none' }} />
        <Tabs.Screen name="history" options={{ title: 'Archive' }} />
        <Tabs.Screen
          name="fixed-routines"
          options={{ title: t('tabs.routines'), href: FEATURE_FLAGS.routinesManageTab ? undefined : null }}
        />
        <Tabs.Screen
          name="puzzle-history"
          options={{ title: t('tabs.puzzle'), href: FEATURE_FLAGS.puzzle ? undefined : null }}
        />
        <Tabs.Screen name="pokit-story" options={{ title: t('tabs.story'), href: FEATURE_FLAGS.pokitStory ? undefined : null }} />
      </Tabs>
      </View>
    </HeroCharacterPickerActionProvider></HeroCardToolsProvider></DayPlanTabBridgeProvider>
  );
}
