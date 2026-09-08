import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

const CHROME_SHADOW = 2;

function ChromeShadowTab({
  active,
  activeBg,
  inactiveBg,
  shadowColor,
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
          },
        ]}>
        {children}
      </View>
    </Pressable>
  );
}

/** 데일리 타임라인 헤더 — 전체 / 시간대별 / 스파인 레이아웃 */
export type DayPlanLayoutMode = 'bag' | 'sections' | 'spine';

export type DayPlanHeaderSuffixTab = {
  key: string;
  icon: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

type TabDef = {
  key: DayPlanLayoutMode;
  icon: string;
  labelKey: I18nKey;
  a11yKey: I18nKey;
};

const TABS: TabDef[] = [
  {
    key: 'bag',
    icon: 'list.bullet.rectangle',
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
  /** false면 목록 등 레이아웃 탭을 비활성 톤으로 — 투두 등 다른 헤더 뷰 선택 시 */
  layoutTabActive?: boolean;
  /** 목록 탭 오른쪽 추가 아이콘(투두 등) — 레이아웃 탭과 동일 pill 스타일 */
  suffixTabs?: readonly DayPlanHeaderSuffixTab[];
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
  layoutTabActive = true,
  suffixTabs,
}: Props) {
  const { t } = useTranslation();
  const pill = tabPillColors(isDark);
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const tabs = TABS.filter((item) => ENABLED_LAYOUT_MODES.includes(item.key)).filter((item) =>
    visibleModes ? visibleModes.includes(item.key) : true,
  );
  const suffix = suffixTabs ?? [];
  /** 레이아웃 탭 + 투두(checklist) suffix — 단독 목록 아이콘도 유지 */
  const layoutTabs = tabs;

  if (layoutTabs.length === 0 && suffix.length === 0) return null;

  if (attached && showLabels) {
    if (layoutTabs.length === 0) return null;
    const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(53, 102, 104, 0.08)';
    const activeBg = tone.primaryContainer;
    const activeText = tone.primary;
    const inactiveText = tone.textMuted;

    return (
      <View style={[styles.attachedRoot, { backgroundColor: trackBg }]}>
        {layoutTabs.map((item) => {
          const active = mode === item.key;
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
              <IconSymbol
                name={item.icon as 'sun.horizon.fill'}
                size={14}
                color={active ? activeText : inactiveText}
              />
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

  return (
    <View style={[styles.root, showLabels && styles.rootLabeled]}>
      {layoutTabs.map((item) => {
        const active = layoutTabActive && mode === item.key;
        const label = layoutModeLabel(t, item.key);
        return (
          <ChromeShadowTab
            key={item.key}
            active={active}
            activeBg={pill.activeBg}
            inactiveBg={isDark ? pill.inactiveBg : '#FFFFFF'}
            shadowColor={isDark ? tone.solidShadow : '#000000'}
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
              <IconSymbol
                name={item.icon as 'sun.horizon.fill'}
                size={15}
                color={active ? pill.activeIcon : pill.inactiveIcon}
              />
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
      {suffix.map((item) => (
        <ChromeShadowTab
          key={item.key}
          active={item.active}
          activeBg={pill.activeBg}
          inactiveBg={isDark ? pill.inactiveBg : '#FFFFFF'}
          shadowColor={isDark ? tone.solidShadow : '#000000'}
          accessibilityLabel={item.accessibilityLabel}
          accessibilityState={{ selected: item.active }}
          onPress={() => {
            if (item.active) return;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            item.onPress();
          }}>
          <IconSymbol
            name={item.icon as 'checklist'}
            size={15}
            color={item.active ? pill.activeIcon : pill.inactiveIcon}
          />
        </ChromeShadowTab>
      ))}
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
    borderWidth: 0,
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
    borderWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 7,
    gap: 5,
    zIndex: 1,
  },
  chromeShell: {
    position: 'relative',
  },
  chromeShadow: {
    ...StyleSheet.absoluteFillObject,
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
    opacity: 0.72,
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
