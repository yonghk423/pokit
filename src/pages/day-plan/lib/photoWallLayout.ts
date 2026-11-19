/** Equal-width prints in rows; adding photos extends the same hanging cords. */
export const PHOTO_WALL_COLUMNS = 4;
export const PHOTO_WALL_RAIL_TOP = 61;
const PRINT_TOP = 84;

export function photoWallLayout(width: number, count: number) {
  const columns = PHOTO_WALL_COLUMNS;
  const gap = width * 0.03;
  const inset = width * 0.055;
  const cardWidth = (width - inset * 2 - gap * (columns - 1)) / columns;
  const cardHeight = cardWidth * 1.46 + 7;
  const rowStride = cardHeight + cardWidth * 0.13;
  const frames = Array.from({ length: count }, (_, index) => ({
    left: inset + (index % columns) * (cardWidth + gap),
    top: PRINT_TOP + Math.floor(index / columns) * rowStride,
    width: cardWidth, height: cardHeight, rotation: 0, zIndex: index + 1,
  }));
  return { frames, rowStride, height: Math.max(180, (frames.at(-1)?.top ?? PRINT_TOP) + cardHeight + 32) };
}
