import { Image } from 'expo-image';
import { HERO_CAMERA_IMAGES, type HeroCameraStyle } from '../model/heroCameraStyle';

/** Photorealistic product cutouts for the diary store camera list. */
export function CameraStoreIcon({ camera }: { camera: HeroCameraStyle }) {
  return <Image source={HERO_CAMERA_IMAGES[camera]} contentFit="contain" transition={0} style={{ width: '100%', height: 56 }} accessible={false} />;
}
