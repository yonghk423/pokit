import { Image } from 'expo-image';
import { Platform } from 'react-native';
import { configureImageCache, IMAGE_DISK_CACHE_LIMIT } from './imageCachePolicy';

jest.mock('expo-image', () => ({ Image: { configureCache: jest.fn(), clearDiskCache: jest.fn() } }));
const originalOS = Platform.OS;
afterEach(() => {
  Object.defineProperty(Platform, 'OS', { value: originalOS });
  jest.clearAllMocks();
});

it('limits the iOS renderer cache without clearing it', () => {
  Object.defineProperty(Platform, 'OS', { value: 'ios' });
  configureImageCache();
  expect(IMAGE_DISK_CACHE_LIMIT).toBe(52428800);
  expect(Image.configureCache).toHaveBeenCalledWith({ maxDiskSize: 52428800 });
  expect(Image.clearDiskCache).not.toHaveBeenCalled();
});

it('does not call the iOS-only API on Android', () => {
  Object.defineProperty(Platform, 'OS', { value: 'android' });
  configureImageCache();
  expect(Image.configureCache).not.toHaveBeenCalled();
});
