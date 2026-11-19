import { buildCalendarMockDiaries } from './mockCalendarData';
import { developmentArtworkUri, MOCK_DIARY_ARTWORK } from './mockArtwork';

jest.mock('expo-file-system/legacy', () => ({ documentDirectory: 'file:///mock-documents/' }));

it('spreads the selected photo fixtures across the Korean calendar with durable photo paths', () => {
  const scenes = buildCalendarMockDiaries('ko', '2026-11-19').flatMap(diary => diary.scenes);
  expect(new Set(scenes.map(scene => scene.image)).size).toBe(50);
  for (const scene of scenes) {
    expect(MOCK_DIARY_ARTWORK.some(photo => developmentArtworkUri(photo.sceneId) === scene.artworkUri)).toBe(true);
    expect(scene.artworkUri).toContain('/hero-photos/selected-v2-');
    expect(scene.artworkUri).toMatch(/\.webp$/);
  }
});

it.each([['2026-11-19', 30], ['2027-02-01', 28], ['2028-02-01', 29]])(
  'fills every date of the preview month %s, including future dates', (date, count) => {
    const month = String(date).slice(0, 7);
    const diaries = buildCalendarMockDiaries('ko', String(date));
    const dates = new Set(diaries.filter(diary => diary.id.startsWith(`mock-calendar:ko:${month}-`))
      .map(diary => diary.id.split(':')[2]));
    expect([...dates].sort()).toEqual(Array.from({ length: Number(count) }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`));
  },
);

it('provides twenty distinct photo slots per diary and uses both photo batches', () => {
  const diaries = buildCalendarMockDiaries('ko', '2026-11-19');
  for (const diary of diaries) {
    expect(diary.scenes).toHaveLength(20);
    expect(new Set(diary.scenes.map(scene => scene.artworkUri)).size).toBe(20);
  }
  expect(new Set(diaries.flatMap(diary => diary.scenes.map(scene => scene.artworkUri))).size).toBe(100);
});
