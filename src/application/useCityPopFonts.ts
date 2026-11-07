import { useEffect, useState } from 'react';
import { HiMelody_400Regular, useFonts } from '@expo-google-fonts/hi-melody';
import * as Font from 'expo-font';

import { loadAppFontId } from '@shared/lib/storage';

let syongsyongLoad: Promise<void> | undefined;

export function loadCityPopFont(fontId: string): Promise<void> {
  if (fontId !== 'cafe24Syongsyong') return Promise.resolve();
  syongsyongLoad ??= Font.loadAsync({
    Cafe24Syongsyong: require('../../assets/fonts/cafe24-syongsyong/Cafe24Syongsyong-v2.0.otf'),
  });
  return syongsyongLoad;
}

/** 앱 UI와 선택용 글꼴 로드 */
export function useCityPopFonts(): boolean {
  const [loaded] = useFonts({
    HiMelody_400Regular,
    OwnglyphCorncorn_400Regular: require('../../assets/fonts/ownglyph-corncorn/Ownglyph_corncorn-Rg.ttf'),
    Cafe24Shiningstar: require('../../assets/fonts/cafe24-shiningstar/Cafe24Shiningstar-v2.0.otf'),
  });
  const [selectedFontLoaded, setSelectedFontLoaded] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    void loadCityPopFont(loadAppFontId())
      .then(() => setSelectedFontLoaded(true))
      .catch(() => setSelectedFontLoaded(false));
  }, [loaded]);

  return loaded && selectedFontLoaded;
}
