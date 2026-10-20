import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/hanken-grotesk';

import { HiMelody_400Regular } from '@expo-google-fonts/hi-melody';

/** 앱 UI와 선택용 글꼴 로드 */
export function useCityPopFonts(): boolean {
  const [loaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    HiMelody_400Regular,
    SebangGothic2_Regular: require('../../assets/fonts/sebang-gothic-2/SebangGothic2-Regular.otf'),
    SebangGothic2_Bold: require('../../assets/fonts/sebang-gothic-2/SebangGothic2-Bold.otf'),
  });
  return loaded;
}
