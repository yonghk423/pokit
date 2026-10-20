import { Image } from 'expo-image';
import { getPreparedIllustration } from '../icon-symbol/illustrationCache';
import { headerIllustrationSources as SOURCES } from './sources';



export type HeaderIconName = keyof typeof SOURCES;

/** Explicit point sizes keep generated artwork inside the existing toolbar buttons. */
export function HeaderIcon({ name, size = 22 }: { name: HeaderIconName; size?: number }) {
  return (
    <Image
      source={getPreparedIllustration(SOURCES[name])}
      cachePolicy="memory"
      priority="high"
      transition={0}
      useAppleWebpCodec={false}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessible={false}
    />
  );
}
