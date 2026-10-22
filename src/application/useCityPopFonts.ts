import { HiMelody_400Regular, useFonts } from '@expo-google-fonts/hi-melody';

/** 앱 UI와 선택용 글꼴 로드 */
export function useCityPopFonts(): boolean {
  const [loaded] = useFonts({
    HiMelody_400Regular,
    GriunKimjungwon_400Regular: require('../../assets/fonts/griun-kimjungwon/Griun_Kimjungwon-Rg.ttf'),
    OwnglyphCorncorn_400Regular: require('../../assets/fonts/ownglyph-corncorn/Ownglyph_corncorn-Rg.ttf'),
  });
  return loaded;
}
