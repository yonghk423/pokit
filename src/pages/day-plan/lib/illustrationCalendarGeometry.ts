import { CALENDAR_ARTWORK_LAYOUTS, CALENDAR_ARTWORK_SIZES, type CalendarRegion } from './illustrationCalendarLayouts';
export { CALENDAR_ARTWORK_SIZES };
const ARTWORK_SIZES: Record<string, readonly [number, number]> = CALENDAR_ARTWORK_SIZES;

export function calendarRegionFrame([left, top, width, height]: CalendarRegion, canvasWidth: number, canvasHeight: number) {
  return { left: left * canvasWidth, top: top * canvasHeight, width: width * canvasWidth, height: height * canvasHeight };
}

/** Fill the screen with one aspect-preserving image; overlay coordinates use this same frame. */
export function fitCalendarArtwork(themeId: string, width: number, height: number, topInset = 0, bottomInset = 0) {
  const [sourceWidth, sourceHeight] = ARTWORK_SIZES[themeId] ?? [852, 1846];
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const frameWidth = sourceWidth * scale, frameHeight = sourceHeight * scale;
  const layout = CALENDAR_ARTWORK_LAYOUTS[themeId];
  const minTop = Math.max(height - frameHeight, topInset + 8 - (layout?.month[1] ?? .43) * frameHeight);
  const gridBottom = layout ? layout.grid[1] + layout.grid[3] : .86;
  const maxTop = Math.min(0, height - bottomInset - 8 - gridBottom * frameHeight);
  // Shift the complete artwork and all of its controls together. Never add a second background.
  const top = Math.max(height - frameHeight, Math.min(0, Math.min(maxTop, Math.max(minTop, (height - frameHeight) / 2))));
  return { width: frameWidth, height: frameHeight, left: (width - frameWidth) / 2, top };
}

/** One shared layout for every day, regardless of whether a photo/event exists. */
export function calendarCellContents(width: number, height: number) {
  const inset = Math.min(width, height) * .06;
  const numberSize = Math.min(width * .29, height * .29, 22);
  const numberHeight = numberSize * 1.18;
  const numberTop = inset;
  const photoTop = numberTop + numberHeight + height * .06;
  // Leave rotation and the pin within this cell, below the number and event ring.
  const photoHeight = Math.min((height - photoTop - inset) / 1.07, width * .75);
  const photoWidth = photoHeight / 1.2;
  return { numberSize, numberHeight, numberTop, photoTop, photoHeight, photoWidth };
}

