import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { RETRO_BORDER_WIDTH } from '@shared/config/retroFlat';
import { IconSymbol } from '@shared/ui/icon-symbol';

type Props = {
  kind: 'sun' | 'moon';
  size: number;
  left: number;
  top: number;
  backgroundColor: string;
  borderColor: string;
  iconColor: string;
  iconSize: number;
  active?: boolean;
};

/** 해는 천천히 돌고, 달은 살짝 흔들린다. */
export function DialHandleBadge({
  kind,
  size,
  left,
  top,
  backgroundColor,
  borderColor,
  iconColor,
  iconSize,
  active = false,
}: Props) {
  const spin = useSharedValue(0);
  const wave = useSharedValue(0);

  useEffect(() => {
    spin.value = 0;
    wave.value = 0;
    if (kind === 'sun') {
      spin.value = withRepeat(
        withTiming(1, {
          duration: active ? 4200 : 10000,
          easing: Easing.linear,
        }),
        -1,
        false,
      );
    }
    wave.value = withRepeat(
      withTiming(1, {
        duration: active ? 900 : 2200,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [active, kind, spin, wave]);

  const iconStyle = useAnimatedStyle(() => {
    if (kind === 'sun') {
      return {
        transform: [
          { rotate: `${spin.value * 360}deg` },
          { scale: 1 + wave.value * (active ? 0.1 : 0.06) },
        ],
      };
    }
    return {
      transform: [
        { rotate: `${-8 + wave.value * 16}deg` },
        { translateY: -wave.value * (active ? 2.4 : 1.6) },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left,
          top,
          backgroundColor,
          borderColor,
        },
      ]}>
      <Reanimated.View style={iconStyle}>
        <IconSymbol
          name={kind === 'sun' ? 'sun.max.fill' : 'moon.fill'}
          size={iconSize}
          color={iconColor}
          weight="semibold"
        />
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: RETRO_BORDER_WIDTH,
    zIndex: 2,
  },
});
