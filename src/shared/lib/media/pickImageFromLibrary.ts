import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  copyAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';

const WORK_STUDY_IMAGE_SUBDIR = 'work-study-images';
const IMAGE_PICKER_NATIVE_MODULE = 'ExponentImagePicker';

export function isImagePickerNativeModuleAvailable(): boolean {
  return requireOptionalNativeModule(IMAGE_PICKER_NATIVE_MODULE) != null;
}

function isNativeModuleMissingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /ExponentImagePicker|Cannot find native module/i.test(message);
}

export function resolveLocalImageExtension(sourceUri: string): string {
  const withoutQuery = sourceUri.split('?')[0] ?? sourceUri;
  const ext = withoutQuery.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'heic' || ext === 'webp') {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'jpg';
}

export function buildWorkStudyImageDestUri(sourceUri: string, now = Date.now()): string {
  const ext = resolveLocalImageExtension(sourceUri);
  const dir = `${documentDirectory ?? ''}${WORK_STUDY_IMAGE_SUBDIR}/`;
  return `${dir}img_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export async function persistLocalImageUri(sourceUri: string): Promise<string> {
  const trimmed = sourceUri.trim();
  if (!trimmed) {
    throw new Error('empty image uri');
  }

  const dir = `${documentDirectory ?? ''}${WORK_STUDY_IMAGE_SUBDIR}/`;
  if (!documentDirectory) {
    return trimmed;
  }

  if (trimmed.startsWith(dir)) {
    return trimmed;
  }

  await makeDirectoryAsync(dir, { intermediates: true });
  const dest = buildWorkStudyImageDestUri(trimmed);
  await copyAsync({ from: trimmed, to: dest });
  const copied = await getInfoAsync(dest);
  if (!copied.exists) {
    throw new Error('copied image file does not exist');
  }
  return dest;
}

export type PickImageFromLibraryResult =
  | { ok: true; uri: string }
  | { ok: false; reason: 'cancelled' | 'permission_denied' | 'module_unavailable' | 'error' };

export async function pickImageFromLibrary(): Promise<PickImageFromLibraryResult> {
  if (!isImagePickerNativeModuleAvailable()) {
    return { ok: false, reason: 'module_unavailable' };
  }

  try {
    // Metro에서 동적 import 청크의 모듈 ID가 HMR 후 유실되는 문제를 피한다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ImagePicker = require('expo-image-picker') as typeof import('expo-image-picker');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, reason: 'permission_denied' };
    }

    /**
     * iOS PHPicker: 단일 선택(기본)만 쓰면 실기기에서 체크만 되고
     * 「추가/완료」가 안 보이는 경우가 있음.
     * selectionLimit: 1 + allowsMultipleSelection 으로 확인 버튼을 항상 노출한다.
     */
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 1,
      preferredAssetRepresentationMode:
        ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      quality: 0.85,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return { ok: false, reason: 'cancelled' };
    }

    const uri = await persistLocalImageUri(result.assets[0].uri);
    return { ok: true, uri };
  } catch (error) {
    if (isNativeModuleMissingError(error)) {
      return { ok: false, reason: 'module_unavailable' };
    }
    return { ok: false, reason: 'error' };
  }
}
