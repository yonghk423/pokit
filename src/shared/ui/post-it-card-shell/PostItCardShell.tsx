import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** 클래식 포스트잇 옐로우 — 캔어리에 가까운 쨍한 노랑 */
export const POST_IT_YELLOW_LIGHT = '#FFE566';
export const POST_IT_YELLOW_DARK = '#8A7618';

/** 포스트잇 솔리드 음영 — 검정 (시티팝 민트 섀도와 구분) */
export const POST_IT_SOLID_SHADOW = '#000000';

const SHADOW = 3;
const SHADOW_COMPACT = 2;

type Props = {
  isDark: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 카드 면 색 — 기본 포스트잇 옐로우 */
  faceColor?: string;
  /** 솔리드 섀도 색 — 기본 검정 */
  shadowColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** 작은 칩/탭용 — 테이프·여백 축소, 폭은 내용에 맞춤 */
  compact?: boolean;
};

/**
 * 포스트잇 카드 셸 — 테이프·각진 모서리·솔리드 음영(테두리 없음)·옐로우 면.
 */
export function PostItCardShell({
  isDark,
  children,
  style,
  faceColor,
  shadowColor,
  contentStyle,
  compact = false,
}: Props) {
  const face = faceColor ?? (isDark ? POST_IT_YELLOW_DARK : POST_IT_YELLOW_LIGHT);
  const shadow = shadowColor ?? POST_IT_SOLID_SHADOW;
  const offset = compact ? SHADOW_COMPACT : SHADOW;
  const tape = isDark ? 'rgba(255,229,102,0.28)' : 'rgba(255,255,255,0.7)';

  return (
    <View
      style={[
        styles.outer,
        compact ? styles.outerCompact : styles.outerFull,
        { marginRight: offset, marginBottom: offset },
        style,
      ]}>
      <View
        pointerEvents="none"
        style={[styles.tapeWrap, compact && styles.tapeWrapCompact]}>
        <View
          style={[styles.tape, compact && styles.tapeCompact, { backgroundColor: tape }]}
        />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.solidShadow,
          compact && styles.solidShadowCompact,
          {
            backgroundColor: shadow,
            transform: [{ translateX: offset }, { translateY: offset }],
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
    paddingTop: 6,
  },
  outerFull: {
    width: '100%',
  },
  outerCompact: {
    alignSelf: 'flex-start',
    paddingTop: 4,
  },
  tapeWrap: {
    position: 'absolute',
    top: 0,
    left: 10,
    zIndex: 3,
    alignItems: 'flex-start',
  },
  tape: {
    width: 64,
    height: 18,
    borderRadius: 0,
    transform: [{ rotate: '-2deg' }],
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(44,42,41,0.18)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 1,
        shadowRadius: 1.5,
      },
      android: { elevation: 1 },
      default: {},
    }),
  },
  tapeCompact: {
    width: 28,
    height: 10,
    transform: [{ rotate: '-3deg' }],
  },
  tapeWrapCompact: {
    left: 6,
  },
  solidShadow: {
    ...StyleSheet.absoluteFillObject,
    top: 6,
    borderRadius: 0,
    zIndex: 0,
  },
  solidShadowCompact: {
    top: 4,
  },
  face: {
    borderRadius: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
});
