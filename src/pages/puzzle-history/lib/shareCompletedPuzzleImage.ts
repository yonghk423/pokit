import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  cacheDirectory,
  copyAsync,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import { Platform, Share } from 'react-native';

import { resolveLocalImageExtension } from '@shared/lib/media/pickImageFromLibrary';

const SHARE_DIR = 'pokit-share';
/** 버튼 onPress 직후 시트를 열면 iOS가 터치를 닫기로 처리해 바로 사라진다. */
const SHARE_PRESENT_DELAY_MS = 350;

export function puzzleShareFileBase(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[\\/:*?"<>|\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  return cleaned || 'POKIT';
}

/** `URLWithString` 이 거절하는 공백·비ASCII 를 퍼센트 인코딩한다. */
export function shareableFileUrl(fileUri: string): string {
  return encodeURI(fileUri.trim());
}

/**
 * 기기에서 `localhost` 에셋 주소는 폰 자신을 가리킨다.
 * Metro 호스트로 바꿔야 개발 빌드 사진을 받을 수 있다.
 */
export function rewriteLoopbackAssetUri(uri: string, packagerHost: string | null): string {
  const host = packagerHost?.trim() ?? '';
  if (!host || /^(localhost|127\.0\.0\.1)(:|$)/i.test(host)) return uri;
  return uri.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(:\d+)?/i, `$1${host}`);
}

function currentPackagerHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;
  if (typeof hostUri !== 'string') return null;
  const host = hostUri.replace(/^https?:\/\//, '').split('/')[0]?.trim() ?? '';
  return host || null;
}

function isRemoteUri(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

async function materializeShareFile(imageUri: string): Promise<string | null> {
  const source = rewriteLoopbackAssetUri(imageUri.trim(), currentPackagerHost());
  const root = cacheDirectory;
  if (!source || !root) return null;
  const dir = `${root}${SHARE_DIR}/`;
  await makeDirectoryAsync(dir, { intermediates: true });
  const ext = resolveLocalImageExtension(source);
  const dest = `${dir}puzzle.${ext}`;
  if (isRemoteUri(source)) {
    const downloaded = await downloadAsync(source, dest);
    return downloaded.uri || dest;
  }
  if (!source.startsWith('file:') && !source.startsWith('content:')) return null;
  if (source === dest) return dest;
  await copyAsync({ from: source, to: dest });
  const info = await getInfoAsync(dest);
  return info.exists ? dest : null;
}

async function toJpegFile(sourceUri: string): Promise<string> {
  if (requireOptionalNativeModule('ExpoImageManipulator') == null) return sourceUri;
  try {
    const ImageManipulator =
      require('expo-image-manipulator') as typeof import('expo-image-manipulator');
    const rendered = await ImageManipulator.manipulateAsync(sourceUri, [], {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    const uri = rendered.uri?.trim();
    return uri || sourceUri;
  } catch {
    return sourceUri;
  }
}

function waitForSharePresentation(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, SHARE_PRESENT_DELAY_MS);
  });
}

export type ShareCompletedPuzzleImageResult = 'shared' | 'dismissed' | 'failed';

/** 이미 로컬에 있는 이미지 파일을 iOS 공유 시트로 연다. */
export async function shareLocalImageFile(
  fileUri: string,
): Promise<ShareCompletedPuzzleImageResult> {
  const uri = fileUri.trim();
  if (!uri || Platform.OS !== 'ios') return 'failed';
  try {
    await waitForSharePresentation();
    const result = await Share.share({ url: shareableFileUrl(uri) });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'failed';
  }
}

/**
 * 완성된 퍼즐의 원본 사진을 시스템 공유 시트로 연다.
 * iOS에서는 파일로 저장·사진 앱·다른 앱 전송이 한 시트에 있다.
 */
export async function shareCompletedPuzzleImage(input: {
  imageUri: string;
  title: string;
}): Promise<ShareCompletedPuzzleImageResult> {
  try {
    const fileUri = await materializeShareFile(input.imageUri);
    if (!fileUri) return 'failed';
    const jpegUri = await toJpegFile(fileUri);
    return shareLocalImageFile(jpegUri);
  } catch {
    return 'failed';
  }
}
