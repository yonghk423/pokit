import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { useWallpaperStore } from '../../lib/wallpaper/wallpaperStore';
export const WARM_IVORY_PAPER = require('../../../../assets/control-illustrations/warm-ivory-paper-v2.webp');
export function AppWallpaperBackground() {
  const wallpaper = useWallpaperStore(state => state.wallpaper);
  return wallpaper === 'warm-ivory' ? <Image testID="warm-ivory-background" pointerEvents="none" source={WARM_IVORY_PAPER} contentFit="cover" style={StyleSheet.absoluteFill} /> : null;
}
