import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { RETRO_BORDER_WIDTH, RetroFlatColors } from '@shared/config/retroFlat';

const SHADOW = 3;

type Props = {
  isDark: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 카드 면 색 — 기본 화이트 / 다크 surfaceAlt */
  faceColor?: string;
  /** 솔리드 섀도 색 — 기본 민트(라이트) / primary(다크) */
  shadowColor?: string;
  /** face 안쪽 패딩을 셸이 담당할 때 */
  contentStyle?: StyleProp<ViewStyle>;
};

/** Flat Brutalism Lite 카드 — 2px 보더 + 솔리드 오프셋 섀도 */
export function CityPopCardShell({
  isDark,
  children,
  style,
  faceColor,
  shadowColor,
  contentStyle,
}: Props) {
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const border = tone.border;
  const face = faceColor ?? (isDark ? tone.surfaceAlt : '#FFFFFF');
  const shadow = shadowColor ?? (isDark ? tone.solidShadow : tone.primary);

  return (
    <View
      style={[
        styles.outer,
        { marginRight: SHADOW, marginBottom: SHADOW },
        style,
      ]}>
      <View
        pointerEvents="none"
        style={[
          styles.shadow,
          {
            backgroundColor: shadow,
            borderColor: border,
            transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
          },
        ]}
      />
      <View style={[styles.face, { backgroundColor: face, borderColor: border }, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
    width: '100%',
  },
  shadow: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
  },
  face: {
    borderWidth: RETRO_BORDER_WIDTH,
    borderRadius: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
});
