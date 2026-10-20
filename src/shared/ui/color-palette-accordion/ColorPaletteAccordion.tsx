import { StationeryCaptionIcon } from '@shared/ui/stationery-desk/StationeryCaptionIcon';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useMeasuredAccordion } from '@shared/lib/hooks/useMeasuredAccordion';
import { useTranslation } from '@shared/lib/i18n';
import { RoutineActionIcon } from '@shared/ui/routine-action-icon';
import { ThemedText } from '@shared/ui/themed-text';

const CHEVRON_MS = 220;
const CHEVRON_EASE = Easing.out(Easing.cubic);

type Props = {
  ink: string;
  isDark: boolean;
  children: ReactNode;
  /** 기본 접힘 */
  defaultExpanded?: boolean;
  /** 헤더 좌우 패딩 */
  headerPaddingHorizontal?: number;
  /** @deprecated 유지용 — 셰브론 박스를 쓰지 않음 */
  shadowColor?: string;
};

function ColorSectionGlyph({ isDark }: { isDark: boolean }) {
  return <StationeryCaptionIcon kind="face" color={isDark ? '#C69AB0' : '#F2B8C8'} size={26} />;
}

/** 「메모지 컬러」타이틀 + 파스텔 칩 아이콘 아코디언 (루틴·나만의 루틴·오늘 탭 공용) */
export function ColorPaletteAccordion({
  ink,
  isDark,
  children,
  defaultExpanded = false,
  headerPaddingHorizontal = 12,
}: Props) {
  const { t } = useTranslation();
  /** 박스 없이 화살표만 — 중간 톤 */
  const chevronInk = isDark ? 'rgba(250,250,250,0.72)' : 'rgba(17,17,17,0.84)';
  const [expanded, setExpanded] = useState(defaultExpanded);
  const accordion = useMeasuredAccordion(expanded);
  const chevronProgress = useSharedValue(defaultExpanded ? 1 : 0);

  useEffect(() => {
    chevronProgress.value = withTiming(expanded ? 1 : 0, {
      duration: CHEVRON_MS,
      easing: CHEVRON_EASE,
    });
  }, [chevronProgress, expanded]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronProgress.value * 180}deg` }],
  }));

  return (
    <View style={styles.section}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded ? t('dayPlan.colorSectionCollapseA11y') : t('dayPlan.colorSectionExpandA11y')
        }
        hitSlop={6}
        onPress={() => {
          void Haptics.selectionAsync();
          setExpanded((v) => !v);
        }}
        style={[styles.sectionHeader, { paddingHorizontal: headerPaddingHorizontal }]}>
        <ColorSectionGlyph isDark={isDark} />
        <ThemedText style={[styles.sectionTitle, { color: ink }]} numberOfLines={1}>
          {t('dayPlan.colorSectionTitle')}
        </ThemedText>
        <Reanimated.View style={chevronStyle}>
          <RoutineActionIcon name="expand" size={19} color={chevronInk} />
        </Reanimated.View>
      </Pressable>
      {accordion.mounted ? (
        <Reanimated.View style={accordion.panelStyle}>
          {/* absolute 측정 — 부모 height 제약에 높이가 다시 줄어드는 루프 방지 */}
          <View
            style={styles.measureBody}
            onLayout={(e) => {
              accordion.onContentLayout(e.nativeEvent.layout.height);
            }}>
            {children}
          </View>
        </Reanimated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    alignSelf: 'stretch',
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  measureBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    paddingTop: 2,
    paddingBottom: 8,
  },
  glyph: {
    width: 18,
    height: 18,
    position: 'relative',
  },
  glyphChipShell: {
    position: 'absolute',
    width: 12,
    height: 12,
  },
  glyphChipShadow: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.18)',
    transform: [{ translateX: 1.5 }, { translateY: 1.5 }],
  },
  glyphChipFace: {
    ...StyleSheet.absoluteFill,
  },
});
