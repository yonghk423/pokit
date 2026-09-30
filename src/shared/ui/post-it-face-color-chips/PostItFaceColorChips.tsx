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
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import {
  POST_IT_FACE_COLOR_PRESETS,
  type PostItFaceColorId,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { POST_IT_SOLID_SHADOW } from '@shared/ui/post-it-card-shell';
import { ThemedText } from '@shared/ui/themed-text';

const SWATCH = 22;
const SWATCH_COMPACT = 20;
const SHADOW = 2;
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
  return (
    <View
      style={styles.glyph}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={[styles.glyphChipShell, { left: 0, top: 4 }]}>
        <View pointerEvents="none" style={styles.glyphChipShadow} />
        <View
          style={[
            styles.glyphChipFace,
            { backgroundColor: isDark ? 'rgba(147,180,232,0.92)' : '#B7D0F5' },
          ]}
        />
      </View>
      <View style={[styles.glyphChipShell, { right: 0, top: 0 }]}>
        <View pointerEvents="none" style={styles.glyphChipShadow} />
        <View
          style={[
            styles.glyphChipFace,
            { backgroundColor: isDark ? 'rgba(236,170,186,0.95)' : '#F0B8C6' },
          ]}
        />
      </View>
    </View>
  );
}

/** 포스트잇 면 색 프리셋 칩 (전역·그룹 공용) */
export function PostItFaceColorChips({
  selectedId,
  isDark,
  ink,
  onSelect,
  compact = false,
  shadowColor,
  collapsible = true,
  defaultExpanded = false,
}: Props) {
  const { t } = useTranslation();
  const shade = shadowColor ?? POST_IT_SOLID_SHADOW;
  const size = compact ? SWATCH_COMPACT : SWATCH;
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
    <View
      style={[
        styles.root,
        compact && !collapsible && styles.rootCompact,
        collapsible && styles.rootInAccordion,
      ]}
      accessibilityRole="toolbar"
      accessibilityLabel={t('catalog.postItColorTitle')}>
      <View style={[styles.row, compact && styles.rowCompact]}>
        {POST_IT_FACE_COLOR_PRESETS.map((preset) => {
          const selected = preset.id === selectedId;
          const swatch = isDark ? preset.dark : preset.light;
          return (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t('catalog.postItColorOptionA11y', {
                color: t(`catalog.postItColor.${preset.id}` as I18nKey),
              })}
              hitSlop={compact ? 4 : 6}
              onPress={() => {
                if (selected) return;
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(preset.id);
              }}
              style={({ pressed }) => [
                styles.swatchShell,
                {
                  width: size,
                  height: size,
                  marginRight: SHADOW,
                  marginBottom: SHADOW,
                },
                selected && styles.swatchShellSelected,
                pressed && { opacity: 0.88, transform: [{ translateX: 1 }, { translateY: 1 }] },
              ]}>
              <View
                pointerEvents="none"
                style={[
                  styles.swatchShadow,
                  {
                    backgroundColor: shade,
                    transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
                  },
                ]}
              />
              <View
                style={[
                  styles.swatchFace,
                  {
                    backgroundColor: swatch,
                    borderColor: selected ? ink : 'transparent',
                    borderWidth: selected ? 2 : 0,
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
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
          <IconSymbol name="chevron.down" size={11} color={muted} />
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
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.18)',
    transform: [{ translateX: 1.5 }, { translateY: 1.5 }],
  },
  glyphChipFace: {
    ...StyleSheet.absoluteFillObject,
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
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
  },
  swatchFace: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 0,
    zIndex: 1,
  },
});
