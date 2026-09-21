import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CityPopSpacing, RetroFlatColors } from '@shared/config/retroFlat';
import { CityPopCardShell } from '@shared/ui/city-pop-card-shell';
import { IconSymbol } from '@shared/ui/icon-symbol';

/** 아이콘 박스 솔리드 음영 — 옅게 */
const SHADOW_SM = 2;
const ICON_FACE = 36;

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
  /** 초기화 등 위험 행 아이콘 오프셋 — 민트 대신 코럴 */
  dangerShadow: string;
  dangerIconBoxBg: string;
};

export function buildSettingsPalette(isDark: boolean): SettingsPalette {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    bg: c.bg,
    surface: c.bg,
    /** 행 구분 — 순검정 2px 대신 연한 구분선 */
    border: isDark ? 'rgba(241, 239, 255, 0.16)' : 'rgba(24, 26, 46, 0.12)',
    sectionTitle: c.textMuted,
    title: c.text,
    desc: c.textMuted,
    icon: c.primary,
    iconBoxBg: c.primaryContainer,
    /** 아이콘 오프셋 — 크림/민트 면에서 보이도록 옅은 잉크 */
    shadow: isDark ? 'rgba(0, 0, 0, 0.45)' : 'rgba(24, 26, 46, 0.22)',
    chevron: c.textMuted,
    dangerBg: isDark ? 'rgba(147, 0, 10, 1)' : '#FFDAD6',
    dangerTitle: isDark ? c.danger : '#B91C1C',
    dangerDesc: isDark ? '#FFB4AB' : '#991B1B',
    dangerIcon: isDark ? c.danger : '#DC2626',
    dangerChevron: isDark ? '#FFB4AB' : '#FCA5A5',
    dangerShadow: isDark ? 'rgba(120, 40, 40, 0.55)' : 'rgba(185, 28, 28, 0.28)',
    dangerIconBoxBg: isDark ? 'rgba(255, 255, 255, 0.12)' : '#FFFFFF',
  };
}

/** 설정 행 — 파스텔 아이콘 박스 + 옅은 solid shadow */
export function SettingsRowIcon({
  name,
  color,
  boxBg,
  border: _border,
  shadow,
}: {
  name: string;
  color: string;
  boxBg: string;
  border: string;
  shadow: string;
}) {
  return (
    <View style={styles.iconShell}>
      <View
        pointerEvents="none"
        style={[
          styles.iconShadow,
          {
            backgroundColor: shadow,
          },
        ]}
      />
      <View style={[styles.iconBox, { backgroundColor: boxBg }]}>
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
  /** 카드 오프셋 — 순검정보다 한 단계 흐린 잉크 (볼드감만 완화) */
  const shadowColor = isDark ? '#5A5C72' : '#707979';

  return (
    <CityPopCardShell
      isDark={isDark}
      faceColor={surface}
      shadowColor={shadowColor}
      shadowOffset={SHADOW_SM}>
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
    borderTopWidth: StyleSheet.hairlineWidth * 2,
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
    /** 아이콘 솔리드 음영이 잘리지 않게 — 셸이 음영 면적을 포함 */
    overflow: 'visible',
  },
  iconShell: {
    position: 'relative',
    width: ICON_FACE + SHADOW_SM,
    height: ICON_FACE + SHADOW_SM,
    flexShrink: 0,
  },
  iconShadow: {
    position: 'absolute',
    left: SHADOW_SM,
    top: SHADOW_SM,
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
});
