import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { PUZZLE_POSTIT_HEIGHT, PUZZLE_POSTIT_WIDTH } from '@entities/puzzle-history';

const BOARD_ASPECT = PUZZLE_POSTIT_HEIGHT / PUZZLE_POSTIT_WIDTH;

type Props = {
  isDark?: boolean;
  /** 고정 폭. 없으면 가로 100% */
  width?: number;
};

/**
 * 펼침 보드가 디코드·마운트되는 동안 보이는 스켈레톤.
 * 보드 비율(세로형) + 네이티브 펄스만.
 */
export function PuzzleBoardSkeleton({ isDark = false, width }: Props) {
  const opacity = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.88,
          duration: 640,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.42,
          duration: 640,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  const face = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.07)';
  const paper = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.92)';

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.root,
        width != null ? { width } : styles.flexWidth,
        { aspectRatio: 1 / BOARD_ASPECT, opacity },
      ]}>
      <View style={[styles.board, { backgroundColor: isDark ? '#2C2D33' : '#F5F4F2' }]}>
        <View style={[styles.tile, styles.t1, { backgroundColor: paper, borderColor: face }]} />
        <View style={[styles.tile, styles.t2, { backgroundColor: paper, borderColor: face }]} />
        <View style={[styles.tile, styles.t3, { backgroundColor: paper, borderColor: face }]} />
        <View style={[styles.tile, styles.t4, { backgroundColor: paper, borderColor: face }]} />
        <View style={[styles.tile, styles.t5, { backgroundColor: paper, borderColor: face }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
  },
  flexWidth: {
    width: '100%',
  },
  board: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  tile: {
    position: 'absolute',
    borderWidth: 1,
  },
  t1: { left: '6%', top: '5%', width: '48%', height: '32%', transform: [{ rotate: '-1.5deg' }] },
  t2: { left: '42%', top: '4%', width: '50%', height: '30%', transform: [{ rotate: '1.8deg' }] },
  t3: { left: '8%', top: '30%', width: '44%', height: '36%', transform: [{ rotate: '0.8deg' }] },
  t4: { left: '40%', top: '28%', width: '52%', height: '38%', transform: [{ rotate: '-1.2deg' }] },
  t5: { left: '18%', top: '58%', width: '58%', height: '34%', transform: [{ rotate: '1.4deg' }] },
});
