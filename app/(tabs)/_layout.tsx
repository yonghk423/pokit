import { AppWallpaperBackground } from '@shared/ui/app-wallpaper';
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
  const photoActive = useContext(HeroCharacterPickerActionContext)?.photoActive;
  const segments = useSegments();
  const home = segments.every(segment => segment === '(tabs)');
  return photoActive && home ? null : <AppWallpaperBackground />;
}

export default function TabLayout() {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';

  return (
    <DayPlanTabBridgeProvider><HeroCardToolsProvider><HeroCharacterPickerActionProvider>
      <View style={{ flex: 1, backgroundColor: isDark ? '#262B28' : '#F7F6F4' }}>
      <TabWallpaper />
      <Tabs
        initialRouteName="index"
        // Keep native scene visibility in sync with the custom camera/home tabs.
        detachInactiveScreens={false}
        tabBar={(props) => <DayPlanCustomTabBar {...props} />}
        screenOptions={{
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
        <Tabs.Screen name="characters" options={{ title: t('comicDay.gallery.title') }} />
        <Tabs.Screen name="history" options={{ title: t('comicDiary.history') }} />
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
