import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import React from 'react';
import { DynamicColorIOS, Image, Platform, StyleSheet, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { DayPlanTabBridgeProvider } from '@pages/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import {
  resolveAppFontFamily,
  useAppFontSizeId,
  useEffectiveAppFontId,
} from '@shared/lib/ui-font';
import { HapticTab } from '@shared/ui/haptic-tab/HapticTab';

const TAB_ICON_SIZE = 26;

function tabIconSource(asset: ImageSourcePropType): ImageSourcePropType {
  // NativeTabs uses the source's point size rather than an Image style.
  return { ...Image.resolveAssetSource(asset), width: TAB_ICON_SIZE, height: TAB_ICON_SIZE };
}

const TAB_ICON_SOURCES: Record<string, ImageSourcePropType> = {
  'day-plan': tabIconSource(require('../../assets/tab-icons/today.webp')),
  'fixed-routines': tabIconSource(require('../../assets/tab-icons/routine.webp')),
  'puzzle-history': tabIconSource(require('../../assets/tab-icons/puzzle.webp')),
  'pokit-story': tabIconSource(require('../../assets/tab-icons/story.webp')),
};

/** 탭 라벨 고정 크기 — 글씨 크기 설정(sm/md/lg)과 무관 */
const TAB_LABEL_FONT_SIZE = 10;
const TAB_BAR_HEIGHT = 64;
const TAB_BAR_TOP_GAP = 8;
const TAB_BAR_BOTTOM_GAP = 12;

export const unstable_settings = { initialRouteName: 'day-plan' };

export default function TabLayout() {
  return (
    <DayPlanTabBridgeProvider>
      {Platform.OS === 'ios' ? <IosTabLayout /> : <FloatingTabLayout />}
    </DayPlanTabBridgeProvider>
  );
}

function IosTabLayout() {
  const { t } = useTranslation();
  const foreground = DynamicColorIOS({ light: '#151518', dark: '#FAFAFA' });

  return (
    <NativeTabs
      backgroundColor="transparent"
      blurEffect="none"
      shadowColor="transparent"
      tintColor={foreground}
      labelStyle={{ fontSize: 10, color: foreground }}
      minimizeBehavior="never">
      <NativeTabs.Trigger name="day-plan" accessibilityLabel={t('tabs.dayPlan')} disableAutomaticContentInsets>
        {/* <NativeTabs.Trigger.Label>{t('tabs.dayPlan')}</NativeTabs.Trigger.Label> */}
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon src={TAB_ICON_SOURCES['day-plan']} renderingMode="original" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="fixed-routines" accessibilityLabel={t('tabs.routines')} disableAutomaticContentInsets>
        {/* <NativeTabs.Trigger.Label>{t('tabs.routines')}</NativeTabs.Trigger.Label> */}
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon src={TAB_ICON_SOURCES['fixed-routines']} renderingMode="original" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger hidden={!FEATURE_FLAGS.puzzle} name="puzzle-history" accessibilityLabel={t('tabs.puzzle')} disableAutomaticContentInsets>
        {/* <NativeTabs.Trigger.Label>{t('tabs.puzzle')}</NativeTabs.Trigger.Label> */}
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon src={TAB_ICON_SOURCES['puzzle-history']} renderingMode="original" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="pokit-story" accessibilityLabel={t('tabs.story')} disableAutomaticContentInsets>
        {/* <NativeTabs.Trigger.Label>{t('tabs.story')}</NativeTabs.Trigger.Label> */}
        <NativeTabs.Trigger.Label hidden />
        <NativeTabs.Trigger.Icon src={TAB_ICON_SOURCES['pokit-story']} renderingMode="original" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function FloatingTabLayout() {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const bottomSpace = insets.bottom + TAB_BAR_BOTTOM_GAP;
  const { t } = useTranslation();
  const appFontId = useEffectiveAppFontId();
  const appFontSizeId = useAppFontSizeId();
  const tabLabelFontFamily = resolveAppFontFamily(appFontId, '600');

  return (
    <Tabs
        key={`${appFontId}-${appFontSizeId}`}
        initialRouteName="day-plan"
        detachInactiveScreens
        screenOptions={({ route }) => ({
          headerShown: false,
          lazy: true,
          freezeOnBlur: true,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: isDark ? '#FAFAFA' : '#000000',
          tabBarInactiveTintColor: isDark ? '#8E8E93' : '#999999',
          // tabBarLabelPosition: 'below-icon',
          tabBarShowLabel: false,
          tabBarActiveBackgroundColor: isDark ? '#38383C' : '#EEEEF0',
          // Reserve the full footprint so lists, memo controls and WebViews stay above the bar.
          tabBarStyle: [
            styles.tabBar,
            {
              height: TAB_BAR_TOP_GAP + TAB_BAR_HEIGHT + bottomSpace,
              paddingBottom: bottomSpace + 5,
              paddingLeft: Math.max(insets.left, 16) + 7,
              paddingRight: Math.max(insets.right, 16) + 7,
            },
          ],
          tabBarItemStyle: styles.tabItem,
          tabBarBackground: () => (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View
                style={[
                  styles.capsule,
                  {
                    bottom: bottomSpace,
                    left: Math.max(insets.left, 16),
                    right: Math.max(insets.right, 16),
                    backgroundColor: 'transparent',
                    borderColor: 'transparent',
                  },
                ]}
              />
            </View>
          ),
          tabBarLabelStyle: {
            fontSize: TAB_LABEL_FONT_SIZE,
            lineHeight: 14,
            ...(tabLabelFontFamily ? { fontFamily: tabLabelFontFamily } : null),
          },
          tabBarIcon: () => {
            const iconSource = TAB_ICON_SOURCES[route.name];
            return iconSource ? (
              <Image source={iconSource} style={styles.tabIcon} resizeMode="contain" />
            ) : null;
          },
        })}>
        <Tabs.Screen name="day-plan" options={{ title: t('tabs.dayPlan') }} />
        <Tabs.Screen name="fixed-routines" options={{ title: t('tabs.routines') }} />
        <Tabs.Screen name="puzzle-history" options={{ title: t('tabs.puzzle'), href: FEATURE_FLAGS.puzzle ? undefined : null }} />
        <Tabs.Screen name="pokit-story" options={{ title: t('tabs.story') }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    paddingTop: TAB_BAR_TOP_GAP + 5,
  },
  capsule: {
    position: 'absolute',
    top: TAB_BAR_TOP_GAP,
    borderRadius: TAB_BAR_HEIGHT / 2,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0,
    shadowRadius: 14,
    elevation: 0,
  },
  tabItem: {
    borderRadius: 27,
    marginHorizontal: 2,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  tabIcon: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
  },
});
