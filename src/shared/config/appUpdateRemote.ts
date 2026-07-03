import Constants from 'expo-constants';

export const DEFAULT_APP_UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/yonghk423/pokit/main/remote-config/latest-app-version.json';

export function resolveAppUpdateManifestUrl(): string {
  const fromExtra = Constants.expoConfig?.extra?.appUpdateManifestUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim()) {
    return fromExtra.trim();
  }
  return DEFAULT_APP_UPDATE_MANIFEST_URL;
}
