import { useCallback, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { SPLASH_BACKGROUND_COLOR, SPLASH_IMAGE_SOURCES } from './splashAssets';

type Props = {
  /** 그리드 이미지가 화면에 그려져 네이티브 스플래시를 내려도 안전할 때 호출 */
  onReady?: () => void;
};

const GAP = 10;
const PAD_H = 24;
const PAD_V = 40;
const COLS = 2;
const ROWS = 3;

const SPLASH_ROWS = Array.from({ length: ROWS }, (_, rowIndex) =>
  SPLASH_IMAGE_SOURCES.slice(rowIndex * COLS, rowIndex * COLS + COLS),
);

/** 네이티브 스플래시 위에 덮어, 6장 스플래시를 고정 2열×3행으로 보여 준다. */
export function RandomSplashOverlay({ onReady }: Props) {
  const loadedCount = useRef(0);
  const readySent = useRef(false);

  const handleLoad = useCallback(() => {
    loadedCount.current += 1;
    if (readySent.current) return;
    if (loadedCount.current < SPLASH_IMAGE_SOURCES.length) return;
    readySent.current = true;
    onReady?.();
  }, [onReady]);

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { backgroundColor: SPLASH_BACKGROUND_COLOR }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <View style={styles.grid}>
        {SPLASH_ROWS.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((source, colIndex) => (
              <View key={`cell-${rowIndex}-${colIndex}`} style={styles.cell}>
                <Image
                  source={source}
                  style={styles.image}
                  resizeMode="cover"
                  onLoad={handleLoad}
                />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PAD_H,
    paddingVertical: PAD_V,
  },
  grid: {
    width: '100%',
    maxWidth: 420,
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    gap: GAP,
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
