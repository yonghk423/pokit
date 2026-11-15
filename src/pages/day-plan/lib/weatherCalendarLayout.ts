/** Fit weather, month heading and every date row into the available paper height. */
export function weatherCalendarLayout(width: number, height: number, rows: number, scale: number, showPhotos = true) {
  const chrome = 110 * scale;
  const available = Math.max(0, height - chrome);
  const headerHeight = available * (showPhotos ? 0.3 : 0.52);
  const rowHeight = (available - headerHeight) / rows;
  const numberHeight = Math.max(16, 13 * scale * 1.25);
  const photoWidth = Math.max(0, Math.min(28, (width - 38 * scale) / 7 - 8, (rowHeight - numberHeight - 8 - 4) / 1.2));
  const photoHeight = photoWidth * 1.2 + 4;
  return { photoWidth, photoHeight, numberHeight, rowHeight, headerScale: headerHeight / 272, contentHeight: height };
}
