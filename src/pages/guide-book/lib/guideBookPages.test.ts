import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { buildGuideBookToc, getGuideBookPages } from './guideBookPages';

afterEach(() => { FEATURE_FLAGS.puzzle = false; });

it('hides puzzle chapters while keeping the remaining contents correctly indexed', () => {
  FEATURE_FLAGS.puzzle = false;
  const pages = getGuideBookPages('ko');
  expect(pages.some((page) => page.id === 'puzzle' || page.id === 'puzzle-start')).toBe(false);
  const toc = buildGuideBookToc('ko');
  expect(toc.some((section) => section.chapterKey === 'puzzleTab')).toBe(false);
  for (const section of toc) {
    for (const index of section.pageIndexes) expect(pages[index].chapter).toBe(section.chapter);
  }
  expect(toc.find((section) => section.chapterKey === 'settings')).toBeDefined();
});

it('restores puzzle chapters when the feature is enabled again', () => {
  FEATURE_FLAGS.puzzle = true;
  expect(getGuideBookPages('ko').some((page) => page.id === 'puzzle')).toBe(true);
  expect(buildGuideBookToc('ko').some((section) => section.chapterKey === 'puzzleTab')).toBe(true);
});
