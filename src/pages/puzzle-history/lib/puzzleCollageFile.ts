import {
  EncodingType,
  cacheDirectory,
  copyAsync,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

import { PUZZLE_POSTIT_HEIGHT, PUZZLE_POSTIT_WIDTH } from '@entities/puzzle-history';

import { puzzleShareFileBase } from './shareCompletedPuzzleImage';

const EXPORT_DIR = 'pokit-collage-export';

/** 공유용 콜라주 긴 변. 화면 비율 1000×1200 을 유지한다. */
export const COLLAGE_EXPORT_WIDTH = 1200;
export const COLLAGE_EXPORT_HEIGHT = Math.round(
  (COLLAGE_EXPORT_WIDTH * PUZZLE_POSTIT_HEIGHT) / PUZZLE_POSTIT_WIDTH,
);

function mimeForUri(uri: string): string {
  const clean = uri.split('?')[0]?.toLowerCase() ?? '';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

async function localImageFile(imageUri: string): Promise<string | null> {
  const source = imageUri.trim();
  if (!source || !cacheDirectory) return null;
  const dir = `${cacheDirectory}${EXPORT_DIR}/`;
  await makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}source.jpg`;
  if (/^https?:\/\//i.test(source)) {
    const downloaded = await downloadAsync(source, dest);
    return downloaded.uri || dest;
  }
  if (!source.startsWith('file:') && !source.startsWith('content:')) return null;
  if (source === dest) return dest;
  await copyAsync({ from: source, to: dest });
  const info = await getInfoAsync(dest);
  return info.exists ? dest : null;
}

export async function readPuzzleImageBase64(
  imageUri: string,
): Promise<{ base64: string; mime: string } | null> {
  const fileUri = await localImageFile(imageUri);
  if (!fileUri) return null;
  const base64 = await readAsStringAsync(fileUri, { encoding: EncodingType.Base64 });
  if (!base64) return null;
  return { base64, mime: mimeForUri(imageUri) };
}

export async function writeCollageJpeg(base64: string, title: string): Promise<string | null> {
  const data = base64.trim();
  if (!data || !cacheDirectory) return null;
  const dir = `${cacheDirectory}${EXPORT_DIR}/`;
  await makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${puzzleShareFileBase(title)}-collage.jpg`;
  await writeAsStringAsync(dest, data, { encoding: EncodingType.Base64 });
  const info = await getInfoAsync(dest);
  return info.exists ? dest : null;
}
