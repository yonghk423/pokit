import { useHeroTabArtwork } from '../../src/pages/day-plan/model/heroTabArtwork';
import { DynamicColorIOS, Image, Platform, type ImageSourcePropType } from 'react-native';
import * as Haptics from 'expo-haptics';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';

import { Tabs } from 'expo-router';

import { DayPlanCustomTabBar, DayPlanTabBridgeProvider } from '@pages/day-plan';
import { useTranslation } from '@shared/lib/i18n';

export const unstable_settings = { initialRouteName: 'comic-day' };

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <DayPlanTabBridgeProvider>
      {Platform.OS === 'ios' ? <IosTabLayout /> : <Tabs
        initialRouteName="comic-day"
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
        <Tabs.Screen name="comic-day" options={{ title: t('tabs.comicDay') }} />
        <Tabs.Screen
          name="fixed-routines"
          options={{ title: t('tabs.routines'), href: FEATURE_FLAGS.routinesManageTab ? undefined : null }}
        />
        <Tabs.Screen
          name="puzzle-history"
          options={{ title: t('tabs.puzzle'), href: FEATURE_FLAGS.puzzle ? undefined : null }}
        />
        <Tabs.Screen name="pokit-story" options={{ title: t('tabs.story') }} />
      </Tabs>}
    </DayPlanTabBridgeProvider>
  );
}


const NATIVE_TAB_ITEMS = [
  { name: 'comic-day', label: 'tabs.comicDay', icon: require('../../assets/tab-icons/comic-portrait-v2.webp'), hidden: false },
  { name: 'fixed-routines', label: 'tabs.routines', icon: require('../../assets/tab-icons/routine.webp'), hidden: !FEATURE_FLAGS.routinesManageTab },
  { name: 'puzzle-history', label: 'tabs.puzzle', icon: require('../../assets/tab-icons/puzzle.webp'), hidden: !FEATURE_FLAGS.puzzle },
  { name: 'pokit-story', label: 'tabs.story', icon: require('../../assets/tab-icons/story-pen.png'), hidden: false },
] as const;

function nativeTabIcon(asset: ImageSourcePropType): ImageSourcePropType {
  return { ...Image.resolveAssetSource(asset), width: 26, height: 26 };
}

function IosTabLayout() {
  const heroArtwork = useHeroTabArtwork(state => state.source);
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const canvas = isDark ? '#262B28' : '#F7F6F4';
  const foreground = DynamicColorIOS({ light: '#151518', dark: '#FAFAFA' });
  return <NativeTabs tintColor={foreground} labelStyle={{ color: foreground }} minimizeBehavior="never" disableTransparentOnScrollEdge
    unstable_nativeProps={{ nativeContainerStyle: { backgroundColor: canvas } }}>
    {NATIVE_TAB_ITEMS.map(item => <NativeTabs.Trigger key={item.name} name={item.name} hidden={item.hidden}
      accessibilityLabel={t(item.label)} disableAutomaticContentInsets contentStyle={{ backgroundColor: canvas }}
      listeners={{ tabPress: () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}>
      <NativeTabs.Trigger.Label hidden />
      <NativeTabs.Trigger.Icon src={nativeTabIcon(item.name === 'comic-day' ? heroArtwork : item.icon)} renderingMode="original" />
    </NativeTabs.Trigger>)}
  </NativeTabs>;
}
