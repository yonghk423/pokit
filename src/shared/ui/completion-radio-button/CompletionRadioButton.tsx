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

export const COMPLETION_TOGGLE_ANIM_MS = 280;

/** 라이트 모드 완료 채움 — 검정 사각/원 통일 */
export const COMPLETION_CHECKED_COLOR_LIGHT = '#000000';
export const COMPLETION_CHECKED_COLOR_DARK = '#FAFAFA';

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
  const outerSize = shape === 'square' ? SQUARE_OUTER_SIZE : CIRCLE_OUTER_SIZE;
  const cornerRadius = shape === 'square' ? 0 : outerSize / 2;
  const checkIconSize = shape === 'square' ? SQUARE_CHECK_ICON_SIZE : CHECK_ICON_SIZE;
  const scale = useSharedValue(1);
  const fillScale = useSharedValue(checked ? 1 : 0);
  const prevCheckedRef = useRef(checked);

  const checkIconColor =
    checkedColor.toUpperCase() === '#FAFAFA' || checkedColor.toUpperCase() === '#FFFFFF'
      ? '#09090b'
      : '#FFFFFF';
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
      accessibilityLabel={accessibilityLabel ?? (checked ? '완료 취소' : '완료')}
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
