import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CityPopSpacing, RETRO_BORDER_WIDTH, RetroFlatColors } from '@shared/config/retroFlat';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { IconSymbol } from '@shared/ui/icon-symbol';

const SHADOW_SM = 2;

export type SettingsPalette = {
  bg: string;
  surface: string;
  border: string;
  sectionTitle: string;
  title: string;
  desc: string;
  icon: string;
  iconBoxBg: string;
  shadow: string;
  chevron: string;
  dangerBg: string;
  dangerTitle: string;
  dangerDesc: string;
  dangerIcon: string;
  dangerChevron: string;
};

export function buildSettingsPalette(isDark: boolean): SettingsPalette {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    bg: c.bg,
    surface: c.bg,
    border: c.border,
    sectionTitle: c.textMuted,
    title: c.text,
    desc: c.textMuted,
    icon: c.primary,
    iconBoxBg: c.primaryContainer,
    shadow: isDark ? c.solidShadow : c.primary,
    chevron: c.textMuted,
    dangerBg: isDark ? 'rgba(147, 0, 10, 1)' : '#FFDAD6',
    dangerTitle: isDark ? c.danger : '#B91C1C',
    dangerDesc: isDark ? '#FFB4AB' : '#991B1B',
    dangerIcon: isDark ? c.danger : '#DC2626',
    dangerChevron: isDark ? '#FFB4AB' : '#FCA5A5',
  };
}

/** 설정 행 — 파스텔 아이콘 박스 + 민트 solid shadow */
export function SettingsRowIcon({
  name,
  color,
  boxBg,
  border,
  shadow,
}: {
  name: string;
  color: string;
  boxBg: string;
  border: string;
  shadow: string;
}) {
  return (
    <View style={[styles.iconShell, { marginRight: SHADOW_SM, marginBottom: SHADOW_SM }]}>
      <View
        pointerEvents="none"
        style={[
          styles.iconShadow,
          {
            backgroundColor: shadow,
            borderColor: border,
            transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
          },
        ]}
      />
      <View style={[styles.iconBox, { backgroundColor: boxBg, borderColor: border }]}>
        <IconSymbol name={name as 'bell.fill'} size={15} color={color} />
      </View>
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
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  /** 카드 오프셋은 검정 — 민트 섀도는 반투명 면에서 전체가 민트로 보임 */
  const shadowColor = isDark ? tone.solidShadow : tone.text;

  return (
    <CityPopCardShell isDark={isDark} faceColor={surface} shadowColor={shadowColor}>
      <View style={styles.sectionInner}>{children}</View>
    </CityPopCardShell>
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
    borderTopWidth: RETRO_BORDER_WIDTH,
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
  sectionInner: {
    overflow: 'hidden',
  },
  iconShell: {
    position: 'relative',
    flexShrink: 0,
  },
  iconShadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: RETRO_BORDER_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    overflow: 'hidden',
  },
});
