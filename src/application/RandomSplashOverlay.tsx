import { useCallback, useRef } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

import { SPLASH_BACKGROUND_COLOR, SPLASH_IMAGE_SOURCES } from './splashAssets';

type Props = {
  /** 그리드 이미지가 화면에 그려져 네이티브 스플래시를 내려도 안전할 때 호출 */
  onReady?: () => void;
};

const GAP = 12;
const PAD_H = 24;
const PAD_V = 40;
const COLS = 2;
const ROWS = 3;

/** 포스트잇 면 — 퍼즐 벽과 동일 계열 (회색빛 화이트) */
const NOTE_FACE = '#FFFFFF';
/** 셀마다 살짝만 기울기 (고정, 불규칙 난잡함 없이) */
const CELL_TILTS = [-2.2, 1.8, 2.4, -1.6, -2.0, 1.4] as const;

const SPLASH_ROWS = Array.from({ length: ROWS }, (_, rowIndex) =>
  SPLASH_IMAGE_SOURCES.slice(rowIndex * COLS, rowIndex * COLS + COLS),
);

/** 네이티브 스플래시 위에 덮어, 6장 스플래시를 포스트잇 격자로 보여 준다. */
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
            {row.map((source, colIndex) => {
              const index = rowIndex * COLS + colIndex;
              const tilt = CELL_TILTS[index] ?? 0;
              return (
                <View
                  key={`cell-${rowIndex}-${colIndex}`}
                  style={[
                    styles.noteOuter,
                    { transform: [{ rotate: `${tilt}deg` }] },
                  ]}>
                  <View style={styles.tape} />
                  <View style={styles.noteFace}>
                    <Image
                      source={source}
                      style={styles.image}
                      resizeMode="cover"
                      onLoad={handleLoad}
                    />
                  </View>
                </View>
              );
            })}
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
  noteOuter: {
    flex: 1,
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: NOTE_FACE,
    borderRadius: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 2, height: 3 },
        shadowOpacity: 0.16,
        shadowRadius: 3.5,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  tape: {
    position: 'absolute',
    top: -3,
    left: -1,
    width: 26,
    height: 9,
    zIndex: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.78)',
    opacity: 0.94,
    transform: [{ rotate: '-28deg' }],
  },
  noteFace: {
    flex: 1,
    margin: 7,
    marginTop: 10,
    overflow: 'hidden',
    backgroundColor: '#F5F4F2',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
