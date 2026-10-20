import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { HeaderIcon, type HeaderIconName } from '@shared/ui/header-icon';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

/** PlanModeSwitch(오늘/메모/노트/책방)와 동일 — 테두리 + offset 2 솔리드 음영 */
const CHROME_SHADOW = 1;
const CHROME_BORDER = 0;
const CHROME_SHADOW_LIGHT = 'rgba(65, 78, 58, 0.07)';
const CHROME_SHADOW_DARK = 'rgba(0, 0, 0, 0.15)';
const CHROME_BORDER_LIGHT = '#929B8B';
const CHROME_BORDER_DARK = '#A3AE9C';

function ChromeShadowTab({
  active,
  activeBg,
  inactiveBg,
  shadowColor,
  borderColor,
  onPress,
  accessibilityLabel,
  accessibilityState,
  children,
  labeled,
}: {
  active: boolean;
  activeBg: string;
  inactiveBg: string;
  shadowColor: string;
  borderColor: string;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityState: { selected: boolean };
  children: ReactNode;
  labeled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chromeShell,
        { marginRight: CHROME_SHADOW, marginBottom: CHROME_SHADOW },
        pressed && styles.pressed,
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.chromeShadow,
          {
            backgroundColor: shadowColor,
            transform: [{ translateX: CHROME_SHADOW }, { translateY: CHROME_SHADOW }],
          },
        ]}
      />
      <View
        style={[
          labeled ? styles.labeledTab : styles.tab,
          {
            backgroundColor: active ? activeBg : inactiveBg,
            borderColor,
          },
        ]}>
        <PaperGrain opacity={0.25} />
        <HanddrawnFrame color={borderColor} />
        {children}
      </View>
    </Pressable>
  );
}

/** 데일리 타임라인 헤더 — 전체 / 시간대별 / 스파인 레이아웃 */
export type DayPlanLayoutMode = 'bag' | 'sections' | 'spine';

type TabDef = {
  key: DayPlanLayoutMode;
  icon: string;
  headerIcon?: HeaderIconName;
  labelKey: I18nKey;
  a11yKey: I18nKey;
};

const TABS: TabDef[] = [
  {
    key: 'bag',
    icon: 'list.bullet.rectangle',
    headerIcon: 'list',
    labelKey: 'layoutMode.bag',
    a11yKey: 'layoutMode.a11y.allRoutines',
  },
  {
    key: 'sections',
    icon: 'sun.horizon.fill',
    labelKey: 'layoutMode.sections',
    a11yKey: 'layoutMode.a11y.sections',
  },
  {
    key: 'spine',
    icon: 'clock',
    headerIcon: 'clock',
    labelKey: 'layoutMode.spine',
    a11yKey: 'layoutMode.a11y.spine',
  },
];

function layoutModeLabel(t: (key: I18nKey) => string, mode: DayPlanLayoutMode): string {
  const map: Record<DayPlanLayoutMode, I18nKey> = {
    bag: 'layoutMode.bag',
    sections: 'layoutMode.sections',
    spine: 'layoutMode.spine',
  };
  return t(map[mode]);
}
const ENABLED_LAYOUT_MODES: readonly DayPlanLayoutMode[] = ['bag'];

type Props = {
  mode: DayPlanLayoutMode;
  onSelectMode: (mode: DayPlanLayoutMode) => void;
  c: DayPlanPalette;
  isDark: boolean;
  /** 비어 있으면 전체 표시 */
  visibleModes?: readonly DayPlanLayoutMode[];
  /** true면 선택된 탭을 다시 눌러도 onSelectMode 호출 */
  allowReselect?: boolean;
  /** 아이콘 아래 모드 이름(목록·시간대·타임라인) 표시 */
  showLabels?: boolean;
  /**
   * 부착형 세그먼트 (나만의 루틴 탭).
   * showLabels 와 함께 쓸 때 루틴 목록 세그먼트와 동일한 톤.
   */
  attached?: boolean;
  /** 오늘 루틴의 원형 시간표 전환 버튼. */
  showCircularTimetable?: boolean;
  circularActive?: boolean;
  onSelectCircular?: () => void;
};

/** 오늘·나만의 루틴 — 레이아웃 모드 전환 */
export function DayPlanLayoutModeTabs({
  mode,
  onSelectMode,
  c,
  isDark,
  visibleModes,
  allowReselect = false,
  showLabels = false,
  attached = false,
  showCircularTimetable = false,
  circularActive = false,
  onSelectCircular,
}: Props) {
  const { t } = useTranslation();
  const pill = tabPillColors(isDark);
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const tabs = TABS.filter((item) => ENABLED_LAYOUT_MODES.includes(item.key)).filter((item) =>
    visibleModes ? visibleModes.includes(item.key) : true,
  );
  const layoutTabs = tabs;

  if (layoutTabs.length === 0) return null;

  if (attached && showLabels) {
    if (layoutTabs.length === 0) return null;
    const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(53, 102, 104, 0.08)';
    const activeBg = tone.primaryContainer;
    const activeText = tone.primary;
    const inactiveText = tone.textMuted;

    return (
      <View style={[styles.attachedRoot, { backgroundColor: trackBg }]}>
        {layoutTabs.map((item) => {
          const active = !circularActive && mode === item.key;
          const label = layoutModeLabel(t, item.key);
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
              onPress={() => {
                if (active && !allowReselect) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectMode(item.key);
              }}
              style={({ pressed }) => [
                styles.attachedTab,
                active && {
                  backgroundColor: activeBg,
                },
                pressed && { opacity: 0.88 },
              ]}>
              {item.headerIcon ? (
                <HeaderIcon name={item.headerIcon} size={16} />
              ) : (
                <IconSymbol
                  name={item.icon as 'sun.horizon.fill'}
                  size={14}
                  color={active ? activeText : inactiveText}
                />
              )}
              <ThemedText
                style={[
                  styles.attachedLabel,
                  active && styles.attachedLabelActive,
                  { color: active ? activeText : inactiveText },
                ]}
                numberOfLines={1}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    );
  }

  const chromeShadow = isDark ? CHROME_SHADOW_DARK : CHROME_SHADOW_LIGHT;
  const chromeBorder = isDark ? CHROME_BORDER_DARK : CHROME_BORDER_LIGHT;

  return (
    <View style={[styles.root, showLabels && styles.rootLabeled]}>
      {showCircularTimetable ? (
        <Pressable
          onPress={onSelectCircular}
          accessibilityRole="tab"
          accessibilityState={{ selected: circularActive }}
          accessibilityLabel={t('layoutMode.a11y.circularTimetable')}
          style={[styles.chromeShell, { marginRight: CHROME_SHADOW, marginBottom: CHROME_SHADOW }]}>
          <View
            pointerEvents="none"
            style={[styles.chromeShadow, {
              backgroundColor: chromeShadow,
              transform: [{ translateX: CHROME_SHADOW }, { translateY: CHROME_SHADOW }],
            }]}
          />
          <View style={[styles.tab, { backgroundColor: circularActive ? pill.activeBg : isDark ? pill.inactiveBg : '#FFFFFF' }]}>
            <PaperGrain opacity={0.25} />
            <HanddrawnFrame color={chromeBorder} />
            <Svg width={24} height={24} viewBox="0 0 24 24" accessible={false}>
              <Path d="M12 3.1 C16.9 3 21 7 20.9 12 L12 12Z" fill="#C8E5DC" />
              <Circle cx={12} cy={12} r={9} fill="none" stroke={isDark ? '#D7D9D0' : '#555B53'} strokeWidth={1.1} />
              <Path d="M12 3.2 12.2 11.9 20.8 12.2 M12.2 11.9 7.5 19.7 M12.2 11.9 4.4 7.5 M12 1.8 12 3.2 M22 12 20.7 12 M12 20.8 12 22 M1.9 12 3.2 12" fill="none" stroke={isDark ? '#D7D9D0' : '#555B53'} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="M5.4 5.8 C1.9 10.3 3 16.9 7.6 19.6" fill="none" stroke={chromeBorder} strokeWidth={0.45} opacity={0.55} />
            </Svg>
          </View>
        </Pressable>
      ) : null}
      {layoutTabs.map((item) => {
        const active = !circularActive && mode === item.key;
        const label = layoutModeLabel(t, item.key);
        return (
          <ChromeShadowTab
            key={item.key}
            active={active}
            activeBg={pill.activeBg}
            inactiveBg={isDark ? pill.inactiveBg : '#FFFFFF'}
            shadowColor={chromeShadow}
            borderColor={chromeBorder}
            accessibilityLabel={showLabels ? label : t(item.a11yKey)}
            accessibilityState={{ selected: active }}
            labeled={showLabels}
            onPress={() => {
              if (active && !allowReselect) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectMode(item.key);
            }}>
            <View
              style={[
                styles.iconBox,
                showLabels && styles.iconBoxLabeled,
                !showLabels && {
                  backgroundColor: 'transparent',
                  borderWidth: 0,
                },
              ]}>
              {item.headerIcon ? (
                <HeaderIcon name={item.headerIcon} size={showLabels ? 18 : 22} />
              ) : (
                <IconSymbol
                  name={item.icon as 'sun.horizon.fill'}
                  size={15}
                  color={active ? pill.activeIcon : pill.inactiveIcon}
                />
              )}
            </View>
            {showLabels ? (
              <ThemedText
                style={[
                  styles.tabLabel,
                  { color: active ? c.onSurface : c.onVariant },
                ]}
                numberOfLines={1}>
                {label}
              </ThemedText>
            ) : null}
          </ChromeShadowTab>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rootLabeled: {
    gap: 8,
  },
  tab: {
    width: 34,
    height: 34,
    borderRadius: 0,
    borderWidth: CHROME_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  labeledTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
    borderRadius: 0,
    borderWidth: CHROME_BORDER,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
    zIndex: 1,
  },
  chromeShell: {
    position: 'relative',
  },
  chromeShadow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 0,
  },
  iconBox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxLabeled: {
    width: 18,
    height: 18,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  pressed: {
    transform: [{ translateY: 1 }],
  },
  attachedRoot: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderWidth: 0,
    borderRadius: 0,
    padding: 3,
    gap: 3,
    marginBottom: 4,
  },
  attachedTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 0,
    borderRadius: 0,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  attachedLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  attachedLabelActive: {
    fontWeight: '800',
  },
});
