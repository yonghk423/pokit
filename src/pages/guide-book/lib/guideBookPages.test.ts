import { buildGuideBookToc, getGuideBookPages } from './guideBookPages';


it('hides puzzle chapters while keeping the remaining contents correctly indexed', () => {
  const pages = getGuideBookPages('ko');
  expect(pages.some((page) => page.id === 'puzzle' || page.id === 'puzzle-start')).toBe(false);
  const toc = buildGuideBookToc('ko');
  expect(toc.some((section) => section.chapterKey === 'puzzleTab')).toBe(false);
  for (const section of toc) {
    for (const index of section.pageIndexes) expect(pages[index].chapter).toBe(section.chapter);
  }
  expect(toc.find((section) => section.chapterKey === 'settings')).toBeDefined();
});
