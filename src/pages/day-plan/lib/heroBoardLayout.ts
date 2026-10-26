import { localStorageClient } from '@shared/lib/storage/localStorageClient';
export const COMIC_BOARD_MODES = ['small', 'two', 'one', 'comic', 'hero', 'page', 'diagonal'] as const;
export type ComicBoardMode = typeof COMIC_BOARD_MODES[number];
const KEY = 'pokit:comic-board-view';
export function loadComicBoardMode(): ComicBoardMode {
  const mode = localStorageClient.getItemRaw(KEY);
  return COMIC_BOARD_MODES.find(item => item === mode) ?? 'comic';
}
export function saveComicBoardMode(mode: ComicBoardMode) { localStorageClient.setItemRaw(KEY, mode); }
export function comicCardLayout(mode: ComicBoardMode, index: number): { width: `${number}%`; imageRatio: number; wide: boolean } {
  if (mode === 'small') return { width: '31.5%', imageRatio: 0.29, wide: false };
  if (mode === 'two') return { width: '48.75%', imageRatio: 0.34, wide: false };
  if (mode === 'one') return { width: '100%', imageRatio: 0.6, wide: true };
  const position = index % 5;
  return { width: position === 2 ? '100%' : position === 0 ? '54.5%' : position === 1 ? '43%' : '48.75%', imageRatio: position < 2 ? 0.4 : position === 2 ? 0.37 : 0.32, wide: position === 2 };
}

export type ComicPanel = { left: number; top: number; width: number; height: number; diagonal?: { side: 'left' | 'right'; reverse: boolean; slant: number } };
/** Three-cut splash page or four-cut page with a tall establishing panel. */
export function comicPageLayout(mode: 'hero' | 'page', count: number, width: number): { height: number; panels: ComicPanel[] } {
  const gap = 8;
  const half = (width - gap) / 2;
  if (count <= 1) return { height: width * 0.7 + 52, panels: count ? [{ left: 0, top: 0, width, height: width * 0.7 + 52 }] : [] };
  if (mode === 'hero') {
    const top = width * 0.62 + 52;
    const bottom = width * 0.38 + 52;
    return { height: top + gap + bottom, panels: [
      { left: 0, top: 0, width, height: top },
      { left: 0, top: top + gap, width: count === 2 ? width : half, height: bottom },
      ...(count > 2 ? [{ left: half + gap, top: top + gap, width: half, height: bottom }] : []),
    ] };
  }
  const upper = width * 0.94 + 52;
  if (count === 2) return { height: upper, panels: [{ left: 0, top: 0, width: half, height: upper }, { left: half + gap, top: 0, width: half, height: upper }] };
  const panels = [
    { left: 0, top: 0, width: half, height: upper },
    { left: half + gap, top: 0, width: half, height: (upper - gap) / 2 },
    { left: half + gap, top: (upper + gap) / 2, width: half, height: (upper - gap) / 2 },
  ];
  if (count === 3) return { height: upper, panels };
  const bottom = width * 0.42 + 52;
  return { height: upper + gap + bottom, panels: [...panels, { left: 0, top: upper + gap, width, height: bottom }] };
}

export function diagonalComicPage(count: number, width: number): { height: number; panels: ComicPanel[] } {
  if (count <= 1) return comicPageLayout('hero', count, width);
  const gap = 8;
  const slant = Math.min(28, width * 0.08);
  const half = (width - gap) / 2;
  const rowHeight = width * 0.45 + 70;
  const panels: ComicPanel[] = [];
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / 2);
    if (index === count - 1 && count % 2) { panels.push({ left: 0, top: row * (rowHeight + gap), width, height: rowHeight }); break; }
    const side = index % 2 === 0 ? 'left' : 'right';
    panels.push({ left: side === 'left' ? 0 : half - slant / 2 + gap, top: row * (rowHeight + gap), width: half + slant / 2, height: rowHeight, diagonal: { side, reverse: row % 2 === 1, slant } });
  }
  return { height: Math.ceil(count / 2) * (rowHeight + gap) - gap, panels };
}
export function diagonalPanelPath(panel: ComicPanel): string {
  const { width: w, height: h, diagonal: d } = panel;
  if (!d) return `M0 0H${w}V${h}H0Z`;
  if (d.side === 'left') return d.reverse ? `M1 1H${w - 1}L${w - d.slant - 1} ${h - 1}H1Z` : `M1 1H${w - d.slant - 1}L${w - 1} ${h - 1}H1Z`;
  return d.reverse ? `M${d.slant + 1} 1H${w - 1}V${h - 1}H1Z` : `M1 1H${w - 1}V${h - 1}H${d.slant + 1}Z`;
}
