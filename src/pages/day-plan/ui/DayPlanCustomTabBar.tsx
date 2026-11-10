import { useHeroCalendarDesign, useCalendarBackdropVisible } from '../model/heroCalendarDesign';
import { useIllustrationCalendarMode } from '../model/illustrationCalendarMode';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { HeroCharacterPickerActionContext } from '../model/heroCharacterPickerAction';
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
  icon?: ImageSourcePropType;
  labelKey: I18nKey;
};

const TABS: TabDef[] = [
  { route: 'index', labelKey: 'tabs.comicDay' },
  { route: 'history', labelKey: 'comicDiary.history' },
  { route: 'fixed-routines', icon: require('../../../../assets/tab-icons/routine.webp'), labelKey: 'tabs.routines' },
  { route: 'puzzle-history', icon: require('../../../../assets/tab-icons/puzzle.webp'), labelKey: 'tabs.puzzle' },
  { route: 'pokit-story', icon: require('../../../../assets/tab-icons/story-pen.png'), labelKey: 'tabs.story' },
  { route: 'calendar', labelKey: 'tabs.calendar' },
];

// Each illustration keeps the same controls, with colors drawn from its scene.
const ILLUSTRATION_TAB_TONES = {
  illustration: { surface: '#F2E4D0', active: '#E5B777', ink: '#5B4030', selected: '#4A2F1D', dark: '#352E27' },
  'city-animation-01': { surface: '#DFE7EC', active: '#66869C', ink: '#344B5B', selected: '#FFFFFF', dark: '#253540' },
  'city-animation-02': { surface: '#E6E9DC', active: '#788963', ink: '#3F5037', selected: '#FFFFFF', dark: '#2C3528' },
  'city-animation-03': { surface: '#EFE0D7', active: '#A56D51', ink: '#624330', selected: '#FFFFFF', dark: '#3B2D27' },
  'city-animation-04': { surface: '#DDECE8', active: '#527E78', ink: '#30554F', selected: '#FFFFFF', dark: '#233B37' },
  'city-animation-05': { surface: '#F0DFDF', active: '#A65F6B', ink: '#683F48', selected: '#FFFFFF', dark: '#3D2931' },
} as const;

export function DayPlanCustomTabBar({ state, navigation }: BottomTabBarProps) {
  const calendarDesign = useHeroCalendarDesign();
  const selectedIllustration = calendarDesign === 'illustration' || calendarDesign.startsWith('city-animation-');
  const calendarBackdrop = useCalendarBackdropVisible();
  const illustrationMode = useIllustrationCalendarMode();
  const { width } = useWindowDimensions();
  const characterPicker = useContext(HeroCharacterPickerActionContext);
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

  const estimatedHeight = DAY_PLAN_TAB_BAR_ROW_HEIGHT + safeBottom + 8;

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

  const colors = useMemo(() => {
    const tone = ILLUSTRATION_TAB_TONES[calendarDesign as keyof typeof ILLUSTRATION_TAB_TONES];
    if (tone) return {
      containerBg: isDark ? tone.dark : tone.surface,
      activeBg: tone.active,
      text: isDark ? tone.surface : tone.ink,
      selectedText: tone.selected,
      icon: isDark ? tone.surface : tone.ink,
      selectedIcon: tone.selected,
    };
    return isDark
      ? { containerBg: '#262B28', activeBg: '#3A3A3C', text: '#EEECE6', selectedText: '#EEECE6', icon: '#EEECE6', selectedIcon: '#EEECE6' }
      : { containerBg: '#F7F6F4', activeBg: '#E6E3DE', text: '#252A26', selectedText: '#252A26', icon: '#252A26', selectedIcon: '#252A26' };
  }, [isDark, calendarDesign]);

  const visibleTabs = TABS.filter(tab =>
    (FEATURE_FLAGS.puzzle || tab.route !== 'puzzle-history')
    && (FEATURE_FLAGS.routinesManageTab || tab.route !== 'fixed-routines')
    && (FEATURE_FLAGS.pokitStory || tab.route !== 'pokit-story'));
  const slotCount = visibleTabs.length + (FEATURE_FLAGS.heroAiCameraTab ? 1 : 0);
  const itemWidth = Math.min(88, (width - 48 - 12 - (slotCount - 1) * 2) / slotCount);
  const photoSelected = FEATURE_FLAGS.heroAiCameraTab && focusedRoute === 'index' && !!characterPicker?.photoActive;
  useEffect(() => {
    if (!FEATURE_FLAGS.heroAiCameraTab && focusedRoute === 'index' && characterPicker?.photoActive) characterPicker.open();
  }, [focusedRoute, characterPicker]);

  const overlay = illustrationMode && focusedRoute === 'calendar' || selectedIllustration && calendarBackdrop && focusedRoute === 'index';

  return (
    <View
      onLayout={handleBarLayout}
      style={[styles.outerWrap, overlay && { position: 'absolute', bottom: 0, left: 0, right: 0 }, { paddingBottom: safeBottom, backgroundColor: isDark ? '#262B28' : 'transparent', zIndex: 20, elevation: 20 }]}>
      <View style={styles.shell}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.containerBg, borderWidth: 0.7, borderColor: isDark ? '#484C47' : '#FFFFFF' },
          ]}>
          <PaperGrain opacity={0.24} />
          {visibleTabs.map((tab) => {
            const isFocused =
              focusedRoute === tab.route ||
              (tab.route === 'day-plan' && focusedRoute === 'index');

            return (
              <Fragment key={tab.route}><Pressable
                key={tab.route}
                accessibilityRole="tab"
                testID={`hero-tab-${tab.route}`}
                accessibilityState={{ selected: isFocused && !photoSelected }}
                accessibilityLabel={tab.route === 'history' ? 'Photo' : tab.route === 'index' ? 'Diary' : tab.route === 'calendar' ? 'Store' : t(tab.labelKey)}
                onPress={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (tab.route === 'index' && characterPicker) {
                    // The camera lives inside index, so returning from another
                    // route must also leave camera mode before showing the diary.
                    characterPicker.open(!isFocused);
                    if (!isFocused) navigation.navigate('index');
                  } else navigation.navigate(tab.route);
                }}
                style={({ pressed }) => [
                  styles.tabItem,
                  { width: itemWidth },
                  isFocused && !photoSelected && { backgroundColor: colors.activeBg },
                  pressed && { opacity: 0.8 },
                ]}>
                {tab.route === 'calendar' || tab.route === 'history' || tab.route === 'index' ? <ThemedText numberOfLines={1} style={{ fontSize: tab.route === 'calendar' ? 16 : 20, lineHeight: 28, color: isFocused && !photoSelected ? colors.selectedText : colors.text, textAlign: 'center' }}>{tab.route === 'history' ? 'Photo' : tab.route === 'calendar' ? 'Store' : 'Diary'}</ThemedText> : <Image source={tab.icon!} style={[styles.icon, { tintColor: isFocused ? colors.selectedIcon : colors.icon }]} resizeMode="contain" />}
              </Pressable>{tab.route === 'index' && FEATURE_FLAGS.heroAiCameraTab ? <>
                <Pressable
                  testID="hero-ai-mode-tab"
                  accessibilityRole="tab"
                  accessibilityLabel={t('comicDay.photo.choose')}
                  accessibilityState={{ selected: photoSelected }}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (focusedRoute !== 'index') {
                      characterPicker?.openPhoto(true);
                      navigation.navigate('index');
                    } else characterPicker?.openPhoto();
                  }}
                  style={({ pressed }) => [styles.tabItem, { width: itemWidth }, photoSelected && { backgroundColor: colors.activeBg }, pressed && { opacity: 0.8 }]}>
                  <HeroPhotoEntryIcon ink={photoSelected ? colors.selectedIcon : colors.icon} size={34} selected={photoSelected} />
                </Pressable>
              </> : null}</Fragment>
            );
          })}
        </View>
      </View>
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
    shadowOpacity: 0.16,
    shadowRadius: 12,
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
