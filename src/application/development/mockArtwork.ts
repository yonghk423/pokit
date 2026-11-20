import { generatedMockPortraitName, mockArtworkFileName } from '@pages/day-plan/lib/mockArtworkFiles';
import * as FileSystem from 'expo-file-system/legacy';
import { COMIC_DIARY_STORAGE_KEY, type ComicDiaryLibrary } from '@pages/day-plan/lib/heroDiaryStorage';
import { getDevelopmentStorageProfile, localStorageClient } from '@shared/lib/storage/localStorageClient';

/** Unsplash photographs used only as fictional user-uploaded development fixtures. */
export const MOCK_DIARY_ARTWORK = [
  { sceneId: 'p6-01-rush-hour-commute', source: 'https://images.unsplash.com/photo-1564520599940-c06900b727f7?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-02-office-presentation', source: 'https://images.unsplash.com/photo-1678068317141-13ef6a709354?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-03-spilled-coffee-report', source: 'https://images.unsplash.com/photo-1543233604-3baca4d35513?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-04-lunch-rooftop', source: 'https://images.unsplash.com/photo-1582200371328-11d78e4cea8d?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-05-proud-promotion', source: 'https://images.unsplash.com/photo-1623035570668-a0f52a7d5640?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-06-angry-email', source: 'https://images.unsplash.com/photo-1532203231668-70d4568a6007?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-07-after-work-run', source: 'https://images.unsplash.com/photo-1617481507495-221a4f47b8b8?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-08-missed-deadline', source: 'https://images.unsplash.com/photo-1646908499080-e412060bcfe2?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-09-boxing-bag', source: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-10-basketball-shot', source: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-11-swimming-laps', source: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-12-cycling-hill', source: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-13-yoga-balance', source: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-14-tennis-serve', source: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-15-soccer-dribble', source: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-16-dance-practice', source: 'https://images.unsplash.com/photo-1559028924-8767fe6527fd?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-17-climbing-wall', source: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-18-jump-rope', source: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-19-rain-run', source: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-20-badminton-rally', source: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-21-couch-after-work', source: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-22-window-tea', source: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-23-laundry-day', source: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-24-home-cooking', source: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-25-lazy-morning', source: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-26-couch-nap', source: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-27-houseplant-care', source: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-28-movie-night', source: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-29-bathroom-skincare', source: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-30-cat-on-lap', source: 'https://images.unsplash.com/photo-1596362962460-54ae67c94e37?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-31-frustrated-phone-call', source: 'https://images.unsplash.com/photo-1439405326854-014607f694d7?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-32-sad-bus-stop', source: 'https://images.unsplash.com/photo-1484291470158-b8f8d608850d?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-33-exam-results-joy', source: 'https://images.unsplash.com/photo-1498623116890-37e912163d5d?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-34-interview-nerves', source: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-35-breakup-evening', source: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-36-concert-happiness', source: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-37-embarrassed-spill', source: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-38-holiday-loneliness', source: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-39-birthday-surprise', source: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-40-relief-after-cry', source: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-41-spring-blossom-bicycle', source: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-42-spring-rain-puddle', source: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-43-spring-garden-planting', source: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-44-summer-beach-walk', source: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-45-summer-hill-hike', source: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-46-autumn-leaves', source: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-47-autumn-market', source: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-48-autumn-wind-commute', source: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-49-winter-snow-play', source: 'https://images.unsplash.com/photo-1615874694520-474822394e73?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-50-winter-bus-wait', source: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-01', source: 'https://images.unsplash.com/photo-1564520599940-c06900b727f7?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-02', source: 'https://images.unsplash.com/photo-1678068317141-13ef6a709354?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-03', source: 'https://images.unsplash.com/photo-1543233604-3baca4d35513?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-04', source: 'https://images.unsplash.com/photo-1582200371328-11d78e4cea8d?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-05', source: 'https://images.unsplash.com/photo-1623035570668-a0f52a7d5640?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-06', source: 'https://images.unsplash.com/photo-1532203231668-70d4568a6007?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-07', source: 'https://images.unsplash.com/photo-1617481507495-221a4f47b8b8?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-08', source: 'https://images.unsplash.com/photo-1646908499080-e412060bcfe2?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-09', source: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-10', source: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-11', source: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-12', source: 'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-13', source: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-14', source: 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-15', source: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-16', source: 'https://images.unsplash.com/photo-1559028924-8767fe6527fd?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-17', source: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-18', source: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-19', source: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-20', source: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-21', source: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-22', source: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-23', source: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-24', source: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-25', source: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-26', source: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-27', source: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-28', source: 'https://images.unsplash.com/photo-1475924156734-496f6cac6ec1?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-29', source: 'https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-30', source: 'https://images.unsplash.com/photo-1596362962460-54ae67c94e37?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-31', source: 'https://images.unsplash.com/photo-1439405326854-014607f694d7?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-32', source: 'https://images.unsplash.com/photo-1484291470158-b8f8d608850d?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-33', source: 'https://images.unsplash.com/photo-1498623116890-37e912163d5d?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-34', source: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-35', source: 'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-36', source: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-37', source: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-38', source: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-39', source: 'https://images.unsplash.com/photo-1444723121867-7a241cacace9?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-40', source: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-41', source: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-42', source: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-43', source: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-44', source: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-45', source: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-46', source: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-47', source: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-48', source: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-49', source: 'https://images.unsplash.com/photo-1615874694520-474822394e73?w=1200&fit=max&auto=format&q=85' },
  { sceneId: 'p6-extra-50', source: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&fit=max&auto=format&q=85' },
] as const;

const artworkByScene = new Map<string, (typeof MOCK_DIARY_ARTWORK)[number]>(MOCK_DIARY_ARTWORK.map(artwork => [artwork.sceneId, artwork]));

export function developmentArtworkUri(sceneId: string): string | undefined {
  const artwork = artworkByScene.get(sceneId);
  if (!artwork || !FileSystem.documentDirectory) return undefined;
  return `${FileSystem.documentDirectory}hero-photos/${mockArtworkFileName(sceneId, false)}`;
}

/** Select across both photo batches without changing the saved scene category. */
export function developmentArtworkUriAt(index: number): string | undefined {
  return developmentArtworkUri(MOCK_DIARY_ARTWORK[index % MOCK_DIARY_ARTWORK.length].sceneId);
}

/** Install AI fixtures under fresh names, migrate saved references, then remove former portraits. */
export async function prepareDevelopmentMockArtwork(): Promise<void> {
  if (!__DEV__ || !FileSystem.documentDirectory) return;
  const folder = FileSystem.documentDirectory + 'hero-photos/';
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  const ready = new Set<string>();
  await Promise.all(MOCK_DIARY_ARTWORK.map(async artwork => {
    const name = mockArtworkFileName(artwork.sceneId, false);
    const destination = folder + name;
    try {
      const existing = await FileSystem.getInfoAsync(destination);
      if (!existing.exists || !existing.size) {
        await FileSystem.downloadAsync(artwork.source, destination);
      }
      ready.add(name);
    } catch {
      // A later bootstrap retries a missing fixture without substituting an old portrait.
    }
  }));
  if (!getDevelopmentStorageProfile()) return;
  const files = await FileSystem.readDirectoryAsync(folder);
  const replace = (uri: string | undefined): string | undefined => {
    // Retired portrait imported into the simulator's mock diary.
    if (uri && /\/photo-179508024(?:8966-g77egtt2si|9251-44259l8gf3)\.(?:jpeg|jpg)$/.test(uri)) {
      return developmentArtworkUriAt(0);
    }
    const mistaken = uri && /\/selected-unsplash-v2-(\d{10,}-[a-z0-9]+)\.webp$/.exec(uri);
    if (mistaken) {
      const original = files.find(file => file.startsWith(`photo-${mistaken[1]}.`));
      if (original) return replace(folder + original);
    }
    const name = uri ? generatedMockPortraitName(uri) : undefined;
    return name && ready.has(name) ? folder + name : uri;
  };
  const library = localStorageClient.getJson<ComicDiaryLibrary>(COMIC_DIARY_STORAGE_KEY);
  if (Array.isArray(library?.diaries)) {
    let changed = false;
    const diaries = library.diaries.map(diary => ({ ...diary, scenes: diary.scenes.map(scene => {
      // Match the photo's actual fixture URI, independently of its scene category.
      // Only whitelisted former portrait filenames are replaced; personal photos stay intact.
      const artworkUri = replace(scene.artworkUri);
      const originalArtworkUri = replace(scene.originalArtworkUri);
      if (artworkUri === scene.artworkUri && originalArtworkUri === scene.originalArtworkUri) return scene;
      changed = true;
      return { ...scene, artworkUri, ...(originalArtworkUri ? { originalArtworkUri } : {}) };
    }) }));
    if (changed) localStorageClient.setJson(COMIC_DIARY_STORAGE_KEY, { ...library, diaries });
  }
  const portraits = MOCK_DIARY_ARTWORK;
  if (!portraits.every(artwork => ready.has(mockArtworkFileName(artwork.sceneId, true)))) return;
  const receipt = folder + 'unsplash-mock-v2-installed.json';
  if ((await FileSystem.getInfoAsync(receipt)).exists) return;
  const obsolete = portraits.flatMap(artwork => {
    const name = artwork.sceneId.slice(3);
    return ['selected-v2-' + name + '.webp', 'selected-v1-' + name + '.jpg', 'photo-' + name + '.webp', 'selected-ai-v1-' + name + '.webp', 'selected-unsplash-v1-' + name + '.webp'];
  });
  for (const name of obsolete) await FileSystem.deleteAsync(folder + name, { idempotent: true });
  if (FileSystem.cacheDirectory) {
    const cache = FileSystem.cacheDirectory + 'hero-previews-v1/';
    const previews = await FileSystem.readDirectoryAsync(cache).catch(() => [] as string[]);
    for (const file of previews) {
      if (obsolete.some(name => file.includes(name) || file.includes(encodeURIComponent(name)))) {
        await FileSystem.deleteAsync(cache + file, { idempotent: true });
      }
    }
  }
  await FileSystem.writeAsStringAsync(receipt, JSON.stringify({ portraits: 49, revision: 'ai-v1' }));
}
