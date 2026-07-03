import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import type { AppVersionManifestStoreUrls } from './appVersionManifest';

function resolveStoreUrl(storeUrls: AppVersionManifestStoreUrls): string | null {
  if (Platform.OS === 'ios') {
    return storeUrls.ios ?? null;
  }
  if (Platform.OS === 'android') {
    const androidPackage = Constants.expoConfig?.android?.package ?? 'com.yonghee.pokit';
    return storeUrls.android ?? `https://play.google.com/store/apps/details?id=${androidPackage}`;
  }
  return null;
}

export async function openAppStoreListing(
  storeUrls: AppVersionManifestStoreUrls,
): Promise<boolean> {
  const url = resolveStoreUrl(storeUrls);
  if (!url) return false;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) return false;
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
