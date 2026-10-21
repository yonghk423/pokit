import { localStorageClient } from '@shared/lib/storage/localStorageClient';

export const COMIC_SCENES = [
  { id: 'wake', source: require('../../../../assets/activity-illustrations/comic-day/01-waking-up.png'), label: 'comicDay.wake' },
  { id: 'breakfast', source: require('../../../../assets/activity-illustrations/comic-day/02-breakfast.png'), label: 'comicDay.breakfast' },
  { id: 'focus', source: require('../../../../assets/activity-illustrations/comic-day/03-focused-work.png'), label: 'comicDay.focus' },
  { id: 'walk', source: require('../../../../assets/activity-illustrations/comic-day/04-park-walk.png'), label: 'comicDay.walk' },
  { id: 'read', source: require('../../../../assets/activity-illustrations/comic-day/05-reading.png'), label: 'comicDay.read' },
  { id: '01-exercise', source: require('../../../../assets/activity-illustrations/01-exercise.webp'), label: 'comicDay.activity.01-exercise' },
  { id: '02-study', source: require('../../../../assets/activity-illustrations/02-study.webp'), label: 'comicDay.activity.02-study' },
  { id: '03-meeting', source: require('../../../../assets/activity-illustrations/03-meeting.webp'), label: 'comicDay.activity.03-meeting' },
  { id: '04-laundry', source: require('../../../../assets/activity-illustrations/04-laundry.webp'), label: 'comicDay.activity.04-laundry' },
  { id: '05-work', source: require('../../../../assets/activity-illustrations/05-work.webp'), label: 'comicDay.activity.05-work' },
  { id: '06-reading', source: require('../../../../assets/activity-illustrations/06-reading.webp'), label: 'comicDay.activity.06-reading' },
  { id: '07-movie-home', source: require('../../../../assets/activity-illustrations/07-movie-home.webp'), label: 'comicDay.activity.07-movie-home' },
  { id: '08-study-hoodie', source: require('../../../../assets/activity-illustrations/08-study-hoodie.webp'), label: 'comicDay.activity.08-study-hoodie' },
  { id: '09-coffee-tablet', source: require('../../../../assets/activity-illustrations/09-coffee-tablet.webp'), label: 'comicDay.activity.09-coffee-tablet' },
  { id: '10-park-walk', source: require('../../../../assets/activity-illustrations/10-park-walk.webp'), label: 'comicDay.activity.10-park-walk' },
  { id: '11-photography', source: require('../../../../assets/activity-illustrations/11-photography.webp'), label: 'comicDay.activity.11-photography' },
  { id: '12-weights', source: require('../../../../assets/activity-illustrations/12-weights.webp'), label: 'comicDay.activity.12-weights' },
  { id: '13-yoga', source: require('../../../../assets/activity-illustrations/13-yoga.webp'), label: 'comicDay.activity.13-yoga' },
  { id: '14-headphone-run', source: require('../../../../assets/activity-illustrations/14-headphone-run.webp'), label: 'comicDay.activity.14-headphone-run' },
  { id: '15-eating', source: require('../../../../assets/activity-illustrations/15-eating.webp'), label: 'comicDay.activity.15-eating' },
  { id: '16-cinema', source: require('../../../../assets/activity-illustrations/16-cinema.webp'), label: 'comicDay.activity.16-cinema' },
  { id: '17-web-browsing', source: require('../../../../assets/activity-illustrations/17-web-browsing.webp'), label: 'comicDay.activity.17-web-browsing' },
  { id: '18-shopping', source: require('../../../../assets/activity-illustrations/18-shopping.webp'), label: 'comicDay.activity.18-shopping' },
  { id: '19-hiking', source: require('../../../../assets/activity-illustrations/19-hiking.webp'), label: 'comicDay.activity.19-hiking' },
  { id: '20-swimming', source: require('../../../../assets/activity-illustrations/20-swimming.webp'), label: 'comicDay.activity.20-swimming' },
  { id: '21-airport-travel', source: require('../../../../assets/activity-illustrations/21-airport-travel.webp'), label: 'comicDay.activity.21-airport-travel' },
  { id: '22-driving', source: require('../../../../assets/activity-illustrations/22-driving.webp'), label: 'comicDay.activity.22-driving' },
  { id: '23-morning-stretch', source: require('../../../../assets/activity-illustrations/23-morning-stretch.webp'), label: 'comicDay.activity.23-morning-stretch' },
  { id: '24-making-bed', source: require('../../../../assets/activity-illustrations/24-making-bed.webp'), label: 'comicDay.activity.24-making-bed' },
  { id: '25-skincare', source: require('../../../../assets/activity-illustrations/25-skincare.webp'), label: 'comicDay.activity.25-skincare' },
  { id: '26-getting-dressed', source: require('../../../../assets/activity-illustrations/26-getting-dressed.webp'), label: 'comicDay.activity.26-getting-dressed' },
  { id: '27-breakfast', source: require('../../../../assets/activity-illustrations/27-breakfast.webp'), label: 'comicDay.activity.27-breakfast' },
  { id: '28-cooking', source: require('../../../../assets/activity-illustrations/28-cooking.webp'), label: 'comicDay.activity.28-cooking' },
  { id: '29-dishes', source: require('../../../../assets/activity-illustrations/29-dishes.webp'), label: 'comicDay.activity.29-dishes' },
  { id: '30-vacuuming', source: require('../../../../assets/activity-illustrations/30-vacuuming.webp'), label: 'comicDay.activity.30-vacuuming' },
  { id: '31-organizing-closet', source: require('../../../../assets/activity-illustrations/31-organizing-closet.webp'), label: 'comicDay.activity.31-organizing-closet' },
  { id: '32-watering-plants', source: require('../../../../assets/activity-illustrations/32-watering-plants.webp'), label: 'comicDay.activity.32-watering-plants' },
  { id: '33-grocery-shopping', source: require('../../../../assets/activity-illustrations/33-grocery-shopping.webp'), label: 'comicDay.activity.33-grocery-shopping' },
  { id: '34-subway-commute', source: require('../../../../assets/activity-illustrations/34-subway-commute.webp'), label: 'comicDay.activity.34-subway-commute' },
  { id: '35-bus-ride', source: require('../../../../assets/activity-illustrations/35-bus-ride.webp'), label: 'comicDay.activity.35-bus-ride' },
  { id: '36-cycling', source: require('../../../../assets/activity-illustrations/36-cycling.webp'), label: 'comicDay.activity.36-cycling' },
  { id: '37-journaling', source: require('../../../../assets/activity-illustrations/37-journaling.webp'), label: 'comicDay.activity.37-journaling' },
  { id: '38-listening-music', source: require('../../../../assets/activity-illustrations/38-listening-music.webp'), label: 'comicDay.activity.38-listening-music' },
  { id: '39-piano-practice', source: require('../../../../assets/activity-illustrations/39-piano-practice.webp'), label: 'comicDay.activity.39-piano-practice' },
  { id: '40-video-call', source: require('../../../../assets/activity-illustrations/40-video-call.webp'), label: 'comicDay.activity.40-video-call' },
  { id: '41-pet-walk', source: require('../../../../assets/activity-illustrations/41-pet-walk.webp'), label: 'comicDay.activity.41-pet-walk' },
  { id: '42-meditation', source: require('../../../../assets/activity-illustrations/42-meditation.webp'), label: 'comicDay.activity.42-meditation' },
  { id: '43-sketching', source: require('../../../../assets/activity-illustrations/43-sketching.webp'), label: 'comicDay.activity.43-sketching' },
  { id: '44-baking', source: require('../../../../assets/activity-illustrations/44-baking.webp'), label: 'comicDay.activity.44-baking' },
  { id: '45-board-game', source: require('../../../../assets/activity-illustrations/45-board-game.webp'), label: 'comicDay.activity.45-board-game' },
  { id: '46-camping', source: require('../../../../assets/activity-illustrations/46-camping.webp'), label: 'comicDay.activity.46-camping' },
  { id: '47-fold-laundry', source: require('../../../../assets/activity-illustrations/47-fold-laundry.webp'), label: 'comicDay.activity.47-fold-laundry' },
  { id: '48-recycling', source: require('../../../../assets/activity-illustrations/48-recycling.webp'), label: 'comicDay.activity.48-recycling' },
  { id: '49-guitar', source: require('../../../../assets/activity-illustrations/49-guitar.webp'), label: 'comicDay.activity.49-guitar' },
  { id: '50-nap', source: require('../../../../assets/activity-illustrations/50-nap.webp'), label: 'comicDay.activity.50-nap' },
  { id: '51-sleeping-in-bed', source: require('../../../../assets/activity-illustrations/51-sleeping-in-bed.webp'), label: 'comicDay.activity.51-sleeping-in-bed' },
  { id: '52-reading-cafe', source: require('../../../../assets/activity-illustrations/52-reading-cafe.webp'), label: 'comicDay.activity.52-reading-cafe' },
  { id: '53-diary-in-bed', source: require('../../../../assets/activity-illustrations/53-diary-in-bed.webp'), label: 'comicDay.activity.53-diary-in-bed' },
  { id: '54-seaside-trip', source: require('../../../../assets/activity-illustrations/54-seaside-trip.webp'), label: 'comicDay.activity.54-seaside-trip' },
] as const;
export type ComicSceneId = typeof COMIC_SCENES[number]['id'];
const STORAGE_KEY = 'pokit:comic-scene-images';
export function loadComicScenes(): Record<string, ComicSceneId> {
  try {
    const raw: unknown = JSON.parse(localStorageClient.getItemRaw(STORAGE_KEY) ?? '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw).filter(([, value]) => COMIC_SCENES.some(scene => scene.id === value)));
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
  if (/read|book|독서|책|読書/.test(text)) return COMIC_SCENES[4];
  if (/walk|run|exercise|산책|러닝|운동|스트레칭|散歩/.test(text)) return COMIC_SCENES[3];
  if (/breakfast|meal|food|아침|식사|섭취|복용|朝食/.test(text)) return COMIC_SCENES[1];
  if (/wake|sleep|기상|수면|起床/.test(text)) return COMIC_SCENES[0];
  return COMIC_SCENES[2];
}

/** Activity-based categories audited against all 59 illustrations. Overlap is intentional. */
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
  preparation: ['wake', '23-morning-stretch', '24-making-bed', '25-skincare', '26-getting-dressed'],
  food: ['breakfast', '15-eating', '27-breakfast', '28-cooking', '44-baking'],
  cafe: ['09-coffee-tablet', '52-reading-cafe'],
  work: ['focus', '02-study', '03-meeting', '05-work', '08-study-hoodie', '17-web-browsing'],
  exercise: ['01-exercise', '12-weights', '13-yoga', '14-headphone-run', '19-hiking', '20-swimming', '23-morning-stretch', '36-cycling'],
  outdoors: ['walk', '10-park-walk', '19-hiking', '41-pet-walk', '46-camping', '54-seaside-trip'],
  home: ['04-laundry', '24-making-bed', '29-dishes', '30-vacuuming', '31-organizing-closet', '32-watering-plants', '47-fold-laundry', '48-recycling'],
  travel: ['21-airport-travel', '22-driving', '34-subway-commute', '35-bus-ride', '46-camping', '54-seaside-trip'],
  shopping: ['18-shopping', '33-grocery-shopping'],
  hobbies: ['read', '06-reading', '07-movie-home', '11-photography', '16-cinema', '37-journaling', '38-listening-music', '39-piano-practice', '40-video-call', '43-sketching', '44-baking', '45-board-game', '49-guitar', '52-reading-cafe', '53-diary-in-bed'],
  rest: ['13-yoga', '42-meditation', '50-nap', '51-sleeping-in-bed'],
} satisfies Record<Exclude<ComicSceneCategory, 'all'>, readonly ComicSceneId[]>;
export function comicSceneMatchesCategory(id: ComicSceneId, category: ComicSceneCategory): boolean {
  return category === 'all' || (CATEGORY_IMAGES[category] as readonly ComicSceneId[]).includes(id);
}
