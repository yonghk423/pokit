import * as Linking from 'expo-linking';

export async function openOpenLibraryBookPage(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;
  const canOpen = await Linking.canOpenURL(trimmed);
  if (!canOpen) return;
  await Linking.openURL(trimmed);
}
