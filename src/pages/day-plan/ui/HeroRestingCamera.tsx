import { HeroCameraPrintLight } from './HeroCameraPrintLight';
import { HeroCameraMotion } from './HeroCameraMotion';
import { useDiaryTheme } from '../model/diaryTheme';
import { useAppliedDiaryImage } from '../lib/useAppliedDiaryImage';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { HERO_CAMERA_IMAGES, useHeroCameraStyle, type HeroCameraStyle } from '../model/heroCameraStyle';

// Bottom edges of the transparent cutouts on the 75 × 53 camera canvas.
export const cameraFootprints: Record<HeroCameraStyle, { x: number; y: number; radius: number; angle: number }> = {
  'mini-evo': { x: 36, y: 42.5, radius: 24, angle: -3 },
  'mini-12': { x: 38, y: 48.5, radius: 18, angle: 1 },
  'polaroid-now': { x: 34, y: 46, radius: 20, angle: 3 },
  'kodak-mini-shot': { x: 37, y: 47, radius: 21, angle: 4 },
  'leica-sofort-2': { x: 36, y: 45.5, radius: 24, angle: -3 },
};

export function HeroRestingCamera({ dark = false, raised = false, onPhotoWall = false, active = false }: { dark?: boolean; raised?: boolean; onPhotoWall?: boolean; active?: boolean }) {
  const theme = useDiaryTheme('camera');
  const cameraStyle = useHeroCameraStyle();
  const appliedCamera = useAppliedDiaryImage('camera-' + cameraStyle, 'image', HERO_CAMERA_IMAGES[cameraStyle]);
  // Decorative cameras have a taller, centered silhouette than the base camera.
  const foot = theme ? { x: 37.5, y: 49.5, radius: 15, angle: 0 } : cameraFootprints[cameraStyle];
  const levelMiniEvo = !theme && onPhotoWall && cameraStyle === 'mini-evo';
  return <HeroCameraMotion active={active} cameraId={theme?.id ?? cameraStyle}><View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 75 53" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="duvet-camera-cast" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#242720" stopOpacity={dark ? 0.56 : 0.43} />
          <Stop offset="0.48" stopColor="#34372E" stopOpacity={dark ? 0.33 : 0.23} />
          <Stop offset="1" stopColor="#34372E" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="duvet-camera-contact" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#20251E" stopOpacity={0.7} />
          <Stop offset="0.6" stopColor="#30352B" stopOpacity={0.27} />
          <Stop offset="1" stopColor="#30352B" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={foot.x + 2} cy={foot.y + 0.8} rx={foot.radius + 3} ry={3.1} opacity={raised ? 0.85 : 0.72} fill="url(#duvet-camera-cast)" />
      <Ellipse cx={foot.x} cy={foot.y} rx={foot.radius} ry={1.7} rotation={foot.angle} originX={foot.x} originY={foot.y} fill="url(#duvet-camera-contact)" />
    </Svg>
    <Image testID="hero-duvet-camera-image" source={theme?.source ?? appliedCamera} contentFit="contain" cachePolicy="memory-disk" transition={0} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }, levelMiniEvo && { transform: [{ rotate: '2deg' }, { perspective: 220 }, { rotateY: '-6deg' }] }]} />
    {active && <HeroCameraPrintLight testID="hero-camera-print-light" width={75} height={53} />}
  </View></HeroCameraMotion>;
}
