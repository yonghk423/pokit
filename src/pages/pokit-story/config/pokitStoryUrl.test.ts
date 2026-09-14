import { resolvePokitStoryUrl } from './pokitStoryUrl';

describe('resolvePokitStoryUrl', () => {
  it('opens the Korean locale path', () => {
    expect(resolvePokitStoryUrl('ko')).toBe('https://www.pokitstory.com/ko');
  });

  it('opens the English locale path', () => {
    expect(resolvePokitStoryUrl('en')).toBe('https://www.pokitstory.com/en');
  });

  it('opens the Japanese locale path', () => {
    expect(resolvePokitStoryUrl('ja')).toBe('https://www.pokitstory.com/ja');
  });
});
