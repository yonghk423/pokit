import { type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

/** 클래식 포스트잇 화이트 — 기본 면 */
export const POST_IT_WHITE_LIGHT = '#FFFFFF';
export const POST_IT_WHITE_DARK = '#3A3C52';

/** @deprecated 옐로우 프리셋 유지용 — 기본 면은 화이트 */
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
  /** 카드 면 색 — 기본 포스트잇 화이트 */
  faceColor?: string;
  /** 솔리드 섀도 색 — 기본 검정 */
  shadowColor?: string;
  contentStyle?: StyleProp<ViewStyle>;
  /** 작은 칩/탭용 — 테이프·여백 축소, 폭은 내용에 맞춤 */
  compact?: boolean;
  /** 면 테두리 — 흰 면+밝은 배경에서 윤곽이 필요할 때 */
  borderColor?: string;
  borderWidth?: number;
  /**
   * 솔리드(각진 오프셋) 음영. false면 테두리·솔리드 바 없이 소프트 드롭 섀도만.
   * @default true
   */
  solidShadow?: boolean;
  /** 솔리드 음영 오프셋(px). 생략 시 compact면 2, 아니면 3 */
  shadowOffset?: number;
  /** 상단 테이프. false면 숨김 (이미지 풀블리드 카드 등) */
  showTape?: boolean;
};

/**
 * 포스트잇 카드 셸 — 테이프·각진 모서리·솔리드 음영·화이트 면.
 */
export function PostItCardShell({
  isDark,
  children,
  style,
  faceColor,
  shadowColor,
  contentStyle,
  compact = false,
  borderColor,
  borderWidth = 0,
  solidShadow = true,
  shadowOffset,
  showTape = true,
}: Props) {
  const face = faceColor ?? (isDark ? POST_IT_WHITE_DARK : POST_IT_WHITE_LIGHT);
  const shadow = shadowColor ?? POST_IT_SOLID_SHADOW;
  const offset = shadowOffset ?? (compact ? SHADOW_COMPACT : SHADOW);
  const tape = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.78)';
  const outlineW = solidShadow && borderColor ? Math.max(borderWidth, 1) : 0;
  const tapePad = showTape ? (compact ? 4 : 6) : 0;

  return (
    <View
      style={[
        styles.outer,
        compact ? styles.outerCompact : styles.outerFull,
        { paddingTop: tapePad },
        solidShadow ? { marginRight: offset, marginBottom: offset } : null,
        style,
      ]}>
      {showTape ? (
        <View
          pointerEvents="none"
          style={[styles.tapeWrap, compact && styles.tapeWrapCompact]}>
          <View
            style={[styles.tape, compact && styles.tapeCompact, { backgroundColor: tape }]}
          />
        </View>
      ) : null}
      {solidShadow ? (
        <View
          pointerEvents="none"
          style={[
            styles.solidShadow,
            { top: tapePad },
            {
              backgroundColor: shadow,
              transform: [{ translateX: offset }, { translateY: offset }],
            },
          ]}
        />
      ) : null}
      <View
        style={[
          styles.face,
          {
            backgroundColor: face,
            borderColor: outlineW > 0 ? (borderColor ?? 'transparent') : 'transparent',
            borderWidth: outlineW,
            // soft shadow는 overflow:hidden 이면 잘림
            overflow: solidShadow ? 'hidden' : 'visible',
          },
          !solidShadow && styles.faceSoftShadow,
          contentStyle,
        ]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'relative',
  },
  outerFull: {
    width: '100%',
  },
  outerCompact: {
    alignSelf: 'flex-start',
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
    borderRadius: 0,
    zIndex: 0,
  },
  face: {
    borderRadius: 0,
    overflow: 'hidden',
    zIndex: 1,
  },
  faceSoftShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.16,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
});
