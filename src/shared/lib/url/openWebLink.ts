import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

export function normalizeWebUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function openWebLink(raw: string): Promise<boolean> {
  const url = normalizeWebUrl(raw);
  if (!url) return false;

  try {
    if (Platform.OS === 'web') {
      await Linking.openURL(url);
      return true;
    }
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
    return true;
  } catch {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) return false;
      await Linking.openURL(url);
      return true;
    } catch {
      return false;
    }
  }
}
