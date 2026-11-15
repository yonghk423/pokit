import { getPolaroidPrintLayout } from './heroPolaroidFraming';

/** Equal-width prints in rows; adding photos extends the same hanging cords. */
export const PHOTO_WALL_COLUMNS = 4;
export const PHOTO_WALL_RAIL_TOP = 61;
const PRINT_TOP = 100;

export function photoWallLayout(width: number, count: number, fits: readonly ('contain' | 'cover' | undefined)[] = []) {
  const columns = PHOTO_WALL_COLUMNS;
  const gap = width * 0.055;
  const cardWidth = (width - gap * (columns + 1)) / columns;
  const printHeight = (fit?: 'contain' | 'cover') => cardWidth * getPolaroidPrintLayout(fit ?? 'cover').printHeight / 360 + 7;
  const cardHeight = printHeight(fits.includes('contain') ? 'contain' : 'cover');
  const frames = Array.from({ length: count }, (_, index) => ({
    left: gap + (index % columns) * (cardWidth + gap),
    top: PRINT_TOP + Math.floor(index / columns) * (cardHeight + 28),
    width: cardWidth, height: printHeight(fits[index]), rotation: 0, zIndex: index + 1,
  }));
  return { frames, rowStride: cardHeight + 28, height: Math.max(180, (frames.at(-1)?.top ?? PRINT_TOP) + cardHeight + 32) };
}
