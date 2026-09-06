import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import {
  POST_IT_FACE_COLOR_PRESETS,
  type PostItFaceColorId,
} from '@shared/lib/storage';
import { POST_IT_SOLID_SHADOW } from '@shared/ui/post-it-card-shell';

const COLOR_LABEL_KEYS: Record<PostItFaceColorId, I18nKey> = {
  yellow: 'catalog.postItColor.yellow',
  mint: 'catalog.postItColor.mint',
  pink: 'catalog.postItColor.pink',
  peach: 'catalog.postItColor.peach',
  lavender: 'catalog.postItColor.lavender',
  white: 'catalog.postItColor.white',
  navy: 'catalog.postItColor.navy',
  darkGreen: 'catalog.postItColor.darkGreen',
};

const SWATCH = 22;
const SWATCH_COMPACT = 20;
const SHADOW = 2;

type Props = {
  selectedId: PostItFaceColorId;
  isDark: boolean;
  ink: string;
  onSelect: (id: PostItFaceColorId) => void;
  /** 카드 헤더 안 — 라벨 없이 컴팩트 */
  compact?: boolean;
  /** 솔리드 음영 색 — 기본 검정 */
  shadowColor?: string;
};

/** 포스트잇 면 색 프리셋 칩 (전역·그룹 공용) */
export function PostItFaceColorChips({
  selectedId,
  isDark,
  ink,
  onSelect,
  compact = false,
  shadowColor,
}: Props) {
  const { t } = useTranslation();
  const shade = shadowColor ?? POST_IT_SOLID_SHADOW;
  const size = compact ? SWATCH_COMPACT : SWATCH;

  return (
    <View
      style={[styles.root, compact && styles.rootCompact]}
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
                color: t(COLOR_LABEL_KEYS[preset.id]),
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
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
    marginBottom: 4,
  },
  rootCompact: {
    marginBottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 10,
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
