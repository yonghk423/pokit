import Constants from 'expo-constants';
import { isDevice } from 'expo-device';
import { Platform } from 'react-native';
import { getAppLocale } from '@shared/lib/i18n';

export type HeroAiNotification = { token: string; locale: string };
/** Permission/token failure must never prevent image generation. */
export async function prepareHeroAiNotification(): Promise<HeroAiNotification | undefined> {
  if (Platform.OS === 'web' || !isDevice) return;
  try {
    // Load only when generation is requested, including on older native builds.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const notifications = require('expo-notifications') as typeof import('expo-notifications');
    if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('hero-ai', { name: 'Image generation', importance: notifications.AndroidImportance.DEFAULT });
    let permission = await notifications.getPermissionsAsync();
    if (!permission.granted && permission.canAskAgain) permission = await notifications.requestPermissionsAsync();
    if (!permission.granted) return;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const push = await Promise.race([
        notifications.getExpoPushTokenAsync({ projectId }),
        new Promise<undefined>(resolve => { timer = setTimeout(() => resolve(undefined), 8000); }),
      ]);
      return push ? { token: push.data, locale: getAppLocale() } : undefined;
    } finally { if (timer) clearTimeout(timer); }
  } catch { return; }
}
