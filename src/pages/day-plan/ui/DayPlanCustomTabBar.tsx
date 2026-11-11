import { useHeroCalendarDesign, useCalendarBackdropVisible } from '../model/heroCalendarDesign';
import { useIllustrationCalendarMode } from '../model/illustrationCalendarMode';
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
import Animated, { useAnimatedStyle, useSharedValue, withSpring, ReduceMotion } from 'react-native-reanimated';
import type { PressableProps } from 'react-native';
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

const TAB_SPRING = { damping: 22, stiffness: 300, mass: 0.7, reduceMotion: ReduceMotion.System };

function TabButton({ children, ...props }: PressableProps & { children: React.ReactNode }) {
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Pressable {...props}
    onPressIn={event => { scale.value = withSpring(0.94, TAB_SPRING); props.onPressIn?.(event); }}
    onPressOut={event => { scale.value = withSpring(1, TAB_SPRING); props.onPressOut?.(event); }}
  >
    <Animated.View style={motion}>{children}</Animated.View>
  </Pressable>;
}

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
    return isDark
      ? { containerBg: 'rgba(38,43,40,0.65)', activeBg: 'rgba(255,255,255,0.14)', text: '#EEECE6', selectedText: '#EEECE6', icon: '#EEECE6', selectedIcon: '#EEECE6' }
      : { containerBg: 'rgba(247,246,244,0.60)', activeBg: 'rgba(230,227,222,0.65)', text: '#252A26', selectedText: '#252A26', icon: '#252A26', selectedIcon: '#252A26' };
  }, [isDark]);

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

  const tabSlots = visibleTabs.flatMap(tab => tab.route === 'index' && FEATURE_FLAGS.heroAiCameraTab ? [tab.route, 'camera-mode'] : [tab.route]);
  const selectedSlot = tabSlots.indexOf(photoSelected ? 'camera-mode' : focusedRoute ?? '');
  const indicatorX = useSharedValue(Math.max(0, selectedSlot) * (itemWidth + 2));
  useEffect(() => {
    indicatorX.value = withSpring(Math.max(0, selectedSlot) * (itemWidth + 2), TAB_SPRING);
  }, [selectedSlot, itemWidth, indicatorX]);
  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: indicatorX.value }] }));

  const overlay = illustrationMode && focusedRoute === 'calendar' || selectedIllustration && calendarBackdrop && focusedRoute === 'index';

  return (
    <View
      onLayout={handleBarLayout}
      style={[styles.outerWrap, overlay && { position: 'absolute', bottom: 0, left: 0, right: 0 }, { paddingBottom: safeBottom, backgroundColor: 'transparent', zIndex: 20, elevation: 20 }]}>
      <View style={styles.shell}>
        <View
          style={[
            styles.container,
            { backgroundColor: colors.containerBg, borderWidth: 0.7, borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.65)' },
          ]}>
          {selectedSlot >= 0 && <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 6.7, top: '50%', marginTop: -22, width: itemWidth, height: 44, borderRadius: 22, backgroundColor: colors.activeBg }, indicatorStyle]} />}
          {visibleTabs.map((tab) => {
            const isFocused =
              focusedRoute === tab.route ||
              (tab.route === 'day-plan' && focusedRoute === 'index');

            return (
              <Fragment key={tab.route}><TabButton
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
                  pressed && { opacity: 0.8 },
                ]}>
                {tab.route === 'calendar' || tab.route === 'history' || tab.route === 'index' ? <ThemedText numberOfLines={1} style={{ fontSize: tab.route === 'calendar' ? 16 : 20, lineHeight: 28, color: isFocused && !photoSelected ? colors.selectedText : colors.text, textAlign: 'center' }}>{tab.route === 'history' ? 'Photo' : tab.route === 'calendar' ? 'Store' : 'Diary'}</ThemedText> : <Image source={tab.icon!} style={[styles.icon, { tintColor: isFocused ? colors.selectedIcon : colors.icon }]} resizeMode="contain" />}
              </TabButton>{tab.route === 'index' && FEATURE_FLAGS.heroAiCameraTab ? <>
                <TabButton
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
                  style={({ pressed }) => [styles.tabItem, { width: itemWidth }, pressed && { opacity: 0.8 }]}>
                  <HeroPhotoEntryIcon ink={photoSelected ? colors.selectedIcon : colors.icon} size={34} selected={photoSelected} />
                </TabButton>
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
