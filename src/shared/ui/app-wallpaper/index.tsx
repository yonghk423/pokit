import { Image, StyleSheet, View } from 'react-native';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { LINEN_WALLPAPER, useWallpaperStore } from '@shared/lib/wallpaper/wallpaperStore';

/** Decorative app background; record paper and photo pixels are independent. */
export function AppWallpaperBackground() {
  const wallpaper = useWallpaperStore(state => state.wallpaper);
  const dark = useColorScheme() === 'dark';
  if (wallpaper === 'default') return null;
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
    <Image source={LINEN_WALLPAPER} resizeMode="cover" style={StyleSheet.absoluteFill} />
    {dark ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,18,16,0.78)' }]} /> : null}
  </View>;
}
