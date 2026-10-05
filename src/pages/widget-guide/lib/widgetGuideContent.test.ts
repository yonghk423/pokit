import { getWidgetGuideImage } from '@shared/lib/widget-guide-assets';

import { getWidgetGuideSlides } from './widgetGuideContent';

describe('getWidgetGuideSlides', () => {
  it('returns notebook editorial slides with short titles and bodies', () => {
    const slides = getWidgetGuideSlides('ko');
    expect(slides.map((slide) => slide.id)).toEqual([
      'intro',
      'edit',
      'bookstore',
      'note',
      'tip',
    ]);
    expect(slides.every((slide) => slide.title.length > 0)).toBe(true);
    expect(slides.every((slide) => slide.body.length > 0)).toBe(true);
    expect(slides.every((slide) => slide.accent.startsWith('#'))).toBe(true);
  });

  it('uses English copy for en locale', () => {
    const slides = getWidgetGuideSlides('en');
    expect(slides[0]?.title).toMatch(/Home|Widget/i);
    expect(slides[2]?.title).toMatch(/Bookstore|Book/i);
    expect(slides[3]?.title).toMatch(/Note/i);
    expect(slides.every((slide) => !/[가-힣]/.test(slide.title + slide.body))).toBe(true);
  });

  it('uses Japanese copy for ja locale', () => {
    const slides = getWidgetGuideSlides('ja');
    expect(slides[0]?.title).toMatch(/ウィジェット|ホーム/);
    expect(slides[2]?.title).toMatch(/書店|本/);
    expect(slides[3]?.title).toMatch(/ノート/);
    expect(slides.every((slide) => !/[가-힣]/.test(slide.title + slide.body))).toBe(true);
  });
});

describe('getWidgetGuideImage', () => {
  it('resolves a source for each locale pack', () => {
    expect(getWidgetGuideImage('intro', 'ko')).toBeTruthy();
    expect(getWidgetGuideImage('intro', 'en')).toBeTruthy();
    expect(getWidgetGuideImage('intro', 'ja')).toBeTruthy();
    expect(getWidgetGuideImage('note', 'ko')).toBeTruthy();
    expect(getWidgetGuideImage('note', 'en')).toBeTruthy();
    expect(getWidgetGuideImage('note', 'ja')).toBeTruthy();
    expect(getWidgetGuideImage('tip', 'ja')).toBeTruthy();
  });
});
