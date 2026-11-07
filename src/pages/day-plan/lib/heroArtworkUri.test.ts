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

it('rebases restored Drive images after the iOS app container changes', () => {
  expect(resolveHeroArtworkUri('file:///old/Documents/drive-backups/1793931000-ab/restored-1.png'))
    .toBe('file:///current/Documents/drive-backups/1793931000-ab/restored-1.png');
  expect(resolveHeroArtworkUri('file:///old/Documents/drive-backups/../secret.png'))
    .toBe('file:///old/Documents/drive-backups/../secret.png');
});

it('keeps original-photo cards readable after the iOS container changes', () => {
  const uri = 'file:///old/Documents/hero-photos/photo-1793931000-abc.heic';
  const expected = 'file:///current/Documents/hero-photos/photo-1793931000-abc.heic';
  expect(resolveHeroArtworkUri(uri)).toBe(expected);
  const scene = { ...newComicScene('사진'), artworkUri: uri };
  expect(normalizeComicScenes([scene])[0].artworkUri).toBe(expected);
  expect(resolveHeroArtworkUri('file:///old/Documents/hero-photos/../secret.jpg'))
    .toBe('file:///old/Documents/hero-photos/../secret.jpg');
});
