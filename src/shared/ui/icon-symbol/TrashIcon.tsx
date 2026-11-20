import { useAppliedDiaryImage } from '../../../pages/day-plan/lib/useAppliedDiaryImage';
import type { ColorValue } from 'react-native';
import { Image } from 'expo-image';

export const TRASH_ASSETS = {
  mesh: {
    empty: require('../../../../assets/control-illustrations/mesh-trash-bin.webp'),
    filled: require('../../../../assets/control-illustrations/mesh-trash-bin-paper.webp'),
  },
  ivory: {
    empty: require('../../../../assets/control-illustrations/ivory-ceramic-trash-bin.webp'),
    filled: require('../../../../assets/control-illustrations/ivory-ceramic-trash-bin-paper.webp'),
  },
  sage: {
    empty: require('../../../../assets/control-illustrations/sage-enamel-trash-bin.webp'),
    filled: require('../../../../assets/control-illustrations/sage-enamel-trash-bin-paper.webp'),
  },
  rattan: {
    empty: require('../../../../assets/pro-store-previews/rattan-trash-bin.webp'),
    filled: require('../../../../assets/pro-store-previews/rattan-trash-bin-paper.webp'),
  },
  walnut: {
    empty: require('../../../../assets/pro-store-previews/walnut-trash-bin.webp'),
    filled: require('../../../../assets/pro-store-previews/walnut-trash-bin-paper.webp'),
  },
  leather: {
    empty: require('../../../../assets/pro-store-previews/leather-trash-bin.webp'),
    filled: require('../../../../assets/pro-store-previews/leather-trash-bin-paper.webp'),
  },
  steel: {
    empty: require('../../../../assets/pro-store-previews/steel-trash-bin.webp'),
    filled: require('../../../../assets/pro-store-previews/steel-trash-bin-paper.webp'),
  },
  pink: {
    empty: require('../../../../assets/pro-store-previews/pink-trash-bin.webp'),
    filled: require('../../../../assets/pro-store-previews/pink-trash-bin-paper.webp'),
  },
  charcoal: {
    empty: require('../../../../assets/pro-store-previews/charcoal-trash-bin.webp'),
    filled: require('../../../../assets/pro-store-previews/charcoal-trash-bin-paper.webp'),
  },
  ash: {
    empty: require('../../../../assets/pro-store-previews/ash-trash-bin.webp'),
    filled: require('../../../../assets/pro-store-previews/ash-trash-bin-paper.webp'),
  },
  canvas: {
    empty: require('../../../../assets/pro-store-previews/canvas-trash-bin.webp'),
    filled: require('../../../../assets/pro-store-previews/canvas-trash-bin-paper.webp'),
  },
  vintage: {
    empty: require('../../../../assets/pro-store-previews/powder-blue-trash-bin.webp'),
    filled: require('../../../../assets/pro-store-previews/powder-blue-trash-bin-paper.webp'),
  },
} as const;

export type TrashBinStyle = keyof typeof TRASH_ASSETS;

/** Shared illustrated wastebasket; show paper when a delete selection contains items. */
export function TrashIcon({ size = 29, variant = 'mesh', filled = false }: { size?: number; color?: ColorValue; variant?: TrashBinStyle; filled?: boolean }) {
  const source = useAppliedDiaryImage('trash-' + variant, filled ? 'filled' : 'empty', TRASH_ASSETS[variant][filled ? 'filled' : 'empty']);
  return <Image source={source} contentFit="contain" transition={0} cachePolicy="memory-disk" accessible={false} style={{ width: size, height: size }} />;
}
