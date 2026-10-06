import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const ROW_HEIGHT = 64;

type Props = {
  count: number;
  isDark: boolean;
};

/** 목록이 나눠 그려지는 동안 보여주는 행 스켈레톤. 펄스는 네이티브 스레드에서만 돈다. */
export function ListRowSkeletonStack({ count, isDark }: Props) {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 680,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 680,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  if (count <= 0) return null;

  const face = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)';
  const line = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ opacity }}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          style={[styles.row, { borderBottomColor: line }]}>
          <View style={[styles.mark, { backgroundColor: face }]} />
          <View style={styles.textCol}>
            <View style={[styles.bar, styles.barTitle, { backgroundColor: face }]} />
            <View style={[styles.bar, styles.barHint, { backgroundColor: face }]} />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mark: {
    width: 26,
    height: 26,
  },
  textCol: {
    flex: 1,
    gap: 8,
  },
  bar: {
    height: 10,
    borderRadius: 2,
  },
  barTitle: {
    width: '58%',
  },
  barHint: {
    width: '34%',
    height: 8,
    opacity: 0.7,
  },
});
