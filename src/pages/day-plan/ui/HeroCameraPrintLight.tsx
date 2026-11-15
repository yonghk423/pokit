import { proDiaryCatalog } from '../model/proDiaryCatalog';
import { useDiaryTheme } from '../model/diaryTheme';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { HERO_CAMERA_IMAGES, useHeroCameraStyle, type HeroCameraStyle } from '../model/heroCameraStyle';

// Pixel centers measured on each bundled product cutout, including its transparent padding.
const lamps: Record<HeroCameraStyle, { x: number; y: number; diameter: number }> = {
  'mini-12': { x: 240, y: 111, diameter: 9 },
  'mini-evo': { x: 367, y: 73, diameter: 8 },
  'polaroid-now': { x: 365, y: 198, diameter: 9 },
  'kodak-mini-shot': { x: 243, y: 125, diameter: 8 },
  'leica-sofort-2': { x: 404, y: 114, diameter: 9 },
};

const themedLamps: Record<string, { x: number; y: number }> = {
  "decor-berry-camera": {
    "x": 0.2053,
    "y": 0.5556
  },
  "decor-cat-camera": {
    "x": 0.1709,
    "y": 0.5278
  },
  "decor-chick-camera": {
    "x": 0.2329,
    "y": 0.6
  },
  "decor-ribbon-camera": {
    "x": 0.19,
    "y": 0.6111
  },
  "decor-shell-camera": {
    "x": 0.2008,
    "y": 0.5389
  },
  "decor-stamp-camera": {
    "x": 0.1823,
    "y": 0.5
  },
  "mini-bunny": {
    "x": 0.1701,
    "y": 0.4833
  },
  "mini-mail": {
    "x": 0.16,
    "y": 0.5116
  },
  "mini-toast": {
    "x": 0.1551,
    "y": 0.6167
  }
};

export function HeroCameraPrintLight({ width, height, testID }: { width: number; height: number; testID?: string }) {
  const theme = useDiaryTheme('camera');
  const camera = useHeroCameraStyle();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.25, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 160, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);
  const themedItem = theme && proDiaryCatalog.find(item => item.id === theme.id && item.category === 'camera');
  const asset = Image.resolveAssetSource(themedItem?.preview ?? HERO_CAMERA_IMAGES[camera]);
  const scale = Math.min(width / asset.width, height / asset.height);
  const themedLamp = theme?.id ? themedLamps[theme.id] : undefined;
  const lamp = themedLamp
    ? { x: themedLamp.x * asset.width, y: themedLamp.y * asset.height, diameter: asset.width * 0.04 }
    : theme
      ? { x: asset.width * 0.24, y: asset.height * 0.48, diameter: asset.width * 0.04 }
      : lamps[camera];
  const diameter = Math.max(3, lamp.diameter * scale);
  const left = (width - asset.width * scale) / 2 + lamp.x * scale - diameter / 2;
  const top = (height - asset.height * scale) / 2 + lamp.y * scale - diameter / 2;
  return <Animated.View testID={testID} pointerEvents="none" accessible={false} style={{ position: 'absolute', left, top, width: diameter, height: diameter, opacity: pulse }}>
    <View style={{ position: 'absolute', left: -3, top: -3, width: diameter + 6, height: diameter + 6, borderRadius: (diameter + 6) / 2, backgroundColor: '#FF302D', opacity: 0.25 }} />
    <View style={{ width: diameter, height: diameter, borderRadius: diameter / 2, backgroundColor: '#FF5148', shadowColor: '#FF211D', shadowOpacity: 1, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }} />
  </Animated.View>;
}
