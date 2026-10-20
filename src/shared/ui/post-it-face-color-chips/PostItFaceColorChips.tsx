import { PostItColorPalette } from '@shared/ui/post-it-color-palette';
import { StationeryCaptionIcon } from '@shared/ui/stationery-desk/StationeryCaptionIcon';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useMeasuredAccordion } from '@shared/lib/hooks/useMeasuredAccordion';
import { useTranslation } from '@shared/lib/i18n';
import {
  type PostItFaceColorId,
} from '@shared/lib/storage';
import { RoutineActionIcon } from '@shared/ui/routine-action-icon';
import { ThemedText } from '@shared/ui/themed-text';

/** 액션 버튼·요일 칩과 동일 솔리드 음영 오프셋 */
const CHEVRON_MS = 220;
const CHEVRON_EASE = Easing.out(Easing.cubic);

type Props = {
  selectedId: PostItFaceColorId;
  isDark: boolean;
  ink: string;
  onSelect: (id: PostItFaceColorId) => void;
  /** 카드 헤더 안 — 라벨 없이 컴팩트 */
  compact?: boolean;
  /** 솔리드 음영 색 — 기본 검정 */
  shadowColor?: string;
  /**
   * 「컬러」아코디언으로 감춤 (기본 true).
   * false면 칩을 항상 펼친 채로 표시.
   */
  collapsible?: boolean;
  /** 아코디언 기본 펼침 여부 — collapsible일 때만 */
  defaultExpanded?: boolean;
};

function ColorSectionGlyph({ isDark }: { isDark: boolean }) {
  return <StationeryCaptionIcon kind="face" color={isDark ? '#C69AB0' : '#F2B8C8'} size={26} />;
}

/** 포스트잇 면 색 프리셋 칩 (전역·그룹 공용) */
export function PostItFaceColorChips({
  selectedId,
  isDark,
  ink,
  onSelect,
  compact = false,
  shadowColor: _shadowColor,
  collapsible = true,
  defaultExpanded = false,
}: Props) {
  const { t } = useTranslation();
  const muted = isDark ? 'rgba(250,250,250,0.62)' : 'rgba(0,0,0,0.45)';

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

  const chips = (
    <View style={[styles.root, compact && !collapsible && styles.rootCompact, collapsible && styles.rootInAccordion]}>
      <PostItColorPalette value={selectedId === 'white' ? null : selectedId} onChange={(id) => onSelect(id ?? 'white')} isDark={isDark} />
    </View>
  );

  if (!collapsible) return chips;

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
        style={styles.sectionHeader}>
        <ColorSectionGlyph isDark={isDark} />
        <ThemedText style={[styles.sectionTitle, { color: ink }]} numberOfLines={1}>
          {t('dayPlan.colorSectionTitle')}
        </ThemedText>
        <Reanimated.View style={chevronStyle}>
          <RoutineActionIcon name="expand" size={19} color={muted} />
        </Reanimated.View>
      </Pressable>
      {accordion.mounted ? (
        <Reanimated.View style={accordion.panelStyle}>
          <View
            style={styles.measureBody}
            onLayout={(e) => {
              accordion.onContentLayout(e.nativeEvent.layout.height);
            }}>
            {chips}
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
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 18,
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
  root: {
    width: '100%',
    marginBottom: 4,
  },
  rootCompact: {
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  rootInAccordion: {
    paddingTop: 4,
    paddingHorizontal: 12,
    paddingBottom: 10,
    marginBottom: 0,
  },
  measureBody: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  rowCompact: {
    gap: 7,
  },
  swatchShell: {
    position: 'relative',
  },
  swatchShellSelected: {
    zIndex: 1,
  },
  swatchShadow: {
    ...StyleSheet.absoluteFill,
    borderRadius: 0,
  },
  swatchFace: {
    ...StyleSheet.absoluteFill,
    borderRadius: 0,
    zIndex: 1,
  },
});
