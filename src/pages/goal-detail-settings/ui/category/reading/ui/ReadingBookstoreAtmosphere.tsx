import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

const POKIT4 = require('../../../../../../../assets/pokit4.webp');

type Props = {
  isDark?: boolean;
};

/**
 * 책방 장식 — 루틴 탭 분위기 카드와 같이 모서리에 사각 일러스트만 둔다.
 * 그라데이션·스크림 없음. 터치 비간섭.
 */
export function ReadingBookstoreAtmosphere({ isDark = false }: Props) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.root}>
      <Image
        source={POKIT4}
        style={[styles.card, { opacity: isDark ? 0.55 : 0.88 }]}
        contentFit="cover"
        cachePolicy="memory-disk"
        recyclingKey="reading-bookstore-pokit4"
        transition={0}
        priority="low"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  /** 루틴 탭 bottomRight 슬롯과 비슷한 사각 카드 */
  card: {
    position: 'absolute',
    right: -32,
    bottom: 88,
    width: 168,
    height: 168,
    transform: [{ rotate: '4deg' }],
  },
});
