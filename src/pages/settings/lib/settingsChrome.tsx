import { SettingsPenIcon } from './settingsPen';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { Children, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CityPopSpacing, RetroFlatColors } from '@shared/config/retroFlat';

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
  iconBorder: string;
  shadow: string;
  chevron: string;
  dangerBg: string;
  dangerTitle: string;
  dangerDesc: string;
  dangerIcon: string;
  dangerChevron: string;
  dangerShadow: string;
  dangerIconBoxBg: string;
};

export function buildSettingsPalette(isDark: boolean): SettingsPalette {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const ink = isDark ? '#F1E7D2' : '#171510';
  return {
    bg: isDark ? '#282724' : '#F8F6F0',
    surface: 'transparent',
    border: isDark ? 'rgba(241, 239, 255, 0.16)' : 'rgba(24, 26, 46, 0.12)',
    sectionTitle: ink,
    title: ink,
    desc: isDark ? '#D5D0C5' : '#625E55',
    icon: ink,
    iconBoxBg: 'transparent',
    iconBorder: isDark ? 'rgba(255,255,255,0.55)' : '#000000',
    shadow: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(24, 26, 46, 0.22)',
    chevron: ink,
    dangerBg: 'transparent',
    dangerTitle: isDark ? c.danger : '#B91C1C',
    dangerDesc: isDark ? '#FFB4AB' : '#991B1B',
    dangerIcon: isDark ? c.danger : '#DC2626',
    dangerChevron: isDark ? '#FFB4AB' : '#8D3731',
    dangerShadow: isDark ? 'rgba(120, 40, 40, 0.35)' : 'rgba(185, 28, 28, 0.16)',
    dangerIconBoxBg: isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF',
  };
}

/**
 * Use the same solid ink and variable nib pressure as the menu frames.
 */
export function SettingsRowIcon({
  name, color, showBadge = false, badgeRingColor = RetroFlatColors.light.bg,
}: {
  name: string; color: string; boxBg: string; border: string; shadow: string;
  showBadge?: boolean; badgeRingColor?: string;
}) {
  return <View style={styles.iconShell}>
    <SettingsPenIcon name={name} size={32} color={color} />
    {showBadge ? <View pointerEvents="none" style={[styles.badge, { borderColor: badgeRingColor }]} /> : null}
  </View>;
}

export function SettingsInkFrame({ color }: { color: string }) {
  return <HanddrawnFrame color={color} />;
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
  const frameColor = isDark ? '#E8DEC9' : '#171510';
  return (
    <View style={styles.section}>
      {Children.map(children, (child, index) => {
        if (!isValidElement<{ style?: unknown }>(child)) return child;
        if (isSectionHeading(child.props.style)) return child;

        return (
          <SettingsRowCard
            key={child.key ?? `settings-row-${index}`}
            faceColor={surface}
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
  frameColor,
}: {
  children: ReactNode;
  faceColor: string;
  frameColor: string;
}) {
  return (
    <View style={styles.rowCardOuter}>
      <View style={[styles.rowCardFace, { backgroundColor: faceColor }]}>
        <SettingsInkFrame color={frameColor} />
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
    fontSize: 21,
    fontWeight: '500',
    letterSpacing: -0.3,
  },
  container: {
    padding: CityPopSpacing.md,
    paddingHorizontal: CityPopSpacing.marginMobile,
    gap: 12,
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
    minHeight: 72,
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
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  itemDesc: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 18,
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

    overflow: 'visible',
  },
  rowCardFace: {
    position: 'relative',
    borderRadius: 0,
    overflow: 'hidden',
  },
  iconShell: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
