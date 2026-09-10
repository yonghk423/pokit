import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { RetroFlatColors } from '@shared/config/retroFlat';

import { routineAtmosphereAssets } from './routineAtmosphereAssets';

const HOLD_MS = 3200;
const FADE_OUT_MS = 480;
const FADE_IN_MS = 560;
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

type Props = {
  isDark?: boolean;
  /** 화면 배경색 — PNG 면색과의 이질감을 스크림으로 녹임 */
  blendColor?: string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * `assets/routine` PNG를 오른쪽 여백에서 한 장씩 페이드 인/아웃.
 * 장식용(absolute 오버레이) — 터치/텍스트 레이아웃에 간섭하지 않음.
 */
export function RoutineMarginSlideshow({
  isDark = false,
  blendColor,
  width = 148,
  height = 164,
  style,
}: Props) {
  const gradientId = useId().replace(/:/g, '');
  const sources = useMemo(() => Object.values(routineAtmosphereAssets), []);
  const [index, setIndex] = useState(0);
  const opacity = useSharedValue(0);
  const scrim = blendColor ?? (isDark ? RetroFlatColors.dark.bg : RetroFlatColors.light.bg);

  const bumpIndex = useCallback(() => {
    setIndex((i) => (i + 1) % Math.max(sources.length, 1));
  }, [sources.length]);

  useEffect(() => {
    if (sources.length === 0) return;
    opacity.value = withTiming(1, { duration: FADE_IN_MS, easing: EASE });

    const id = setInterval(() => {
      opacity.value = withTiming(0, { duration: FADE_OUT_MS, easing: EASE }, (finished) => {
        if (!finished) return;
        runOnJS(bumpIndex)();
        opacity.value = withTiming(1, { duration: FADE_IN_MS, easing: EASE });
      });
    }, HOLD_MS);

    return () => clearInterval(id);
  }, [bumpIndex, opacity, sources.length]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value * (isDark ? 0.55 : 0.7),
  }));

  if (sources.length === 0) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, { width, height, backgroundColor: scrim }, style]}>
      <Animated.View style={[styles.fade, fadeStyle]}>
        <Image
          source={sources[index]}
          style={styles.image}
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={0}
        />
        {/* 좌측(텍스트 쪽)부터 배경색으로 녹여 사각 박스감 완화 */}
        <Svg width="100%" height="100%" style={styles.scrim} pointerEvents="none">
          <Defs>
            <LinearGradient id={`${gradientId}-x`} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={scrim} stopOpacity="1" />
              <Stop offset="0.38" stopColor={scrim} stopOpacity="0.72" />
              <Stop offset="0.72" stopColor={scrim} stopOpacity="0.28" />
              <Stop offset="1" stopColor={scrim} stopOpacity="0.08" />
            </LinearGradient>
            <LinearGradient id={`${gradientId}-y`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={scrim} stopOpacity="0.55" />
              <Stop offset="0.2" stopColor={scrim} stopOpacity="0" />
              <Stop offset="0.8" stopColor={scrim} stopOpacity="0" />
              <Stop offset="1" stopColor={scrim} stopOpacity="0.5" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId}-x)`} />
          <Rect width="100%" height="100%" fill={`url(#${gradientId}-y)`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fade: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
});
