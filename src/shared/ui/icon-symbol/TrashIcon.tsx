import type { ColorValue } from 'react-native';
import { Image } from 'expo-image';

const EMPTY_TRASH = require('../../../../assets/control-illustrations/mesh-trash-bin.png');

/** Shared photorealistic silver wastebasket for every delete affordance. */
export function TrashIcon({ size = 29 }: { size?: number; color?: ColorValue }) {
  return <Image source={EMPTY_TRASH} contentFit="contain" transition={0} cachePolicy="memory-disk" accessible={false} style={{ width: size, height: size }} />;
}
