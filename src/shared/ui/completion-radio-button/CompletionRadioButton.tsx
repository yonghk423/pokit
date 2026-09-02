import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';

export const COMPLETION_TOGGLE_ANIM_MS = 280;

/** 라이트 모드 완료 채움 — Soft Mint (`primaryContainer`) */
export const COMPLETION_CHECKED_COLOR_LIGHT = RetroFlatColors.light.primaryContainer;
/** 다크 모드 완료 채움 — Soft Mint (`primaryContainer`) */
export const COMPLETION_CHECKED_COLOR_DARK = RetroFlatColors.dark.primaryContainer;

const CIRCLE_OUTER_SIZE = 30;
const SQUARE_OUTER_SIZE = 20;
const HIT_SIZE = 44;
const BORDER_WIDTH = 2.5;
const CHECK_ICON_SIZE = 18;
const SQUARE_CHECK_ICON_SIZE = 14;

const EASE_OUT = Easing.out(Easing.cubic);
const FILL_IN_MS = 220;
const FILL_OUT_MS = 160;
const PRESS_IN_MS = 90;
const PRESS_OUT_MS = 140;

/** 완료 채움 위 체크 아이콘 색 — 밝은 민트면 검정, 어두운 채움이면 흰색 */
export function completionCheckIconColor(fill: string): string {
  const raw = fill.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{6})$/i.exec(raw);
  if (hex) {
    const n = hex[1]!;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#09090b' : '#FFFFFF';
  }
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(raw);
  if (rgb) {
    const luminance =
      (0.299 * Number(rgb[1]) + 0.587 * Number(rgb[2]) + 0.114 * Number(rgb[3])) / 255;
    return luminance > 0.55 ? '#09090b' : '#FFFFFF';
  }
  const u = fill.toUpperCase();
  if (u === '#FAFAFA' || u === '#FFFFFF' || u === '#A8DADC') return '#09090b';
  return '#FFFFFF';
}

type Props = {
  checked: boolean;
  isDark: boolean;
  /** circle: 목록 행 · square: 시간대별 타임라인 */
  shape?: 'circle' | 'square';
  checkedColor?: string;
  uncheckedColor?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function CompletionRadioButton({
  checked,
  isDark,
  shape = 'circle',
  checkedColor = isDark ? COMPLETION_CHECKED_COLOR_DARK : COMPLETION_CHECKED_COLOR_LIGHT,
  uncheckedColor,
  onPress,
  accessibilityLabel,
}: Props) {
  const { t } = useTranslation();
  const outerSize = shape === 'square' ? SQUARE_OUTER_SIZE : CIRCLE_OUTER_SIZE;
  const cornerRadius = shape === 'square' ? 0 : outerSize / 2;
  const checkIconSize = shape === 'square' ? SQUARE_CHECK_ICON_SIZE : CHECK_ICON_SIZE;
  const scale = useSharedValue(1);
  const fillScale = useSharedValue(checked ? 1 : 0);
  const prevCheckedRef = useRef(checked);

  const checkIconColor = completionCheckIconColor(checkedColor);
  const borderIdle =
    uncheckedColor ??
    (isDark ? 'rgba(255,255,255,0.42)' : '#9CA3AF');

  useEffect(() => {
    const wasChecked = prevCheckedRef.current;
    prevCheckedRef.current = checked;

    if (checked && !wasChecked) {
      fillScale.value = 0;
      fillScale.value = withTiming(1, { duration: FILL_IN_MS, easing: EASE_OUT });
      scale.value = withTiming(1, { duration: FILL_IN_MS, easing: EASE_OUT });
      return;
    }

    if (!checked && wasChecked) {
      fillScale.value = withTiming(0, { duration: FILL_OUT_MS, easing: EASE_OUT });
      scale.value = withTiming(1, { duration: PRESS_OUT_MS, easing: EASE_OUT });
      return;
    }

    fillScale.value = checked ? 1 : 0;
  }, [checked, fillScale, scale]);

  const rootAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fillScale.value }],
    opacity: fillScale.value,
  }));

  const handlePress = () => {
    if (!checked) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      void Haptics.selectionAsync();
    }
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel ?? (checked ? t('common.completeCancel') : t('common.complete'))}
      hitSlop={6}
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withTiming(0.96, { duration: PRESS_IN_MS, easing: EASE_OUT });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: PRESS_OUT_MS, easing: EASE_OUT });
      }}
      style={styles.hit}>
      <Reanimated.View
        style={[styles.visualWrap, { width: outerSize, height: outerSize }, rootAnimatedStyle]}>
        {checked ? (
          <Reanimated.View
            style={[
              styles.checkedFill,
              {
                width: outerSize,
                height: outerSize,
                borderRadius: cornerRadius,
                backgroundColor: checkedColor,
              },
              fillAnimatedStyle,
            ]}>
            <MaterialIcons name="check" size={checkIconSize} color={checkIconColor} />
          </Reanimated.View>
        ) : (
          <View
            style={[
              styles.uncheckedOutline,
              {
                width: outerSize,
                height: outerSize,
                borderRadius: cornerRadius,
                borderColor: borderIdle,
              },
            ]}
          />
        )}
      </Reanimated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: HIT_SIZE,
    height: HIT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visualWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckedOutline: {
    borderWidth: BORDER_WIDTH,
    backgroundColor: 'transparent',
  },
  checkedFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
