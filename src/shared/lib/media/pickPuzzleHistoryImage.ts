import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  copyAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

import {
  isImagePickerNativeModuleAvailable,
  resolveLocalImageExtension,
} from './pickImageFromLibrary';
import {
  PUZZLE_IMAGE_COMPRESS,
  PUZZLE_IMAGE_MAX_EDGE,
  PUZZLE_THUMB_COMPRESS,
  PUZZLE_THUMB_EDGE,
  puzzleImageDownscaleWidth,
} from './puzzleHistoryImageOptimize';

const PUZZLE_IMAGE_SUBDIR = 'puzzle-history-images';
const IMAGE_PICKER_NATIVE_MODULE = 'ExponentImagePicker';
const IMAGE_MANIPULATOR_NATIVE_MODULE = 'ExpoImageManipulator';

function isImageManipulatorNativeModuleAvailable(): boolean {
  return requireOptionalNativeModule(IMAGE_MANIPULATOR_NATIVE_MODULE) != null;
}

function isNativeModuleMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ExponentImagePicker|ImageManipulator|Cannot find native module/i.test(message);
}

export function buildPuzzleHistoryImageDestUri(
  sourceUri: string,
  now = Date.now(),
  tag: 'full' | 'thumb' = 'full',
): string {
  const ext = resolveLocalImageExtension(sourceUri);
  const dir = `${documentDirectory ?? ''}${PUZZLE_IMAGE_SUBDIR}/`;
  return `${dir}puzzle_${tag}_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export async function persistPuzzleHistoryImageUri(
  sourceUri: string,
  tag: 'full' | 'thumb' = 'full',
): Promise<string> {
  const trimmed = sourceUri.trim();
  if (!trimmed) {
    throw new Error('empty image uri');
  }

  const dir = `${documentDirectory ?? ''}${PUZZLE_IMAGE_SUBDIR}/`;
  if (!documentDirectory) {
    return trimmed;
  }

  if (trimmed.startsWith(dir)) {
    return trimmed;
  }

  await makeDirectoryAsync(dir, { intermediates: true });
  const dest = buildPuzzleHistoryImageDestUri(trimmed, Date.now(), tag);
  await copyAsync({ from: trimmed, to: dest });
  const copied = await getInfoAsync(dest);
  if (!copied.exists) {
    throw new Error('copied image file does not exist');
  }
  return dest;
}

/**
 * Metro 번들 asset·원격 URI는 FileSystem으로 존재 여부를 알 수 없다.
 * (목업 seed의 `Image.resolveAssetSource` 결과가 http(s)인 경우가 대표적)
 * 이런 URI는 로드 가능으로 보고, 실제 실패는 Image onError로 처리한다.
 */
export function isPuzzleHistoryFilesystemUri(uri: string): boolean {
  const trimmed = uri.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return false;
  if (/^asset:/i.test(trimmed)) return false;
  if (trimmed.startsWith('file:///pokit-mock-puzzle/')) return false;
  return trimmed.startsWith('file:') || trimmed.startsWith('content:');
}

/** 앱 문서 폴더에 복사해 둔 퍼즐 원본/썸네일만 — 여기만 디스크 존재 검사를 한다. */
export function isPersistedPuzzleHistoryImageUri(uri: string): boolean {
  const trimmed = uri.trim();
  if (!trimmed || !documentDirectory) return false;
  const dir = `${documentDirectory}${PUZZLE_IMAGE_SUBDIR}/`;
  return trimmed.startsWith(dir);
}

/**
 * 깨진 사진 판정.
 * - 사진첩에서 지워도, 시작 시 앱 폴더로 복사된 파일은 그대로 보여야 한다.
 * - 존재 검사는 `puzzle-history-images/` 아래 URI만 한다.
 * - 그 외(번들·Metro·임시 picker URI)는 true — 실제 실패는 Image onError로.
 */
export async function puzzleHistoryImageExists(uri: string): Promise<boolean> {
  const trimmed = uri.trim();
  if (!trimmed) return false;
  if (!isPersistedPuzzleHistoryImageUri(trimmed)) {
    return true;
  }
  try {
    const info = await getInfoAsync(trimmed);
    return Boolean(info.exists);
  } catch {
    return false;
  }
}

export type PickPuzzleHistoryImageResult =
  | { ok: true; uri: string; thumbnailUri: string }
  | { ok: false; reason: 'cancelled' | 'permission_denied' | 'module_unavailable' | 'error' };

async function persistOriginalAsPair(
  sourceUri: string,
): Promise<{ uri: string; thumbnailUri: string }> {
  try {
    const uri = await persistPuzzleHistoryImageUri(sourceUri, 'full');
    return { uri, thumbnailUri: uri };
  } catch {
    return { uri: sourceUri, thumbnailUri: sourceUri };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * 정사각 crop → 긴 변 ≤1080 리사이즈 → 240 썸네일 분리 후 앱 문서 폴더에 저장.
 * 실패·타임아웃 시 원본 저장으로 폴백해 시작 플로우가 멈추지 않게 한다.
 */
export async function optimizePuzzleHistoryImagePair(
  sourceUri: string,
  sourceWidth?: number,
  sourceHeight?: number,
): Promise<{ uri: string; thumbnailUri: string }> {
  // 네이티브 미포함 빌드에서 requireNativeModule 이 Uncaught redbox 를 띄우지 않게
  // JS 패키지를 로드하기 전에 먼저 가용 여부를 본다.
  if (!isImageManipulatorNativeModuleAvailable()) {
    return persistOriginalAsPair(sourceUri);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ImageManipulator =
      require('expo-image-manipulator') as typeof import('expo-image-manipulator');

    const w = sourceWidth ?? PUZZLE_IMAGE_MAX_EDGE;
    const h = sourceHeight ?? PUZZLE_IMAGE_MAX_EDGE;
    const downscaleW = puzzleImageDownscaleWidth(w, h, PUZZLE_IMAGE_MAX_EDGE);
    const fullActions =
      downscaleW != null ? ([{ resize: { width: downscaleW } }] as const) : [];

    const full = await withTimeout(
      ImageManipulator.manipulateAsync(sourceUri, [...fullActions], {
        compress: PUZZLE_IMAGE_COMPRESS,
        format: ImageManipulator.SaveFormat.JPEG,
      }),
      20_000,
      'puzzle-full-optimize',
    );

    const thumb = await withTimeout(
      ImageManipulator.manipulateAsync(
        full.uri,
        [{ resize: { width: PUZZLE_THUMB_EDGE } }],
        {
          compress: PUZZLE_THUMB_COMPRESS,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      ),
      15_000,
      'puzzle-thumb-optimize',
    );

    const uri = await persistPuzzleHistoryImageUri(full.uri, 'full');
    let thumbnailUri = uri;
    try {
      thumbnailUri = await persistPuzzleHistoryImageUri(thumb.uri, 'thumb');
    } catch {
      thumbnailUri = uri;
    }
    return { uri, thumbnailUri };
  } catch {
    return persistOriginalAsPair(sourceUri);
  }
}

/**
 * History용 정사각 사진 선택.
 * ImagePicker allowsEditing + aspect로 crop 후 리사이즈·썸네일 분리.
 */
export async function pickPuzzleHistoryImage(): Promise<PickPuzzleHistoryImageResult> {
  if (!isImagePickerNativeModuleAvailable()) {
    return { ok: false, reason: 'module_unavailable' };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ImagePicker = require('expo-image-picker') as typeof import('expo-image-picker');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, reason: 'permission_denied' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return { ok: false, reason: 'cancelled' };
    }

    const asset = result.assets[0];
    const pair = await optimizePuzzleHistoryImagePair(
      asset.uri,
      asset.width,
      asset.height,
    );
    return { ok: true, ...pair };
  } catch (error) {
    if (
      isNativeModuleMissingError(error) ||
      requireOptionalNativeModule(IMAGE_PICKER_NATIVE_MODULE) == null
    ) {
      return { ok: false, reason: 'module_unavailable' };
    }
    return { ok: false, reason: 'error' };
  }
}

export {
  PUZZLE_BOARD_THUMB_WIDTH_MAX,
  PUZZLE_IMAGE_MAX_EDGE,
  PUZZLE_THUMB_EDGE,
  puzzleImageDownscaleWidth,
  resolvePuzzleBoardImageUri,
} from './puzzleHistoryImageOptimize';
