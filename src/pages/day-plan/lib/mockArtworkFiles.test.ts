import { generatedMockPortraitName, mockArtworkFileName, previousMockArtworkSceneId } from './mockArtworkFiles';

it('uses a separate durable filename for generated portraits', () => {
  expect(mockArtworkFileName('p6-extra-01', true)).toBe('selected-ai-v1-extra-01.webp');
  expect(mockArtworkFileName('p6-extra-02', false)).toBe('selected-v2-extra-02.webp');
});

it('identifies the actual old fixture independently of the saved scene category', () => {
  expect(previousMockArtworkSceneId('file:///old-container/Documents/hero-photos/selected-v2-extra-01.webp')).toBe('p6-extra-01');
  expect(previousMockArtworkSceneId('file:///old-container/Documents/hero-photos/selected-v1-03-spilled-coffee-report.jpg')).toBe('p6-03-spilled-coffee-report');
  expect(previousMockArtworkSceneId('file:///old-container/Documents/hero-photos/photo-01-rush-hour-commute.webp')).toBe('p6-01-rush-hour-commute');
});

it('leaves personal and already generated artwork untouched', () => {
  expect(previousMockArtworkSceneId('file:///documents/hero-photos/photo-user-123.webp')).toBe('p6-user-123');
  // Only IDs present in the bundled artwork map are migrated by the caller.
  expect(previousMockArtworkSceneId('file:///documents/hero-photos/selected-ai-v1-extra-01.webp')).toBeUndefined();
  expect(previousMockArtworkSceneId('https://example.com/photo.webp')).toBeUndefined();
  expect(generatedMockPortraitName('file:///documents/hero-photos/photo-user-123.webp')).toBeUndefined();
  expect(generatedMockPortraitName('file:///documents/hero-photos/selected-v2-extra-02.webp')).toBeUndefined();
  expect(generatedMockPortraitName('file:///old/Documents/hero-photos/selected-v2-extra-01.webp')).toBe('selected-ai-v1-extra-01.webp');
});
