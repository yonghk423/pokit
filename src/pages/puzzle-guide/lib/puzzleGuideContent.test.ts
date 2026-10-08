import { getPuzzleGuideImage } from '@shared/lib/puzzle-guide-assets';

import { getPuzzleGuideSlides } from './puzzleGuideContent';

describe('getPuzzleGuideSlides', () => {
  it('returns four localized slides for ko', () => {
    const slides = getPuzzleGuideSlides('ko');
    expect(slides).toHaveLength(4);
    expect(slides.map((s) => s.id)).toEqual(['wall', 'target', 'photo', 'tip']);
    expect(slides[0]?.title.length).toBeGreaterThan(0);
    expect(slides[0]?.body.length).toBeGreaterThan(0);
  });

  it('returns slides for en and ja', () => {
    expect(getPuzzleGuideSlides('en')).toHaveLength(4);
    expect(getPuzzleGuideSlides('ja')).toHaveLength(4);
  });
});

describe('getPuzzleGuideImage', () => {
  it('resolves every slide image', () => {
    expect(getPuzzleGuideImage('wall')).toBeTruthy();
    expect(getPuzzleGuideImage('target')).toBeTruthy();
    expect(getPuzzleGuideImage('photo')).toBeTruthy();
    expect(getPuzzleGuideImage('tip')).toBeTruthy();
  });
});
