import { type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { RetroFlatColors } from '@shared/config/retroFlat';
import { POST_IT_SOLID_SHADOW } from '@shared/ui/post-it-card-shell';

const SHADOW = 3;

type Props = {
  isDark: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 카드 면 색 — 기본 화이트 / 다크 surfaceAlt */
  faceColor?: string;
  /** 솔리드 섀도 색 — 기본 검정 */
  shadowColor?: string;
  /** face 안쪽 패딩을 셸이 담당할 때 */
  contentStyle?: StyleProp<ViewStyle>;
};

/** Flat Brutalism Lite 카드 — 솔리드 오프셋 음영만 (테두리 없음) */
export function CityPopCardShell({
  isDark,
  children,
  style,
  faceColor,
  shadowColor,
  contentStyle,
}: Props) {
  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const face = faceColor ?? (isDark ? tone.surfaceAlt : '#FFFFFF');
  const shadow = shadowColor ?? POST_IT_SOLID_SHADOW;

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
            transform: [{ translateX: SHADOW }, { translateY: SHADOW }],
          },
        ]}
      />
      <View style={[styles.face, { backgroundColor: face }, contentStyle]}>{children}</View>
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
    borderWidth: 0,
    borderRadius: 0,
  },
  face: {
    borderWidth: 0,
    borderRadius: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
});
