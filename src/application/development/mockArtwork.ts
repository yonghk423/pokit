import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

/** Compressed protagonist-6 sample photos used by development diary fixtures. */
export const MOCK_DIARY_ARTWORK = [
  { sceneId: 'p6-01-rush-hour-commute', asset: require('../../../assets/development/mock-diary/protagonist-6/01-rush-hour-commute.webp') },
  { sceneId: 'p6-02-office-presentation', asset: require('../../../assets/development/mock-diary/protagonist-6/02-office-presentation.webp') },
  { sceneId: 'p6-03-spilled-coffee-report', asset: require('../../../assets/development/mock-diary/protagonist-6/03-spilled-coffee-report.webp') },
  { sceneId: 'p6-04-lunch-rooftop', asset: require('../../../assets/development/mock-diary/protagonist-6/04-lunch-rooftop.webp') },
  { sceneId: 'p6-05-proud-promotion', asset: require('../../../assets/development/mock-diary/protagonist-6/05-proud-promotion.webp') },
  { sceneId: 'p6-06-angry-email', asset: require('../../../assets/development/mock-diary/protagonist-6/06-angry-email.webp') },
  { sceneId: 'p6-07-after-work-run', asset: require('../../../assets/development/mock-diary/protagonist-6/07-after-work-run.webp') },
  { sceneId: 'p6-08-missed-deadline', asset: require('../../../assets/development/mock-diary/protagonist-6/08-missed-deadline.webp') },
  { sceneId: 'p6-09-boxing-bag', asset: require('../../../assets/development/mock-diary/protagonist-6/09-boxing-bag.webp') },
  { sceneId: 'p6-10-basketball-shot', asset: require('../../../assets/development/mock-diary/protagonist-6/10-basketball-shot.webp') },
  { sceneId: 'p6-11-swimming-laps', asset: require('../../../assets/development/mock-diary/protagonist-6/11-swimming-laps.webp') },
  { sceneId: 'p6-12-cycling-hill', asset: require('../../../assets/development/mock-diary/protagonist-6/12-cycling-hill.webp') },
  { sceneId: 'p6-13-yoga-balance', asset: require('../../../assets/development/mock-diary/protagonist-6/13-yoga-balance.webp') },
  { sceneId: 'p6-14-tennis-serve', asset: require('../../../assets/development/mock-diary/protagonist-6/14-tennis-serve.webp') },
  { sceneId: 'p6-15-soccer-dribble', asset: require('../../../assets/development/mock-diary/protagonist-6/15-soccer-dribble.webp') },
  { sceneId: 'p6-16-dance-practice', asset: require('../../../assets/development/mock-diary/protagonist-6/16-dance-practice.webp') },
  { sceneId: 'p6-17-climbing-wall', asset: require('../../../assets/development/mock-diary/protagonist-6/17-climbing-wall.webp') },
  { sceneId: 'p6-18-jump-rope', asset: require('../../../assets/development/mock-diary/protagonist-6/18-jump-rope.webp') },
  { sceneId: 'p6-19-rain-run', asset: require('../../../assets/development/mock-diary/protagonist-6/19-rain-run.webp') },
  { sceneId: 'p6-20-badminton-rally', asset: require('../../../assets/development/mock-diary/protagonist-6/20-badminton-rally.webp') },
  { sceneId: 'p6-21-couch-after-work', asset: require('../../../assets/development/mock-diary/protagonist-6/21-couch-after-work.webp') },
  { sceneId: 'p6-22-window-tea', asset: require('../../../assets/development/mock-diary/protagonist-6/22-window-tea.webp') },
  { sceneId: 'p6-23-laundry-day', asset: require('../../../assets/development/mock-diary/protagonist-6/23-laundry-day.webp') },
  { sceneId: 'p6-24-home-cooking', asset: require('../../../assets/development/mock-diary/protagonist-6/24-home-cooking.webp') },
  { sceneId: 'p6-25-lazy-morning', asset: require('../../../assets/development/mock-diary/protagonist-6/25-lazy-morning.webp') },
  { sceneId: 'p6-26-couch-nap', asset: require('../../../assets/development/mock-diary/protagonist-6/26-couch-nap.webp') },
  { sceneId: 'p6-27-houseplant-care', asset: require('../../../assets/development/mock-diary/protagonist-6/27-houseplant-care.webp') },
  { sceneId: 'p6-28-movie-night', asset: require('../../../assets/development/mock-diary/protagonist-6/28-movie-night.webp') },
  { sceneId: 'p6-29-bathroom-skincare', asset: require('../../../assets/development/mock-diary/protagonist-6/29-bathroom-skincare.webp') },
  { sceneId: 'p6-30-cat-on-lap', asset: require('../../../assets/development/mock-diary/protagonist-6/30-cat-on-lap.webp') },
  { sceneId: 'p6-31-frustrated-phone-call', asset: require('../../../assets/development/mock-diary/protagonist-6/31-frustrated-phone-call.webp') },
  { sceneId: 'p6-32-sad-bus-stop', asset: require('../../../assets/development/mock-diary/protagonist-6/32-sad-bus-stop.webp') },
  { sceneId: 'p6-33-exam-results-joy', asset: require('../../../assets/development/mock-diary/protagonist-6/33-exam-results-joy.webp') },
  { sceneId: 'p6-34-interview-nerves', asset: require('../../../assets/development/mock-diary/protagonist-6/34-interview-nerves.webp') },
  { sceneId: 'p6-35-breakup-evening', asset: require('../../../assets/development/mock-diary/protagonist-6/35-breakup-evening.webp') },
  { sceneId: 'p6-36-concert-happiness', asset: require('../../../assets/development/mock-diary/protagonist-6/36-concert-happiness.webp') },
  { sceneId: 'p6-37-embarrassed-spill', asset: require('../../../assets/development/mock-diary/protagonist-6/37-embarrassed-spill.webp') },
  { sceneId: 'p6-38-holiday-loneliness', asset: require('../../../assets/development/mock-diary/protagonist-6/38-holiday-loneliness.webp') },
  { sceneId: 'p6-39-birthday-surprise', asset: require('../../../assets/development/mock-diary/protagonist-6/39-birthday-surprise.webp') },
  { sceneId: 'p6-40-relief-after-cry', asset: require('../../../assets/development/mock-diary/protagonist-6/40-relief-after-cry.webp') },
  { sceneId: 'p6-41-spring-blossom-bicycle', asset: require('../../../assets/development/mock-diary/protagonist-6/41-spring-blossom-bicycle.webp') },
  { sceneId: 'p6-42-spring-rain-puddle', asset: require('../../../assets/development/mock-diary/protagonist-6/42-spring-rain-puddle.webp') },
  { sceneId: 'p6-43-spring-garden-planting', asset: require('../../../assets/development/mock-diary/protagonist-6/43-spring-garden-planting.webp') },
  { sceneId: 'p6-44-summer-beach-walk', asset: require('../../../assets/development/mock-diary/protagonist-6/44-summer-beach-walk.webp') },
  { sceneId: 'p6-45-summer-hill-hike', asset: require('../../../assets/development/mock-diary/protagonist-6/45-summer-hill-hike.webp') },
  { sceneId: 'p6-46-autumn-leaves', asset: require('../../../assets/development/mock-diary/protagonist-6/46-autumn-leaves.webp') },
  { sceneId: 'p6-47-autumn-market', asset: require('../../../assets/development/mock-diary/protagonist-6/47-autumn-market.webp') },
  { sceneId: 'p6-48-autumn-wind-commute', asset: require('../../../assets/development/mock-diary/protagonist-6/48-autumn-wind-commute.webp') },
  { sceneId: 'p6-49-winter-snow-play', asset: require('../../../assets/development/mock-diary/protagonist-6/49-winter-snow-play.webp') },
  { sceneId: 'p6-50-winter-bus-wait', asset: require('../../../assets/development/mock-diary/protagonist-6/50-winter-bus-wait.webp') },
] as const;

const artworkByScene = new Map<string, (typeof MOCK_DIARY_ARTWORK)[number]>(MOCK_DIARY_ARTWORK.map(artwork => [artwork.sceneId, artwork]));

export function developmentArtworkUri(sceneId: string): string | undefined {
  const artwork = artworkByScene.get(sceneId);
  if (!artwork || !FileSystem.documentDirectory) return undefined;
  return `${FileSystem.documentDirectory}hero-photos/photo-${sceneId.slice(3)}.webp`;
}

/** Copy bundled WebP samples to the same durable folder used for diary photos. */
export async function prepareDevelopmentMockArtwork(): Promise<void> {
  if (!__DEV__ || !FileSystem.documentDirectory) return;
  const folder = `${FileSystem.documentDirectory}hero-photos/`;
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  await Promise.all(MOCK_DIARY_ARTWORK.map(async artwork => {
    const destination = `${folder}photo-${artwork.sceneId.slice(3)}.webp`;
    try {
      const existing = await FileSystem.getInfoAsync(destination);
      if (existing.exists) return;
      const asset = await Asset.fromModule(artwork.asset).downloadAsync();
      if (asset.localUri) await FileSystem.copyAsync({ from: asset.localUri, to: destination });
    } catch {
      // Keep the development app usable if one sample image cannot be copied.
    }
  }));
}
