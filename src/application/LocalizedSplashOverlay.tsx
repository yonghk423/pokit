import { useCallback, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { detectDeviceLanguageTag, resolveAppLocaleFromLanguageTag } from '@shared/lib/i18n/model/locale';
import { SPLASH_BACKGROUND_COLOR, getSplashImageSource } from './splashAssets';

type Props = {
  /** 이미지 로딩이 끝나 네이티브 시작 화면을 내려도 될 때 호출. */
  onReady?: () => void;
};

/** 앱과 동일한 기기 언어 판별로 한국어 / 영어 이미지를 선택한다. */
export function LocalizedSplashOverlay({ onReady }: Props) {
  const [locale] = useState(() => resolveAppLocaleFromLanguageTag(detectDeviceLanguageTag()));
  const readySent = useRef(false);

  const handleLoad = useCallback(() => {
    if (readySent.current) return;
    readySent.current = true;
    onReady?.();
  }, [onReady]);

  return (
    <View
      style={[styles.root, { backgroundColor: SPLASH_BACKGROUND_COLOR }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <Image
        source={getSplashImageSource(locale)}
        style={styles.image}
        resizeMode="contain"
        onLoadEnd={handleLoad}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
