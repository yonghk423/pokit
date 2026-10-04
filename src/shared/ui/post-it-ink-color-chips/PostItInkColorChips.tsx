import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import {
  POST_IT_INK_COLOR_PRESETS,
  type PostItInkColorId,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { POST_IT_SOLID_SHADOW } from '@shared/ui/post-it-card-shell';

const SWATCH = 20;
const SHADOW = 1;

type Props = {
  selectedId: PostItInkColorId;
  /** 선택 테두리·자동 칩 아이콘 */
  chromeInk: string;
  onSelect: (id: PostItInkColorId) => void;
  shadowColor?: string;
};

/** 포스트잇 글자색 칩 */
export function PostItInkColorChips({
  selectedId,
  chromeInk,
  onSelect,
  shadowColor,
}: Props) {
  const { t } = useTranslation();
  const shade = shadowColor ?? POST_IT_SOLID_SHADOW;

  return (
    <View
      style={styles.row}
      accessibilityRole="toolbar"
      accessibilityLabel={t('dayPlan.quickMemoInkColorLabel')}>
      {POST_IT_INK_COLOR_PRESETS.map((preset) => {
        const selected = preset.id === selectedId;
        const isAuto = preset.id === 'auto';
        return (
          <Pressable
            key={preset.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={t('dayPlan.quickMemoInkColorA11y', {
              color: t(`dayPlan.quickMemoInkSwatch.${preset.id}` as I18nKey),
            })}
            hitSlop={4}
            onPress={() => {
              if (selected) return;
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelect(preset.id);
            }}
            style={({ pressed }) => [
              styles.swatchShell,
              {
                width: SWATCH,
                height: SWATCH,
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
                  backgroundColor: isAuto ? '#F5F2EB' : preset.hex,
                  borderColor: selected ? chromeInk : 'rgba(0,0,0,0.12)',
                  borderWidth: selected ? 2 : 1,
                },
              ]}>
              {isAuto ? (
                <IconSymbol name="circle.lefthalf.filled" size={11} color={chromeInk} />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingBottom: 4,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
