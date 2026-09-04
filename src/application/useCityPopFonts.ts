import {
  HankenGrotesk_400Regular,
  HankenGrotesk_500Medium,
  HankenGrotesk_600SemiBold,
  HankenGrotesk_700Bold,
  HankenGrotesk_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/hanken-grotesk';
import {
  Dongle_300Light,
  Dongle_400Regular,
  Dongle_700Bold,
} from '@expo-google-fonts/dongle';
import {
  Gaegu_300Light,
  Gaegu_400Regular,
  Gaegu_700Bold,
} from '@expo-google-fonts/gaegu';
import {
  GothicA1_400Regular,
  GothicA1_500Medium,
  GothicA1_600SemiBold,
  GothicA1_700Bold,
  GothicA1_800ExtraBold,
} from '@expo-google-fonts/gothic-a1';
import { HiMelody_400Regular } from '@expo-google-fonts/hi-melody';
import { SongMyung_400Regular } from '@expo-google-fonts/song-myung';

/** City Pop 타이포 + 선택용 디스플레이 폰트 로드 */
export function useCityPopFonts(): boolean {
  const [loaded] = useFonts({
    HankenGrotesk_400Regular,
    HankenGrotesk_500Medium,
    HankenGrotesk_600SemiBold,
    HankenGrotesk_700Bold,
    HankenGrotesk_800ExtraBold,
    Dongle_300Light,
    Dongle_400Regular,
    Dongle_700Bold,
    Gaegu_300Light,
    Gaegu_400Regular,
    Gaegu_700Bold,
    SongMyung_400Regular,
    GothicA1_400Regular,
    GothicA1_500Medium,
    GothicA1_600SemiBold,
    GothicA1_700Bold,
    GothicA1_800ExtraBold,
    HiMelody_400Regular,
  });
  return loaded;
}
