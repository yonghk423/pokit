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

/** 완료 채움 — 검정 원/사각 */
export const COMPLETION_CHECKED_COLOR_LIGHT = '#09090b';
/** 다크 모드도 동일하게 검정 채움 + 민트 체크 */
export const COMPLETION_CHECKED_COLOR_DARK = '#09090b';

/** 완료 체크 아이콘 — Soft Mint */
export const COMPLETION_CHECK_ICON_COLOR = RetroFlatColors.light.bgMint;

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

/** 완료 채움 위 체크 아이콘 색 — 어두운 채움이면 민트, 밝은 채움이면 검정 */
export function completionCheckIconColor(fill: string): string {
  const raw = fill.trim().toLowerCase();
  const hex = /^#?([0-9a-f]{6})$/i.exec(raw);
  if (hex) {
    const n = hex[1]!;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? '#09090b' : COMPLETION_CHECK_ICON_COLOR;
  }
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(raw);
  if (rgb) {
    const luminance =
      (0.299 * Number(rgb[1]) + 0.587 * Number(rgb[2]) + 0.114 * Number(rgb[3])) / 255;
    return luminance > 0.55 ? '#09090b' : COMPLETION_CHECK_ICON_COLOR;
  }
  const u = fill.toUpperCase();
  if (u === '#FAFAFA' || u === '#FFFFFF' || u === '#A8DADC') return '#09090b';
  return COMPLETION_CHECK_ICON_COLOR;
}

type Props = {
  checked: boolean;
  isDark: boolean;
  /** circle: 목록 행 · square: 시간대별 타임라인 */
  shape?: 'circle' | 'square';
  /** 원/사각 외곽 한 변(px). 미지정 시 shape 기본값 */
  size?: number;
  checkedColor?: string;
  uncheckedColor?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function CompletionRadioButton({
  checked,
  isDark,
  shape = 'circle',
  size,
  checkedColor = isDark ? COMPLETION_CHECKED_COLOR_DARK : COMPLETION_CHECKED_COLOR_LIGHT,
  uncheckedColor,
  onPress,
  accessibilityLabel,
}: Props) {
  const { t } = useTranslation();
  const defaultOuter = shape === 'square' ? SQUARE_OUTER_SIZE : CIRCLE_OUTER_SIZE;
  const outerSize = size ?? defaultOuter;
  const cornerRadius = shape === 'square' ? 0 : outerSize / 2;
  const defaultCheck = shape === 'square' ? SQUARE_CHECK_ICON_SIZE : CHECK_ICON_SIZE;
  const checkIconSize =
    size != null ? Math.max(10, Math.round(outerSize * 0.58)) : defaultCheck;
  const borderWidth = outerSize <= 26 ? 2 : BORDER_WIDTH;
  const hitSize = size != null ? outerSize : HIT_SIZE;
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
      style={[styles.hit, { width: hitSize, height: hitSize }]}>
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
                borderWidth,
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
    backgroundColor: 'transparent',
  },
  checkedFill: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
