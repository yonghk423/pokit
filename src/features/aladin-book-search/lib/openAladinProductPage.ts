import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

export async function openAladinProductPage(url: string): Promise<void> {
  const trimmed = url.trim();
  if (trimmed.length === 0) return;

  if (Platform.OS === 'web') {
    await Linking.openURL(trimmed);
    return;
  }

  await openBrowserAsync(trimmed, {
    presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
  });
}
