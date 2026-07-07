import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { MealSlotTimelinePalette } from './MealSlotTimelineView';

const CARD_RADIUS = 12;
const THIN_BORDER = 1;

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
  };
}

/** 구간 타임라인 — 구간 시간 설정 버튼 */
export function MealSlotScheduleEditButton({
  palette,
  isDark,
  onPress,
  compact = false,
  showLabel = false,
  accessibilityLabel = '구간 시간 설정',
}: Props) {
  const colors = cardFaceColors(isDark);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="새벽·아침·점심·저녁·밤 구간 시작 시각을 변경할 수 있어요"
      hitSlop={6}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.root,
        compact && styles.rootCompact,
        {
          borderColor: colors.border,
          backgroundColor: colors.face,
        },
        pressed && styles.pressed,
      ]}>
      <IconSymbol name="clock" size={compact ? 11 : 13} color={palette.ink} />
      {showLabel ? (
        <ThemedText style={[styles.label, { color: palette.ink }]}>구간 시간 설정</ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
    minHeight: 32,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: CARD_RADIUS,
    borderWidth: THIN_BORDER,
  },
  rootCompact: {
    minHeight: 28,
    minWidth: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  pressed: {
    opacity: 0.72,
  },
});
