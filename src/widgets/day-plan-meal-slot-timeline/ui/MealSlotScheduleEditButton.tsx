import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { MealSlotTimelinePalette } from './MealSlotTimelineView';

const SHADOW_SM = 2;

type Props = {
  palette: MealSlotTimelinePalette;
  isDark: boolean;
  onPress: () => void;
  compact?: boolean;
  showLabel?: boolean;
  accessibilityLabel?: string;
};

function cardFaceColors(isDark: boolean) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    face: isDark ? c.surfaceAlt : '#FFFFFF',
    border: isDark ? c.border : '#000000',
    shadow: isDark ? c.solidShadow : c.text,
  };
}

/** 구간 타임라인 — 시간대 변경 버튼 */
export function MealSlotScheduleEditButton({
  palette,
  isDark,
  onPress,
  compact = false,
  showLabel = false,
  accessibilityLabel,
}: Props) {
  const { t } = useTranslation();
  const resolvedA11y = accessibilityLabel ?? t('dayPlan.mealSlotScheduleA11y');
  const colors = cardFaceColors(isDark);

  return (
    <View
      style={[
        styles.shell,
        { marginRight: SHADOW_SM, marginBottom: SHADOW_SM },
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            backgroundColor: colors.shadow,
            borderColor: colors.border,
            transform: [{ translateX: SHADOW_SM }, { translateY: SHADOW_SM }],
          },
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={resolvedA11y}
        accessibilityHint={t('dayPlan.mealSlotScheduleHint')}
        hitSlop={6}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.root,
          compact && !showLabel && styles.rootCompactIconOnly,
          compact && showLabel && styles.rootCompactWithLabel,
          {
            borderColor: colors.border,
            backgroundColor: pressed
              ? isDark
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(168, 218, 220, 0.35)'
              : colors.face,
          },
          pressed && styles.pressed,
        ]}>
        <IconSymbol name="clock" size={compact ? 11 : 12} color={palette.ink} />
        {showLabel ? (
          <ThemedText style={[styles.label, compact && styles.labelCompact, { color: palette.ink }]}>
            {t('dayPlan.mealSlotScheduleA11y')}
          </ThemedText>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    flexShrink: 0,
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderRadius: 0,
  },
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    minHeight: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 0,
    borderWidth: 1,
    zIndex: 1,
  },
  rootCompactIconOnly: {
    minHeight: 28,
    minWidth: 28,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  rootCompactWithLabel: {
    minHeight: 28,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  labelCompact: {
    fontSize: 10,
  },
  pressed: {
    opacity: 0.92,
  },
});
