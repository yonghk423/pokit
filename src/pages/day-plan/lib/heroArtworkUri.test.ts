import { resolveHeroArtworkUri } from './heroArtworkUri';
import { normalizeComicScenes, newComicScene } from './heroDayStorage';

jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///current/Documents/' }));

it('loads generated originals from the current container, preserving filenames and diary content', () => {
  const uri = 'file:///old-container/Documents/hero-ai/hero-1793601077500-38uh37cqzo-0.png';
  const expected = 'file:///current/Documents/hero-ai/hero-1793601077500-38uh37cqzo-0.png';
  expect(resolveHeroArtworkUri(uri)).toBe(expected);
  expect(resolveHeroArtworkUri(expected)).toBe(expected);
  const scene = { ...newComicScene('My title'), memo: 'My writing', artworkUri: uri };
  expect(normalizeComicScenes([scene])).toEqual([{ ...scene, artworkUri: expected }]);
});

it.each([
  'https://example.com/Documents/hero-ai/image.png',
  'file:///old/Library/Caches/image.png',
  'file:///old/Documents/hero-ai/../another.png',
  'file:///old/Documents/hero-ai/nested/image.png',
  'file:///old/Documents/other/image.png',
])('keeps unrelated paths unchanged: %s', uri => {
  expect(resolveHeroArtworkUri(uri)).toBe(uri);
});
