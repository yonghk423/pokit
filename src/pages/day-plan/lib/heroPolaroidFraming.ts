/** The visible photograph fills a 1:1.2 window in previews and downloaded prints. */
export const POLAROID_PHOTO_WIDTH = 324;
export const POLAROID_PHOTO_HEIGHT = POLAROID_PHOTO_WIDTH * 1.2;

/** Classic print: a wide photo and generous bottom border inside a 1:1.2 card. */
export function getPolaroidPrintLayout(fit: 'cover' | 'contain' = 'cover') {
  const photoHeight = fit === 'cover' ? POLAROID_PHOTO_WIDTH * 0.9 : POLAROID_PHOTO_HEIGHT;
  const printHeight = fit === 'cover' ? 432 : photoHeight + 130;
  return { photoHeight, printHeight, captionHeight: printHeight - photoHeight - 42 };
}
