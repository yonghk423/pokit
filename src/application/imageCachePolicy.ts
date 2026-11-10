import { Image } from 'expo-image';
import { Platform } from 'react-native';

export const IMAGE_DISK_CACHE_LIMIT = 50 * 1024 * 1024;

/** Configure the renderer's eviction policy; never delete application documents. */
export function configureImageCache(): void {
  if (Platform.OS !== 'ios') return;
  try {
    // SDWebImage enforces this target during its normal expiry/background cleanup.
    Image.configureCache({ maxDiskSize: IMAGE_DISK_CACHE_LIMIT, maxMemoryCost: 32 * 1024 * 1024, maxMemoryCount: 80 });
  } catch (error) {
    // Older development clients may not expose this native SDK method yet.
    if (__DEV__) console.warn('[ImageCache] Cache limit could not be configured', error);
  }
}
