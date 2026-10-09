import { useCallback, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { SPLASH_BACKGROUND_COLOR, SPLASH_COLLAGE_SOURCE } from './splashAssets';

type Props = {
  /** 콜라주가 화면에 그려져 네이티브 스플래시를 내려도 안전할 때 호출 */
  onReady?: () => void;
};

/**
 * 네이티브 스플래시와 동일하게 9칸 루틴 콜라주를 풀스크린으로 보여 준다.
 */
export function RandomSplashOverlay({ onReady }: Props) {
  const readySent = useRef(false);

  const handleLoad = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    onReady?.();
  }, [onReady]);

  return (
    <View
      pointerEvents="none"
      style={[styles.root, { backgroundColor: SPLASH_BACKGROUND_COLOR }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Image
        source={SPLASH_COLLAGE_SOURCE}
        style={styles.image}
        resizeMode="contain"
        onLoad={handleLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
