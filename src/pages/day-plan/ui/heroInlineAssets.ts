import { Asset } from 'expo-asset';
import * as fs from 'expo-file-system/legacy';
import { HiMelody_400Regular } from '@expo-google-fonts/hi-melody';

export const fontSources = {
  hiMelody: HiMelody_400Regular,
  corncorn: require('../../../../assets/fonts/ownglyph-corncorn/Ownglyph_corncorn-Rg.ttf'),
  cafe24ShiningStar: require('../../../../assets/fonts/cafe24-shiningstar/Cafe24Shiningstar-v2.0.otf'),
  cafe24Syongsyong: require('../../../../assets/fonts/cafe24-syongsyong/Cafe24Syongsyong-v2.0.otf'),
  schoolNalgae: require('../../../../assets/fonts/school-nalgae/HakgyoansimNalgaeR.ttf'),
  schoolKkokkoma: require('../../../../assets/fonts/school-kkokkoma/TTHakgyoansimKkokkomaR.ttf'),
  singleDay: require('../../../../assets/fonts/single-day/SingleDay-Regular.ttf'),
  schoolGongryongal: require('../../../../assets/fonts/school-gongryongal/HakgyoansimGongryongalR.ttf'),
};
const dataUris = new Map<number, Promise<string>>();
export async function assetDataUri(source: number) {
  const cached = dataUris.get(source);
  if (cached) return cached;
  const pending = (async () => {
    const asset = await Asset.fromModule(source).downloadAsync();
    const data = await fs.readAsStringAsync(asset.localUri ?? asset.uri, { encoding: fs.EncodingType.Base64 });
    return `data:${['webp', 'png', 'jpg', 'jpeg'].includes(asset.type) ? `image/${asset.type === 'jpg' ? 'jpeg' : asset.type}` : 'font/ttf'};base64,${data}`;
  })();
  dataUris.set(source, pending);
  try { return await pending; } catch (error) { dataUris.delete(source); throw error; }
}
