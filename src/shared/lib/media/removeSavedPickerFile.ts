import * as fs from 'expo-file-system/legacy';

/** The caller has finished saving the selection and no longer uses its picker URI. */
export async function removeSavedPickerFile(uri: string) {
  if (!fs.cacheDirectory) return;
  const root = fs.cacheDirectory + 'ImagePicker/';
  if (!uri.startsWith(root) || !/^[\w-]+\.(?:jpe?g|png|heic|heif|webp|gif|avif)$/i.test(uri.slice(root.length))) return;
  await fs.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}
