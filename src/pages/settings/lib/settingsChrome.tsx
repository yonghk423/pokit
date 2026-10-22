import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { Children, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CityPopSpacing, RetroFlatColors } from '@shared/config/retroFlat';
import { IconSymbol } from '@shared/ui/icon-symbol';

/** 오늘 탭 PlanModeSwitch 아이콘과 동일 스펙 */
const SHADOW_SM = 2;
const ICON_FACE = 34;

export type SettingsPalette = {
  bg: string;
  surface: string;
  border: string;
  sectionTitle: string;
  title: string;
  desc: string;
  icon: string;
  iconBoxBg: string;
  /** 아이콘 박스 테두리 — 오늘 탭 모드 아이콘과 동일 */
  iconBorder: string;
  shadow: string;
  chevron: string;
  dangerBg: string;
  dangerTitle: string;
  dangerDesc: string;
  dangerIcon: string;
  dangerChevron: string;
  /** 초기화 등 위험 행 아이콘 오프셋 — 민트 대신 코럴 */
  dangerShadow: string;
  dangerIconBoxBg: string;
};

export function buildSettingsPalette(isDark: boolean): SettingsPalette {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    bg: isDark ? '#262B28' : '#F7F6F4',
    surface: isDark ? c.bg : '#FFFEFA',
    /** 행 구분 — 순검정 2px 대신 연한 구분선 */
    border: isDark ? 'rgba(241, 239, 255, 0.16)' : 'rgba(24, 26, 46, 0.12)',
    sectionTitle: c.textMuted,
    title: c.text,
    desc: c.textMuted,
    /** 오늘 탭 상단 모드 아이콘과 동일 — 검정 글리프 · 흰 면 */
    icon: isDark ? '#FAFAFA' : '#000000',
    iconBoxBg: isDark ? c.surfaceAlt : '#F7F6F4',
    iconBorder: isDark ? 'rgba(255,255,255,0.55)' : '#000000',
    shadow: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(24, 26, 46, 0.22)',
    chevron: c.textMuted,
    dangerBg: isDark ? 'rgba(147, 0, 10, 1)' : '#FFDAD6',
    dangerTitle: isDark ? c.danger : '#B91C1C',
    dangerDesc: isDark ? '#FFB4AB' : '#991B1B',
    dangerIcon: isDark ? c.danger : '#DC2626',
    dangerChevron: isDark ? '#FFB4AB' : '#FCA5A5',
    dangerShadow: isDark ? 'rgba(120, 40, 40, 0.35)' : 'rgba(185, 28, 28, 0.16)',
    dangerIconBoxBg: isDark ? 'rgba(255, 255, 255, 0.12)' : '#F7F6F4',
  };
}

/** 설정 행 아이콘 — 오늘 탭 PlanModeSwitch와 동일 (흰 면 · 검정 테두리 · 솔리드 음영) */
export function SettingsRowIcon({
  name,
  color,
  boxBg,
  border,
  shadow,
  showBadge = false,
  /** 배지 링 — 카드/배경면과 맞춰야 자연스러움 */
  badgeRingColor = '#FFFFFF',
}: {
  name: string;
  color: string;
  boxBg: string;
  border: string;
  shadow: string;
  /** 아이콘 우측 상단 미읽음 점 (iOS/Android 관례) */
  showBadge?: boolean;
  badgeRingColor?: string;
}) {
  return (
    <View style={[styles.iconShell, { marginRight: SHADOW_SM, marginBottom: SHADOW_SM }]}>
      <View
        pointerEvents="none"
        style={[
          styles.iconShadow,
          {
            backgroundColor: shadow,
            transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
          },
        ]}
      />
      <View style={[styles.iconBox, { backgroundColor: boxBg, borderColor: border }]}>
        <PaperGrain />
        <HanddrawnFrame color={border} />
        <IconSymbol name={name as 'bell.fill'} size={22} color={color} />
      </View>
      {showBadge ? (
        <View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.badge, { borderColor: badgeRingColor }]}
        />
      ) : null}
    </View>
  );
}

export function SettingsSection({
  children,
  surface,
  isDark = false,
}: {
  children: ReactNode;
  border?: string;
  surface: string;
  isDark?: boolean;
}) {
  /** 항목마다 종이 결 + 단정한 오프셋 음영을 주어 현재 카드 스타일로 통일 */
  const shadowColor = isDark ? 'rgba(0, 0, 0, 0.30)' : 'rgba(62, 57, 47, 0.14)';
  const frameColor = isDark ? 'rgba(224, 225, 215, 0.48)' : '#C8C2B4';

  return (
    <View style={styles.section}>
      {Children.map(children, (child, index) => {
        if (!isValidElement<{ style?: unknown }>(child)) return child;
        if (isSectionHeading(child.props.style)) return child;

        return (
          <SettingsRowCard
            key={child.key ?? `settings-row-${index}`}
            faceColor={surface}
            shadowColor={shadowColor}
            frameColor={frameColor}>
            {child}
          </SettingsRowCard>
        );
      })}
    </View>
  );
}

function isSectionHeading(style: unknown): boolean {
  return Array.isArray(style) && style.includes(settingsChromeStyles.sectionTitle);
}

function SettingsRowCard({
  children,
  faceColor,
  shadowColor,
  frameColor,
}: {
  children: ReactNode;
  faceColor: string;
  shadowColor: string;
  frameColor: string;
}) {
  return (
    <View style={styles.rowCardOuter}>
      <View pointerEvents="none" style={[styles.rowCardShadow, { backgroundColor: shadowColor }]} />
      <View style={[styles.rowCardFace, { backgroundColor: faceColor }]}>
        <PaperGrain opacity={0.46} />
        <HanddrawnFrame color={frameColor} />
        {children}
      </View>
    </View>
  );
}

export const settingsChromeStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  container: {
    padding: CityPopSpacing.md,
    paddingHorizontal: CityPopSpacing.marginMobile,
    gap: 14,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  item: {
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemTextWrap: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  itemDesc: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
});

const styles = StyleSheet.create({
  section: {
    gap: 10,
    overflow: 'visible',
  },
  rowCardOuter: {
    position: 'relative',
    width: '100%',
    marginRight: SHADOW_SM,
    marginBottom: SHADOW_SM,
    overflow: 'visible',
  },
  rowCardShadow: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 4,
    transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
  },
  rowCardFace: {
    position: 'relative',
    borderRadius: 4,
    overflow: 'hidden',
  },
  iconShell: {
    position: 'relative',
    width: ICON_FACE + SHADOW_SM,
    height: ICON_FACE + SHADOW_SM,
    flexShrink: 0,
    overflow: 'visible',
  },
  iconShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: ICON_FACE,
    height: ICON_FACE,
    borderRadius: 0,
  },
  iconBox: {
    width: ICON_FACE,
    height: ICON_FACE,
    borderRadius: 0,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
  },
  /**
   * 미읽음 점 — Material/iOS 관례: 부모 우측 상단(TOP_END),
   * 모서리에 살짝 걸침 + 면색 스트로크.
   */
  badge: {
    position: 'absolute',
    top: -3,
    left: ICON_FACE - 9,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#C45C5C',
    borderWidth: 1.5,
    zIndex: 3,
  },
});
