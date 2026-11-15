import { useEffect, useState } from 'react';
import { HiMelody_400Regular, useFonts } from '@expo-google-fonts/hi-melody';
import * as Font from 'expo-font';

const optionalFonts: Record<string, () => Promise<void>> = {
  cafe24Syongsyong: () => Font.loadAsync({
    Cafe24Syongsyong: require('../../assets/fonts/cafe24-syongsyong/Cafe24Syongsyong-v2.0.otf'),
  }),
  schoolNalgae: () => Font.loadAsync({
    'HakgyoansimNalgaeR': require('../../assets/fonts/school-nalgae/HakgyoansimNalgaeR.ttf'),
  }),
  schoolKkokkoma: () => Font.loadAsync({
    'TTHakgyoansimKkokkomaR': require('../../assets/fonts/school-kkokkoma/TTHakgyoansimKkokkomaR.ttf'),
  }),
  singleDay: () => Font.loadAsync({
    'SingleDay-Regular': require('../../assets/fonts/single-day/SingleDay-Regular.ttf'),
  }),
  schoolGongryongal: () => Font.loadAsync({
    'HakgyoansimGongryongalR': require('../../assets/fonts/school-gongryongal/HakgyoansimGongryongalR.ttf'),
  }),
};
const fontLoads = new Map<string, Promise<void>>();

export function loadCityPopFont(fontId: string): Promise<void> {
  const loader = optionalFonts[fontId];
  if (!loader) return Promise.resolve();
  const pending = fontLoads.get(fontId);
  if (pending) return pending;
  const loading = loader().catch(error => {
    fontLoads.delete(fontId);
    throw error;
  });
  fontLoads.set(fontId, loading);
  return loading;
}

export async function loadCityPopFontPreviews(): Promise<void> {
  await Promise.all(Object.keys(optionalFonts).map(loadCityPopFont));
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
    void loadCityPopFontPreviews()
      .then(() => setSelectedFontLoaded(true))
      .catch(() => setSelectedFontLoaded(false));
  }, [loaded]);

  return loaded && selectedFontLoaded;
}
