import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { RETRO_RADIUS, SOLID_SHADOW_OFFSET, cityPopFont } from '@shared/config/retroFlat';

export type SmoothSegmentOption<T extends string> = {
  value: T;
  label: string;
  accessibilityLabel?: string;
};

export type SmoothSegmentedControlProps<T extends string> = {
  options: readonly [SmoothSegmentOption<T>, SmoothSegmentOption<T>];
  value: T;
  onChange: (next: T) => void;
  selectedFill: string;
  trackFill: string;
  selectedInk: string;
  unselectedInk: string;
  shadowColor?: string;
  disabled?: boolean;
  minHeight?: number;
  style?: StyleProp<ViewStyle>;
};

const MOVE_MS = 260;
const EASE = Easing.out(Easing.cubic);
const SHADOW = SOLID_SHADOW_OFFSET;

/**
 * 2옵션 세그먼트 — 민트 필이 미끄러지며 선택 전환 (오전/오후, 당일/다음 날 등).
 */
export function SmoothSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  selectedFill,
  trackFill,
  selectedInk,
  unselectedInk,
  shadowColor = '#000000',
  disabled = false,
  minHeight = 34,
  style,
}: SmoothSegmentedControlProps<T>) {
  const [trackW, setTrackW] = useState(0);
  const selectedIndex = options[0].value === value ? 0 : 1;
  const progress = useSharedValue(selectedIndex);

  useEffect(() => {
    progress.value = withTiming(selectedIndex, { duration: MOVE_MS, easing: EASE });
  }, [progress, selectedIndex]);

  const segmentW = trackW > 0 ? trackW / 2 : 0;

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * segmentW }],
    width: Math.max(segmentW, 0),
  }));

  const leftTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [selectedInk, unselectedInk]),
  }));
  const rightTextStyle = useAnimatedStyle(() => ({
    color: interpolateColor(progress.value, [0, 1], [unselectedInk, selectedInk]),
  }));

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - trackW) > 0.5) setTrackW(w);
  };

  const select = (next: T) => {
    if (disabled || next === value) return;
    void Haptics.selectionAsync().catch(() => undefined);
    onChange(next);
  };

  return (
    <View style={[styles.shell, { marginRight: SHADOW, marginBottom: SHADOW }, style]}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            backgroundColor: shadowColor,
            transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
          },
        ]}
      />
      <View
        style={[styles.track, { backgroundColor: trackFill, minHeight }]}
        onLayout={onTrackLayout}>
        {segmentW > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.pill, { backgroundColor: selectedFill }, pillStyle]}
          />
        ) : null}
        {options.map((opt, index) => {
          const textStyle = index === 0 ? leftTextStyle : rightTextStyle;
          return (
            <Pressable
              key={opt.value}
              accessibilityRole="button"
              accessibilityState={{ selected: value === opt.value, disabled }}
              accessibilityLabel={opt.accessibilityLabel ?? opt.label}
              disabled={disabled}
              onPress={() => select(opt.value)}
              style={({ pressed }) => [
                styles.segment,
                pressed && !disabled && { transform: [{ translateX: 1 }, { translateY: 1 }] },
              ]}>
              <Animated.Text
                style={[styles.label, cityPopFont('800'), textStyle]}
                numberOfLines={1}>
                {opt.label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'relative',
    alignSelf: 'stretch',
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RETRO_RADIUS,
  },
  track: {
    flexDirection: 'row',
    borderRadius: RETRO_RADIUS,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  pill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: RETRO_RADIUS,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    zIndex: 1,
  },
  label: {
    fontSize: 13,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});
