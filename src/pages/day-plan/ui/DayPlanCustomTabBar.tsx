import { HeroThumbnailStripToggle } from './HeroThumbnailStripToggle';
import { HeroCharacterPickerActionContext } from '../model/heroCharacterPickerAction';
import { useHeroTabArtwork } from '../model/heroTabArtwork';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from 'expo-router/js-tabs';
import * as Haptics from 'expo-haptics';
import { Fragment, useCallback, useContext, useEffect, useMemo } from 'react';
import { HeroPhotoEntryIcon } from './HeroPhotoEntryIcon';
import { Image, LayoutChangeEvent, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';

import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';

export const DAY_PLAN_TAB_BAR_ROW_HEIGHT = 56;
const TAB_ICON_SIZE = 26;

const IOS_HOME_INDICATOR_FALLBACK = 34;

export function tabBarScrollBottomInset(_safeBottomInset: number, endGapPx = 6): number {
  return endGapPx;
}

type TabDef = {
  route: string;
  icon: ImageSourcePropType;
  labelKey: I18nKey;
};

const TABS: TabDef[] = [
  { route: 'index', icon: require('../../../../assets/tab-icons/comic-portrait-v2.webp'), labelKey: 'tabs.comicDay' },
  { route: 'fixed-routines', icon: require('../../../../assets/tab-icons/routine.webp'), labelKey: 'tabs.routines' },
  { route: 'puzzle-history', icon: require('../../../../assets/tab-icons/puzzle.webp'), labelKey: 'tabs.puzzle' },
  { route: 'pokit-story', icon: require('../../../../assets/tab-icons/story-pen.png'), labelKey: 'tabs.story' },
];

export function DayPlanCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const characterPicker = useContext(HeroCharacterPickerActionContext);
  const heroArtwork = useHeroTabArtwork(state => state.source);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const onTabBarHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bridge = useDayPlanTabBridge();
  const registerTabBarHeight = bridge.registerTabBarHeight;

  const safeBottom = useMemo(() => {
    const b = insets.bottom;
    if (Number.isFinite(b) && b > 0) return b;
    return Platform.OS === 'ios' ? IOS_HOME_INDICATOR_FALLBACK : 0;
  }, [insets.bottom]);

  const estimatedHeight = DAY_PLAN_TAB_BAR_ROW_HEIGHT + safeBottom + 20;

  useEffect(() => {
    onTabBarHeightChange?.(estimatedHeight);
    registerTabBarHeight(estimatedHeight);
  }, [estimatedHeight, onTabBarHeightChange, registerTabBarHeight]);

  const handleBarLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const height = e.nativeEvent.layout.height;
      onTabBarHeightChange?.(height);
      registerTabBarHeight(height);
    },
    [onTabBarHeightChange, registerTabBarHeight],
  );

  const focusedRoute = state.routes[state.index]?.name;
  const registerIsDayPlanFocused = bridge.registerIsDayPlanFocused;
  const isDayPlanFocused = focusedRoute === 'day-plan';

  useEffect(() => {
    registerIsDayPlanFocused(isDayPlanFocused);
  }, [isDayPlanFocused, registerIsDayPlanFocused]);

  const colors = useMemo(
    () =>
      isDark
        ? { containerBg: '#262B28', activeBg: '#3A3A3C' }
        : { containerBg: '#F7F6F4', activeBg: '#E6E3DE' },
    [isDark],
  );

  const visibleTabs = TABS.filter(tab =>
    (FEATURE_FLAGS.puzzle || tab.route !== 'puzzle-history')
    && (FEATURE_FLAGS.routinesManageTab || tab.route !== 'fixed-routines'));
  const slotCount = visibleTabs.length + 1;
  const itemWidth = Math.min(64, (width - 100 - (slotCount - 1) * 2) / slotCount);
  const pillWidth = slotCount * itemWidth + 12 + (slotCount - 1) * 2;
  const photoSelected = focusedRoute === 'index' && !!characterPicker?.photoActive;

  return (
    <View
      onLayout={handleBarLayout}
      style={[styles.outerWrap, { paddingBottom: safeBottom, backgroundColor: isDark ? '#262B28' : '#F7F6F4' }]}>
      <View style={styles.shell}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.containerBg },
          ]}>
          {visibleTabs.map((tab) => {
            const isFocused =
              focusedRoute === tab.route ||
              (tab.route === 'day-plan' && focusedRoute === 'index');

            return (
              <Fragment key={tab.route}><Pressable
                key={tab.route}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused && !photoSelected }}
                accessibilityLabel={t(tab.labelKey)}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (tab.route === 'index' && isFocused && characterPicker) characterPicker.open();
                  else navigation.navigate(tab.route);
                }}
                style={({ pressed }) => [
                  styles.tabItem,
                  { width: itemWidth },
                  isFocused && !photoSelected && { backgroundColor: colors.activeBg },
                  pressed && { opacity: 0.8 },
                ]}>
                <Image source={tab.route === 'index' ? heroArtwork : tab.icon} style={styles.icon} resizeMode="contain" />
              </Pressable>{tab.route === 'index' ? <>
                <Pressable
                  testID="hero-ai-mode-tab"
                  accessibilityRole="tab"
                  accessibilityLabel={t('comicDay.photo.choose')}
                  accessibilityState={{ selected: photoSelected }}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (focusedRoute !== 'index') navigation.navigate('index');
                    characterPicker?.openPhoto();
                  }}
                  style={({ pressed }) => [styles.tabItem, { width: itemWidth }, photoSelected && { backgroundColor: colors.activeBg }, pressed && { opacity: 0.8 }]}>
                  <HeroPhotoEntryIcon ink={isDark ? '#EEECE6' : '#252A26'} size={34} selected={photoSelected} />
                </Pressable>
              </> : null}</Fragment>
            );
          })}
        </View>
      </View>
      {focusedRoute === 'index' ? <View testID="hero-thumbnail-toggle-beside-tabs" style={{ position: 'absolute', left: Math.min(width - 48, width / 2 + pillWidth / 2 + 8), top: 14 }}><HeroThumbnailStripToggle width={44} isDark={isDark} enabled /></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrap: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  shell: {
    borderRadius: DAY_PLAN_TAB_BAR_ROW_HEIGHT / 2,
    shadowColor: '#14161C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: DAY_PLAN_TAB_BAR_ROW_HEIGHT,
    borderRadius: DAY_PLAN_TAB_BAR_ROW_HEIGHT / 2,
    paddingHorizontal: 6,
    gap: 2,
    overflow: 'hidden',
  },
  tabItem: {
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
  },
  icon: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
  },
});
