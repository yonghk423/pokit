import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiaryLibrary } from '@pages/day-plan/lib/heroDiaryStorage';
import { getDevelopmentStorageProfile, localStorageClient } from '@shared/lib/storage/localStorageClient';

/** Selected development photos: 49 portraits and 50 cafe/scenery images. */
export const MOCK_DIARY_ARTWORK = [
  { sceneId: 'p6-01-rush-hour-commute', asset: require('../../../assets/development/mock-diary/selected-photos/korean-000.webp') },
  { sceneId: 'p6-02-office-presentation', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-001.webp') },
  { sceneId: 'p6-03-spilled-coffee-report', asset: require('../../../assets/development/mock-diary/selected-photos/korean-001.webp') },
  { sceneId: 'p6-04-lunch-rooftop', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-002.webp') },
  { sceneId: 'p6-05-proud-promotion', asset: require('../../../assets/development/mock-diary/selected-photos/korean-004.webp') },
  { sceneId: 'p6-06-angry-email', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-003.webp') },
  { sceneId: 'p6-07-after-work-run', asset: require('../../../assets/development/mock-diary/selected-photos/korean-005.webp') },
  { sceneId: 'p6-08-missed-deadline', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-004.webp') },
  { sceneId: 'p6-09-boxing-bag', asset: require('../../../assets/development/mock-diary/selected-photos/korean-006.webp') },
  { sceneId: 'p6-10-basketball-shot', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-005.webp') },
  { sceneId: 'p6-11-swimming-laps', asset: require('../../../assets/development/mock-diary/selected-photos/korean-007.webp') },
  { sceneId: 'p6-12-cycling-hill', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-006.webp') },
  { sceneId: 'p6-13-yoga-balance', asset: require('../../../assets/development/mock-diary/selected-photos/korean-008.webp') },
  { sceneId: 'p6-14-tennis-serve', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-007.webp') },
  { sceneId: 'p6-15-soccer-dribble', asset: require('../../../assets/development/mock-diary/selected-photos/korean-011.webp') },
  { sceneId: 'p6-16-dance-practice', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-008.webp') },
  { sceneId: 'p6-17-climbing-wall', asset: require('../../../assets/development/mock-diary/selected-photos/korean-012.webp') },
  { sceneId: 'p6-18-jump-rope', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-009.webp') },
  { sceneId: 'p6-19-rain-run', asset: require('../../../assets/development/mock-diary/selected-photos/korean-014.webp') },
  { sceneId: 'p6-20-badminton-rally', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-010.webp') },
  { sceneId: 'p6-21-couch-after-work', asset: require('../../../assets/development/mock-diary/selected-photos/korean-015.webp') },
  { sceneId: 'p6-22-window-tea', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-011.webp') },
  { sceneId: 'p6-23-laundry-day', asset: require('../../../assets/development/mock-diary/selected-photos/korean-018.webp') },
  { sceneId: 'p6-24-home-cooking', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-012.webp') },
  { sceneId: 'p6-25-lazy-morning', asset: require('../../../assets/development/mock-diary/selected-photos/korean-019.webp') },
  { sceneId: 'p6-26-couch-nap', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-013.webp') },
  { sceneId: 'p6-27-houseplant-care', asset: require('../../../assets/development/mock-diary/selected-photos/korean-020.webp') },
  { sceneId: 'p6-28-movie-night', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-014.webp') },
  { sceneId: 'p6-29-bathroom-skincare', asset: require('../../../assets/development/mock-diary/selected-photos/korean-021.webp') },
  { sceneId: 'p6-30-cat-on-lap', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-015.webp') },
  { sceneId: 'p6-31-frustrated-phone-call', asset: require('../../../assets/development/mock-diary/selected-photos/korean-022.webp') },
  { sceneId: 'p6-32-sad-bus-stop', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-020.webp') },
  { sceneId: 'p6-33-exam-results-joy', asset: require('../../../assets/development/mock-diary/selected-photos/korean-024.webp') },
  { sceneId: 'p6-34-interview-nerves', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-030.webp') },
  { sceneId: 'p6-35-breakup-evening', asset: require('../../../assets/development/mock-diary/selected-photos/korean-025.webp') },
  { sceneId: 'p6-36-concert-happiness', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-031.webp') },
  { sceneId: 'p6-37-embarrassed-spill', asset: require('../../../assets/development/mock-diary/selected-photos/korean-030.webp') },
  { sceneId: 'p6-38-holiday-loneliness', asset: require('../../../assets/development/mock-diary/selected-photos/scenery-000.webp') },
  { sceneId: 'p6-39-birthday-surprise', asset: require('../../../assets/development/mock-diary/selected-photos/korean-031.webp') },
  { sceneId: 'p6-40-relief-after-cry', asset: require('../../../assets/development/mock-diary/selected-photos/scenery-002.webp') },
  { sceneId: 'p6-41-spring-blossom-bicycle', asset: require('../../../assets/development/mock-diary/selected-photos/korean-038.webp') },
  { sceneId: 'p6-42-spring-rain-puddle', asset: require('../../../assets/development/mock-diary/selected-photos/scenery-003.webp') },
  { sceneId: 'p6-43-spring-garden-planting', asset: require('../../../assets/development/mock-diary/selected-photos/korean-039.webp') },
  { sceneId: 'p6-44-summer-beach-walk', asset: require('../../../assets/development/mock-diary/selected-photos/scenery-004.webp') },
  { sceneId: 'p6-45-summer-hill-hike', asset: require('../../../assets/development/mock-diary/selected-photos/korean-060.webp') },
  { sceneId: 'p6-46-autumn-leaves', asset: require('../../../assets/development/mock-diary/selected-photos/scenery-005.webp') },
  { sceneId: 'p6-47-autumn-market', asset: require('../../../assets/development/mock-diary/selected-photos/korean-065.webp') },
  { sceneId: 'p6-48-autumn-wind-commute', asset: require('../../../assets/development/mock-diary/selected-photos/scenery-006.webp') },
  { sceneId: 'p6-49-winter-snow-play', asset: require('../../../assets/development/mock-diary/selected-photos/scenery-007.webp') },
  { sceneId: 'p6-50-winter-bus-wait', asset: require('../../../assets/development/mock-diary/selected-photos/korean-000.webp') },
  { sceneId: 'p6-extra-01', asset: require('../../../assets/development/mock-diary/selected-photos/korean-003.webp') },
  { sceneId: 'p6-extra-02', asset: require('../../../assets/development/mock-diary/selected-photos/food-000.webp') },
  { sceneId: 'p6-extra-03', asset: require('../../../assets/development/mock-diary/selected-photos/korean-032.webp') },
  { sceneId: 'p6-extra-04', asset: require('../../../assets/development/mock-diary/selected-photos/food-002.webp') },
  { sceneId: 'p6-extra-05', asset: require('../../../assets/development/mock-diary/selected-photos/korean-033.webp') },
  { sceneId: 'p6-extra-06', asset: require('../../../assets/development/mock-diary/selected-photos/food-003.webp') },
  { sceneId: 'p6-extra-07', asset: require('../../../assets/development/mock-diary/selected-photos/korean-034.webp') },
  { sceneId: 'p6-extra-08', asset: require('../../../assets/development/mock-diary/selected-photos/food-004.webp') },
  { sceneId: 'p6-extra-09', asset: require('../../../assets/development/mock-diary/selected-photos/korean-035.webp') },
  { sceneId: 'p6-extra-10', asset: require('../../../assets/development/mock-diary/selected-photos/food-007.webp') },
  { sceneId: 'p6-extra-11', asset: require('../../../assets/development/mock-diary/selected-photos/korean-036.webp') },
  { sceneId: 'p6-extra-12', asset: require('../../../assets/development/mock-diary/selected-photos/food-009.webp') },
  { sceneId: 'p6-extra-13', asset: require('../../../assets/development/mock-diary/selected-photos/korean-037.webp') },
  { sceneId: 'p6-extra-14', asset: require('../../../assets/development/mock-diary/selected-photos/food-010.webp') },
  { sceneId: 'p6-extra-15', asset: require('../../../assets/development/mock-diary/selected-photos/korean-040.webp') },
  { sceneId: 'p6-extra-16', asset: require('../../../assets/development/mock-diary/selected-photos/food-011.webp') },
  { sceneId: 'p6-extra-17', asset: require('../../../assets/development/mock-diary/selected-photos/korean-041.webp') },
  { sceneId: 'p6-extra-18', asset: require('../../../assets/development/mock-diary/selected-photos/food-012.webp') },
  { sceneId: 'p6-extra-19', asset: require('../../../assets/development/mock-diary/selected-photos/korean-042.webp') },
  { sceneId: 'p6-extra-20', asset: require('../../../assets/development/mock-diary/selected-photos/food-013.webp') },
  { sceneId: 'p6-extra-21', asset: require('../../../assets/development/mock-diary/selected-photos/korean-043.webp') },
  { sceneId: 'p6-extra-22', asset: require('../../../assets/development/mock-diary/selected-photos/food-014.webp') },
  { sceneId: 'p6-extra-23', asset: require('../../../assets/development/mock-diary/selected-photos/korean-045.webp') },
  { sceneId: 'p6-extra-24', asset: require('../../../assets/development/mock-diary/selected-photos/food-015.webp') },
  { sceneId: 'p6-extra-25', asset: require('../../../assets/development/mock-diary/selected-photos/korean-047.webp') },
  { sceneId: 'p6-extra-26', asset: require('../../../assets/development/mock-diary/selected-photos/food-017.webp') },
  { sceneId: 'p6-extra-27', asset: require('../../../assets/development/mock-diary/selected-photos/korean-050.webp') },
  { sceneId: 'p6-extra-28', asset: require('../../../assets/development/mock-diary/selected-photos/food-018.webp') },
  { sceneId: 'p6-extra-29', asset: require('../../../assets/development/mock-diary/selected-photos/korean-052.webp') },
  { sceneId: 'p6-extra-30', asset: require('../../../assets/development/mock-diary/selected-photos/food-019.webp') },
  { sceneId: 'p6-extra-31', asset: require('../../../assets/development/mock-diary/selected-photos/korean-053.webp') },
  { sceneId: 'p6-extra-32', asset: require('../../../assets/development/mock-diary/selected-photos/food-022.webp') },
  { sceneId: 'p6-extra-33', asset: require('../../../assets/development/mock-diary/selected-photos/korean-054.webp') },
  { sceneId: 'p6-extra-34', asset: require('../../../assets/development/mock-diary/selected-photos/food-023.webp') },
  { sceneId: 'p6-extra-35', asset: require('../../../assets/development/mock-diary/selected-photos/korean-055.webp') },
  { sceneId: 'p6-extra-36', asset: require('../../../assets/development/mock-diary/selected-photos/food-024.webp') },
  { sceneId: 'p6-extra-37', asset: require('../../../assets/development/mock-diary/selected-photos/korean-056.webp') },
  { sceneId: 'p6-extra-38', asset: require('../../../assets/development/mock-diary/selected-photos/food-025.webp') },
  { sceneId: 'p6-extra-39', asset: require('../../../assets/development/mock-diary/selected-photos/korean-057.webp') },
  { sceneId: 'p6-extra-40', asset: require('../../../assets/development/mock-diary/selected-photos/food-026.webp') },
  { sceneId: 'p6-extra-41', asset: require('../../../assets/development/mock-diary/selected-photos/korean-058.webp') },
  { sceneId: 'p6-extra-42', asset: require('../../../assets/development/mock-diary/selected-photos/food-032.webp') },
  { sceneId: 'p6-extra-43', asset: require('../../../assets/development/mock-diary/selected-photos/korean-059.webp') },
  { sceneId: 'p6-extra-44', asset: require('../../../assets/development/mock-diary/selected-photos/food-037.webp') },
  { sceneId: 'p6-extra-45', asset: require('../../../assets/development/mock-diary/selected-photos/korean-066.webp') },
  { sceneId: 'p6-extra-46', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-016.webp') },
  { sceneId: 'p6-extra-47', asset: require('../../../assets/development/mock-diary/selected-photos/korean-067.webp') },
  { sceneId: 'p6-extra-48', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-019.webp') },
  { sceneId: 'p6-extra-49', asset: require('../../../assets/development/mock-diary/selected-photos/korean-069.webp') },
  { sceneId: 'p6-extra-50', asset: require('../../../assets/development/mock-diary/selected-photos/cafe-034.webp') },
] as const;

const artworkByScene = new Map<string, (typeof MOCK_DIARY_ARTWORK)[number]>(MOCK_DIARY_ARTWORK.map(artwork => [artwork.sceneId, artwork]));

export function developmentArtworkUri(sceneId: string): string | undefined {
  const artwork = artworkByScene.get(sceneId);
  if (!artwork || !FileSystem.documentDirectory) return undefined;
  return `${FileSystem.documentDirectory}hero-photos/selected-v2-${sceneId.slice(3)}.webp`;
}

/** Select across both photo batches without changing the saved scene category. */
export function developmentArtworkUriAt(index: number): string | undefined {
  return developmentArtworkUri(MOCK_DIARY_ARTWORK[index % MOCK_DIARY_ARTWORK.length].sceneId);
}

/** Copy bundled photo samples to the same durable folder used for diary photos. */
export async function prepareDevelopmentMockArtwork(): Promise<void> {
  if (!__DEV__ || !FileSystem.documentDirectory) return;
  const folder = `${FileSystem.documentDirectory}hero-photos/`;
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  await Promise.all(MOCK_DIARY_ARTWORK.map(async artwork => {
    const destination = `${folder}selected-v2-${artwork.sceneId.slice(3)}.webp`;
    try {
      const existing = await FileSystem.getInfoAsync(destination);
      if (existing.exists) return;
      const asset = await Asset.fromModule(artwork.asset).downloadAsync();
      if (asset.localUri) await FileSystem.copyAsync({ from: asset.localUri, to: destination });
    } catch {
      // Keep the development app usable if one sample image cannot be copied.
    }
  }));
  if (!getDevelopmentStorageProfile()) return;
  const library = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY);
  if (!Array.isArray(library?.diaries)) return;
  let changed = false;
  const diaries = library.diaries.map(diary => {
    if (!/^(mock-diary:|mock-color-diary:|mock-calendar:)/.test(diary.id)) return diary;
    return { ...diary, scenes: diary.scenes.map(scene => {
      // Upgrade bundled fixtures only; keep photos selected manually in the editor.
      const legacyName = scene.image.slice(3);
      const legacyPaths = [`${folder}photo-${legacyName}.webp`, `${folder}selected-v1-${legacyName}.jpg`];
      if (!scene.artworkUri || !legacyPaths.includes(scene.artworkUri)) return scene;
      const artworkUri = developmentArtworkUri(scene.image);
      if (!artworkUri) return scene;
      changed = true;
      return { ...scene, artworkUri };
    }) };
  });
  if (changed) localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { ...library, diaries });
}
