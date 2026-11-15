import { weatherCalendarLayout } from './weatherCalendarLayout';

it.each([[320, 340], [375, 420], [375, 500], [390, 530], [393, 540], [430, 600], [440, 620]])('fits six date rows and photos without scrolling on %s × %s', (width, height) => {
  const scale = Math.min(width / 330, height / 540);
  for (const showPhotos of [true, false]) {
    const layout = weatherCalendarLayout(width, height, 6, scale, showPhotos);
    expect(layout.contentHeight).toBe(height);
    expect(layout.headerScale * 272 + 6 * layout.rowHeight + 110 * scale).toBeLessThanOrEqual(height + 0.001);
    if (showPhotos) expect(layout.photoWidth).toBeGreaterThan(0);
    if (showPhotos) expect(layout.rowHeight + 0.001).toBeGreaterThanOrEqual(layout.numberHeight + layout.photoHeight + 8);
  }
});
