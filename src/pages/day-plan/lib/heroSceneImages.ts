import { localStorageClient } from '@shared/lib/storage/localStorageClient';

export const COMIC_SCENES = [
  { id: '01-exercise', source: require('../../../../assets/activity-illustrations/optimized/01-exercise-960.webp'), label: 'comicDay.activity.01-exercise' },
  { id: '02-study', source: require('../../../../assets/activity-illustrations/optimized/02-study-960.webp'), label: 'comicDay.activity.02-study' },
  { id: '03-meeting', source: require('../../../../assets/activity-illustrations/optimized/03-meeting-960.webp'), label: 'comicDay.activity.03-meeting' },
  { id: '04-laundry', source: require('../../../../assets/activity-illustrations/optimized/04-laundry-960.webp'), label: 'comicDay.activity.04-laundry' },
  { id: '05-work', source: require('../../../../assets/activity-illustrations/optimized/05-work-960.webp'), label: 'comicDay.activity.05-work' },
  { id: '06-reading', source: require('../../../../assets/activity-illustrations/optimized/06-reading-960.webp'), label: 'comicDay.activity.06-reading' },
  { id: '07-movie-home', source: require('../../../../assets/activity-illustrations/optimized/07-movie-home-960.webp'), label: 'comicDay.activity.07-movie-home' },
  { id: '08-study-hoodie', source: require('../../../../assets/activity-illustrations/optimized/08-study-hoodie-960.webp'), label: 'comicDay.activity.08-study-hoodie' },
  { id: '09-coffee-tablet', source: require('../../../../assets/activity-illustrations/optimized/09-coffee-tablet-960.webp'), label: 'comicDay.activity.09-coffee-tablet' },
  { id: '10-park-walk', source: require('../../../../assets/activity-illustrations/optimized/10-park-walk-960.webp'), label: 'comicDay.activity.10-park-walk' },
  { id: '11-photography', source: require('../../../../assets/activity-illustrations/optimized/11-photography-960.webp'), label: 'comicDay.activity.11-photography' },
  { id: '12-weights', source: require('../../../../assets/activity-illustrations/optimized/12-weights-960.webp'), label: 'comicDay.activity.12-weights' },
  { id: '13-yoga', source: require('../../../../assets/activity-illustrations/optimized/13-yoga-960.webp'), label: 'comicDay.activity.13-yoga' },
  { id: '14-headphone-run', source: require('../../../../assets/activity-illustrations/optimized/14-headphone-run-960.webp'), label: 'comicDay.activity.14-headphone-run' },
  { id: '15-eating', source: require('../../../../assets/activity-illustrations/optimized/15-eating-960.webp'), label: 'comicDay.activity.15-eating' },
  { id: '16-cinema', source: require('../../../../assets/activity-illustrations/optimized/16-cinema-960.webp'), label: 'comicDay.activity.16-cinema' },
  { id: '17-web-browsing', source: require('../../../../assets/activity-illustrations/optimized/17-web-browsing-960.webp'), label: 'comicDay.activity.17-web-browsing' },
  { id: '18-shopping', source: require('../../../../assets/activity-illustrations/optimized/18-shopping-960.webp'), label: 'comicDay.activity.18-shopping' },
  { id: '19-hiking', source: require('../../../../assets/activity-illustrations/optimized/19-hiking-960.webp'), label: 'comicDay.activity.19-hiking' },
  { id: '20-swimming', source: require('../../../../assets/activity-illustrations/optimized/20-swimming-960.webp'), label: 'comicDay.activity.20-swimming' },
  { id: '21-airport-travel', source: require('../../../../assets/activity-illustrations/optimized/21-airport-travel-960.webp'), label: 'comicDay.activity.21-airport-travel' },
  { id: '22-driving', source: require('../../../../assets/activity-illustrations/optimized/22-driving-960.webp'), label: 'comicDay.activity.22-driving' },
  { id: '23-morning-stretch', source: require('../../../../assets/activity-illustrations/optimized/23-morning-stretch-960.webp'), label: 'comicDay.activity.23-morning-stretch' },
  { id: '24-making-bed', source: require('../../../../assets/activity-illustrations/optimized/24-making-bed-960.webp'), label: 'comicDay.activity.24-making-bed' },
  { id: '25-skincare', source: require('../../../../assets/activity-illustrations/optimized/25-skincare-960.webp'), label: 'comicDay.activity.25-skincare' },
  { id: '26-getting-dressed', source: require('../../../../assets/activity-illustrations/optimized/26-getting-dressed-960.webp'), label: 'comicDay.activity.26-getting-dressed' },
  { id: '27-breakfast', source: require('../../../../assets/activity-illustrations/optimized/27-breakfast-960.webp'), label: 'comicDay.activity.27-breakfast' },
  { id: '28-cooking', source: require('../../../../assets/activity-illustrations/optimized/28-cooking-960.webp'), label: 'comicDay.activity.28-cooking' },
  { id: '29-dishes', source: require('../../../../assets/activity-illustrations/optimized/29-dishes-960.webp'), label: 'comicDay.activity.29-dishes' },
  { id: '30-vacuuming', source: require('../../../../assets/activity-illustrations/optimized/30-vacuuming-960.webp'), label: 'comicDay.activity.30-vacuuming' },
  { id: '31-organizing-closet', source: require('../../../../assets/activity-illustrations/optimized/31-organizing-closet-960.webp'), label: 'comicDay.activity.31-organizing-closet' },
  { id: '32-watering-plants', source: require('../../../../assets/activity-illustrations/optimized/32-watering-plants-960.webp'), label: 'comicDay.activity.32-watering-plants' },
  { id: '33-grocery-shopping', source: require('../../../../assets/activity-illustrations/optimized/33-grocery-shopping-960.webp'), label: 'comicDay.activity.33-grocery-shopping' },
  { id: '34-subway-commute', source: require('../../../../assets/activity-illustrations/optimized/34-subway-commute-960.webp'), label: 'comicDay.activity.34-subway-commute' },
  { id: '35-bus-ride', source: require('../../../../assets/activity-illustrations/optimized/35-bus-ride-960.webp'), label: 'comicDay.activity.35-bus-ride' },
  { id: '36-cycling', source: require('../../../../assets/activity-illustrations/optimized/36-cycling-960.webp'), label: 'comicDay.activity.36-cycling' },
  { id: '37-journaling', source: require('../../../../assets/activity-illustrations/optimized/37-journaling-960.webp'), label: 'comicDay.activity.37-journaling' },
  { id: '38-listening-music', source: require('../../../../assets/activity-illustrations/optimized/38-listening-music-960.webp'), label: 'comicDay.activity.38-listening-music' },
  { id: '39-piano-practice', source: require('../../../../assets/activity-illustrations/optimized/39-piano-practice-960.webp'), label: 'comicDay.activity.39-piano-practice' },
  { id: '40-video-call', source: require('../../../../assets/activity-illustrations/optimized/40-video-call-960.webp'), label: 'comicDay.activity.40-video-call' },
  { id: '41-pet-walk', source: require('../../../../assets/activity-illustrations/optimized/41-pet-walk-960.webp'), label: 'comicDay.activity.41-pet-walk' },
  { id: '42-meditation', source: require('../../../../assets/activity-illustrations/optimized/42-meditation-960.webp'), label: 'comicDay.activity.42-meditation' },
  { id: '43-sketching', source: require('../../../../assets/activity-illustrations/optimized/43-sketching-960.webp'), label: 'comicDay.activity.43-sketching' },
  { id: '44-baking', source: require('../../../../assets/activity-illustrations/optimized/44-baking-960.webp'), label: 'comicDay.activity.44-baking' },
  { id: '45-board-game', source: require('../../../../assets/activity-illustrations/optimized/45-board-game-960.webp'), label: 'comicDay.activity.45-board-game' },
  { id: '46-camping', source: require('../../../../assets/activity-illustrations/optimized/46-camping-960.webp'), label: 'comicDay.activity.46-camping' },
  { id: '47-fold-laundry', source: require('../../../../assets/activity-illustrations/optimized/47-fold-laundry-960.webp'), label: 'comicDay.activity.47-fold-laundry' },
  { id: '48-recycling', source: require('../../../../assets/activity-illustrations/optimized/48-recycling-960.webp'), label: 'comicDay.activity.48-recycling' },
  { id: '49-guitar', source: require('../../../../assets/activity-illustrations/optimized/49-guitar-960.webp'), label: 'comicDay.activity.49-guitar' },
  { id: '50-nap', source: require('../../../../assets/activity-illustrations/optimized/50-nap-960.webp'), label: 'comicDay.activity.50-nap' },
  { id: '51-sleeping-in-bed', source: require('../../../../assets/activity-illustrations/optimized/51-sleeping-in-bed-960.webp'), label: 'comicDay.activity.51-sleeping-in-bed' },
  { id: '52-reading-cafe', source: require('../../../../assets/activity-illustrations/optimized/52-reading-cafe-960.webp'), label: 'comicDay.activity.52-reading-cafe' },
  { id: '53-diary-in-bed', source: require('../../../../assets/activity-illustrations/optimized/53-diary-in-bed-960.webp'), label: 'comicDay.activity.53-diary-in-bed' },
  { id: '54-seaside-trip', source: require('../../../../assets/activity-illustrations/optimized/54-seaside-trip-960.webp'), label: 'comicDay.activity.54-seaside-trip' },
  { id: '55-window-magazine', source: require('../../../../assets/activity-illustrations/optimized/55-window-magazine-960.webp'), label: 'comicDay.activity.55-window-magazine' },
  { id: '56-bookstore', source: require('../../../../assets/activity-illustrations/optimized/56-bookstore-960.webp'), label: 'comicDay.activity.56-bookstore' },
  { id: 'puppy-ball-play', source: require('../../../../assets/activity-illustrations/puppy/puppy-ball-play-960.webp'), label: 'comicDay.puppy.ball-play' },
  { id: 'puppy-park-walk', source: require('../../../../assets/activity-illustrations/puppy/puppy-park-walk-960.webp'), label: 'comicDay.puppy.park-walk' },
  { id: 'puppy-nap', source: require('../../../../assets/activity-illustrations/puppy/puppy-nap-960.webp'), label: 'comicDay.puppy.nap' },
  { id: 'puppy-meal', source: require('../../../../assets/activity-illustrations/puppy/puppy-meal-960.webp'), label: 'comicDay.puppy.meal' },
  { id: 'puppy-water', source: require('../../../../assets/activity-illustrations/puppy/puppy-water-960.webp'), label: 'comicDay.puppy.water' },
  { id: 'puppy-treat', source: require('../../../../assets/activity-illustrations/puppy/puppy-treat-960.webp'), label: 'comicDay.puppy.treat' },
  { id: 'puppy-bath', source: require('../../../../assets/activity-illustrations/puppy/puppy-bath-960.webp'), label: 'comicDay.puppy.bath' },
  { id: 'puppy-towel', source: require('../../../../assets/activity-illustrations/puppy/puppy-towel-960.webp'), label: 'comicDay.puppy.towel' },
  { id: 'puppy-window-watch', source: require('../../../../assets/activity-illustrations/puppy/puppy-window-watch-960.webp'), label: 'comicDay.puppy.window-watch' },
  { id: 'puppy-fetch', source: require('../../../../assets/activity-illustrations/puppy/puppy-fetch-960.webp'), label: 'comicDay.puppy.fetch' },
  { id: 'puppy-grass-sniff', source: require('../../../../assets/activity-illustrations/puppy/puppy-grass-sniff-960.webp'), label: 'comicDay.puppy.grass-sniff' },
  { id: 'puppy-stretch', source: require('../../../../assets/activity-illustrations/puppy/puppy-stretch-960.webp'), label: 'comicDay.puppy.stretch' },
  { id: 'puppy-wait-door', source: require('../../../../assets/activity-illustrations/puppy/puppy-wait-door-960.webp'), label: 'comicDay.puppy.wait-door' },
  { id: 'puppy-car-ride', source: require('../../../../assets/activity-illustrations/puppy/puppy-car-ride-960.webp'), label: 'comicDay.puppy.car-ride' },
  { id: 'puppy-seaside', source: require('../../../../assets/activity-illustrations/puppy/puppy-seaside-960.webp'), label: 'comicDay.puppy.seaside' },
] as const;
export type ComicSceneId = typeof COMIC_SCENES[number]['id'];
/** Short ids that were byte-identical copies of the numbered scenes. */
const LEGACY_SCENE_IDS: Record<string, ComicSceneId> = {
  wake: '23-morning-stretch',
  breakfast: '27-breakfast',
  focus: '05-work',
  walk: '10-park-walk',
  read: '06-reading',
};
export function canonicalComicSceneId(value: unknown): ComicSceneId | null {
  const id = typeof value === 'string' ? LEGACY_SCENE_IDS[value] ?? value : value;
  return COMIC_SCENES.some(scene => scene.id === id) ? id as ComicSceneId : null;
}
const STORAGE_KEY = 'pokit:comic-scene-images';
export function loadComicScenes(): Record<string, ComicSceneId> {
  try {
    const raw: unknown = JSON.parse(localStorageClient.getItemRaw(STORAGE_KEY) ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).flatMap(([key, value]) => {
      const id = canonicalComicSceneId(value);
      return id ? [[key, id] as const] : [];
    }));
  } catch { return {}; }
}
export function saveComicScene(key: string, scene: ComicSceneId) {
  const next = { ...loadComicScenes(), [key]: scene };
  localStorageClient.setItemRaw(STORAGE_KEY, JSON.stringify(next));
  return next;
}
export function resolveComicScene(key: string, label: string, choices: Record<string, ComicSceneId>) {
  const chosen = COMIC_SCENES.find(scene => scene.id === choices[key]);
  if (chosen) return chosen;
  const text = `${key} ${label}`.toLowerCase();
  if (/read|book|독서|책|読書/.test(text)) return sceneById('06-reading');
  if (/walk|run|exercise|산책|러닝|운동|스트레칭|散歩/.test(text)) return sceneById('10-park-walk');
  if (/breakfast|meal|food|아침|식사|섭취|복용|朝食/.test(text)) return sceneById('27-breakfast');
  if (/wake|sleep|기상|수면|起床/.test(text)) return sceneById('23-morning-stretch');
  return sceneById('05-work');
}
function sceneById(id: ComicSceneId) {
  return COMIC_SCENES.find(scene => scene.id === id) ?? COMIC_SCENES[0];
}

/** Activity-based categories for both character collections. Overlap is intentional. */
export const COMIC_SCENE_CATEGORIES = [
  { id: 'all', label: 'comicDay.all' },
  { id: 'preparation', label: 'comicDay.category.preparation' },
  { id: 'food', label: 'comicDay.category.food' },
  { id: 'cafe', label: 'comicDay.category.cafe' },
  { id: 'work', label: 'comicDay.category.work' },
  { id: 'exercise', label: 'comicDay.category.exercise' },
  { id: 'outdoors', label: 'comicDay.category.outdoors' },
  { id: 'home', label: 'comicDay.category.home' },
  { id: 'travel', label: 'comicDay.category.travel' },
  { id: 'shopping', label: 'comicDay.category.shopping' },
  { id: 'hobbies', label: 'comicDay.category.hobbies' },
  { id: 'rest', label: 'comicDay.category.rest' },
] as const;
export type ComicSceneCategory = typeof COMIC_SCENE_CATEGORIES[number]['id'];
const CATEGORY_IMAGES = {
  preparation: ['23-morning-stretch', '24-making-bed', '25-skincare', '26-getting-dressed'],
  food: ['puppy-meal', 'puppy-water', 'puppy-treat', '15-eating', '27-breakfast', '28-cooking', '44-baking'],
  cafe: ['09-coffee-tablet', '52-reading-cafe'],
  work: ['02-study', '03-meeting', '05-work', '08-study-hoodie', '17-web-browsing'],
  exercise: ['puppy-ball-play', 'puppy-fetch', 'puppy-stretch', '01-exercise', '12-weights', '13-yoga', '14-headphone-run', '19-hiking', '20-swimming', '23-morning-stretch', '36-cycling'],
  outdoors: ['puppy-park-walk', 'puppy-grass-sniff', 'puppy-seaside', '10-park-walk', '19-hiking', '41-pet-walk', '46-camping', '54-seaside-trip'],
  home: ['puppy-bath', 'puppy-towel', 'puppy-window-watch', 'puppy-wait-door', '04-laundry', '24-making-bed', '29-dishes', '30-vacuuming', '31-organizing-closet', '32-watering-plants', '47-fold-laundry', '48-recycling', '55-window-magazine'],
  travel: ['puppy-car-ride', 'puppy-seaside', '21-airport-travel', '22-driving', '34-subway-commute', '35-bus-ride', '46-camping', '54-seaside-trip'],
  shopping: ['18-shopping', '33-grocery-shopping', '56-bookstore'],
  hobbies: ['puppy-ball-play', 'puppy-fetch', '06-reading', '07-movie-home', '11-photography', '16-cinema', '37-journaling', '38-listening-music', '39-piano-practice', '40-video-call', '43-sketching', '44-baking', '45-board-game', '49-guitar', '52-reading-cafe', '53-diary-in-bed', '55-window-magazine', '56-bookstore'],
  rest: ['puppy-nap', 'puppy-window-watch', '13-yoga', '42-meditation', '50-nap', '51-sleeping-in-bed', '55-window-magazine'],
} satisfies Record<Exclude<ComicSceneCategory, 'all'>, readonly ComicSceneId[]>;
export function comicSceneMatchesCategory(id: ComicSceneId, category: ComicSceneCategory): boolean {
  return category === 'all' || (CATEGORY_IMAGES[category] as readonly ComicSceneId[]).includes(id);
}
