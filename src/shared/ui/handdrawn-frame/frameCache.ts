import { Image, type ImageRef } from 'expo-image';

const BORDER = require('../../../../assets/control-illustrations/button-border.webp');
let decoded: ImageRef | undefined;
let preparation: Promise<void> | undefined;

export function getPreparedFrame(): ImageRef | number {
  return decoded ?? BORDER;
}

/** Keep the original border decoded so settings rows can display it immediately. */
export function prepareHanddrawnFrame(): Promise<void> {
  if (preparation) return preparation;
  preparation = Image.loadAsync(BORDER).then(image => {
    decoded = image;
  }).catch(() => {
    // Leave the bundled source available and allow another preparation attempt.
    preparation = undefined;
  });
  return preparation;
}
