import { Image, type ImageRef } from 'expo-image';

export const RHYTHM_ARTWORK_SOURCE = require('../../../../assets/rhythm-empty-state/design-source.webp');
let decoded: ImageRef | undefined;
let preparation: Promise<void> | undefined;

export function getPreparedRhythmArtwork(): ImageRef | number {
  return decoded ?? RHYTHM_ARTWORK_SOURCE;
}

/** One shared native bitmap for both illustrations, retained across tab unmounts. */
export function prepareRhythmArtwork(): Promise<void> {
  if (preparation) return preparation;
  preparation = Image.loadAsync(RHYTHM_ARTWORK_SOURCE).then(image => {
    decoded = image;
  }).catch(() => {
    // Use the bundled source if warmup fails, and allow a later visit to retry.
    preparation = undefined;
  });
  return preparation;
}
