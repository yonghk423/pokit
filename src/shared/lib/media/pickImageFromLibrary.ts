import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  copyAsync,
  documentDirectory,
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
  try {
    await copyAsync({ from: trimmed, to: dest });
    return dest;
  } catch {
    return trimmed;
  }
}

export type PickImageFromLibraryResult =
  | { ok: true; uri: string }
  | { ok: false; reason: 'cancelled' | 'permission_denied' | 'module_unavailable' | 'error' };

export async function pickImageFromLibrary(): Promise<PickImageFromLibraryResult> {
  if (!isImagePickerNativeModuleAvailable()) {
    return { ok: false, reason: 'module_unavailable' };
  }

  try {
    const ImagePicker = await import('expo-image-picker');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { ok: false, reason: 'permission_denied' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets[0]?.uri) {
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
