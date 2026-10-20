import { Image, type ImageRef } from 'expo-image';

import { headerIllustrationSources } from '../header-icon/sources';
import { controlIllustrationSources } from './controlIllustrationSources';
import { routineIllustrationSources } from './routineIllustrationSources';

// Retain decoded native images across screen unmounts, rather than reloading files
// on every tab visit. The small icon atlas is bounded by the bundled source list.
const decoded = new Map<number, ImageRef>();
let preparation: Promise<void> | undefined;

export function getPreparedIllustration(source: number): ImageRef | number {
  return decoded.get(source) ?? source;
}

export function prepareIllustrations(): Promise<void> {
  if (preparation) return preparation;
  const sources = [...new Set([
    ...Object.values(headerIllustrationSources),
    ...Object.values(controlIllustrationSources),
    ...Object.values(routineIllustrationSources),
  ])];
  preparation = (async () => {
    let next = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (next < sources.length) {
        const source = sources[next++];
        try {
          decoded.set(source, await Image.loadAsync(source, { maxWidth: 144, maxHeight: 144 }));
        } catch {
          // A failed asset must not block startup; its normal renderer can retry.
        }
      }
    }));
  })();
  return preparation;
}
