import { comicCardLayout, comicPageLayout, diagonalComicPage, diagonalPanelPath, loadComicBoardMode, saveComicBoardMode } from './comicBoardLayout';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
afterEach(() => localStorageClient.removeItem('pokit:comic-board-view'));
it('remembers board layout independently of gallery layout and falls back safely', () => {
  expect(loadComicBoardMode()).toBe('comic');
  saveComicBoardMode('two');
  expect(loadComicBoardMode()).toBe('two');
  localStorageClient.setItemRaw('pokit:comic-board-view', 'obsolete');
  expect(loadComicBoardMode()).toBe('comic');
});
it('uses consistent column widths and preserves the mixed comic pattern', () => {
  for (let index = 0; index < 10; index++) {
    expect(comicCardLayout('small', index).width).toBe('31.5%');
    expect(comicCardLayout('two', index).width).toBe('48.75%');
    expect(comicCardLayout('one', index).width).toBe('100%');
  }
  expect(comicCardLayout('comic', 2).width).toBe('100%');
  expect(comicCardLayout('comic', 7)).toEqual(comicCardLayout('comic', 2));
});

it('fits splash and tall-panel pages within the screen without overlapping captions', () => {
  for (const width of [256, 343, 600]) for (const mode of ['hero', 'page'] as const) {
    for (let count = 1; count <= (mode === 'hero' ? 3 : 4); count++) {
      const page = comicPageLayout(mode, count, width);
      expect(page.panels).toHaveLength(count);
      for (const panel of page.panels) {
        expect(panel.left).toBeGreaterThanOrEqual(0);
        expect(panel.left + panel.width).toBeLessThanOrEqual(width + 0.01);
        expect(panel.top + panel.height).toBeLessThanOrEqual(page.height + 0.01);
        expect(panel.height).toBeGreaterThan(90);
      }
      for (let a = 0; a < count; a++) for (let b = a + 1; b < count; b++) {
        const first = page.panels[a], second = page.panels[b];
        const overlap = first.left < second.left + second.width && first.left + first.width > second.left && first.top < second.top + second.height && first.top + first.height > second.top;
        expect(overlap).toBe(false);
      }
    }
  }
});

it('creates diagonal pairs with consistent gutters and a full-width leftover scene', () => {
  for (const width of [256, 343, 600]) for (const count of [1, 2, 3, 4]) {
    const page = diagonalComicPage(count, width);
    expect(page.panels).toHaveLength(count);
    page.panels.forEach(panel => {
      expect(panel.left + panel.width).toBeLessThanOrEqual(width + 0.01);
      expect(panel.top + panel.height).toBeLessThanOrEqual(page.height + 0.01);
      expect(diagonalPanelPath(panel)).toMatch(/^M/);
    });
    for (let index = 0; index + 1 < count; index += 2) {
      const left = page.panels[index], right = page.panels[index + 1];
      const slant = left.diagonal!.slant;
      expect(right.left + slant - left.width).toBeCloseTo(8);
    }
    if (count % 2) expect(page.panels[count - 1].width).toBe(width);
  }
});
