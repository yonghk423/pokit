import type { AppLocale } from '@shared/lib/i18n';
import type { ComicSceneId } from '@pages/day-plan/lib/heroSceneImages';

export const MOCK_PROTAGONISTS = [
  { id: 'protagonist-1', names: { ko: '주인공1', en: 'Character 1', ja: '主人公1', 'zh-TW': '主角1' } },
  { id: 'protagonist-2', names: { ko: '주인공2', en: 'Character 2', ja: '主人公2', 'zh-TW': '主角2' } },
  { id: 'protagonist-3', names: { ko: '주인공3', en: 'Character 3', ja: '主人公3', 'zh-TW': '主角3' } },
  { id: 'protagonist-5', names: { ko: '주인공5', en: 'Character 5', ja: '主人公5', 'zh-TW': '主角5' } },
  { id: 'protagonist-6', names: { ko: '주인공6', en: 'Character 6', ja: '主人公6', 'zh-TW': '主角6' } },
] as const;

const sceneImages: Record<string, readonly ComicSceneId[]> = {
  'protagonist-1': ['23-morning-stretch', '27-breakfast', '05-work', '09-coffee-tablet', '10-park-walk', '01-exercise', '46-camping', '11-photography', '01-exercise', '01-exercise', '24-making-bed', '28-cooking', '43-sketching', '25-skincare', '50-nap'],
  'protagonist-2': ['p2-13-yoga-stretch', 'p2-25-pancake-flip', 'p2-08-late-study', 'p2-09-cafe-tablet', 'p2-10-rainy-crosswalk', 'p2-34-journaling', 'p2-38-seaside-camping', 'p2-11-city-photography', 'p2-22-seaside-cycling', 'p2-18-bakery-window', 'p2-23-making-bed', 'p2-30-meditation', 'p2-39-folding-laundry', 'p2-40-guitar', 'p2-49-library-reading'],
  'protagonist-3': ['p3-42-harbor-fishing', 'p3-22-pour-over-coffee', 'p3-25-library-study', 'p3-12-cafe-coffee-tray', 'p3-26-train-station', 'p3-17-street-photography', 'p3-30-woodland-camping', 'p3-11-riverside-cycling', 'p3-14-dog-walk', 'p3-18-bookstore-browse', 'p3-20-repot-houseplant', 'p3-15-cook-pasta', 'p3-35-painting-canvas', 'p3-41-fold-laundry', 'p3-49-rooftop-guitar'],
  'protagonist-5': ['p5-01-platform', 'p5-05-bakery', 'p5-34-bookshop', 'p5-34-bookshop', 'p5-08-bus-stop', 'p5-06-record-shop', 'p5-16-ferry-deck', 'p5-23-table-tennis', 'p5-10-swimming-pool', 'p5-04-museum', 'p5-03-laundromat', 'p5-40-home-kitchen', 'p5-02-pottery', 'p5-34-bookshop', 'p5-100-city-ferry-deck'],
  'protagonist-6': ['p6-01-rush-hour-commute', 'p6-02-office-presentation', 'p6-03-spilled-coffee-report', 'p6-04-lunch-rooftop', 'p6-05-proud-promotion', 'p6-06-angry-email', 'p6-07-after-work-run', 'p6-08-missed-deadline', 'p6-21-couch-after-work', 'p6-22-window-tea', 'p6-23-laundry-day', 'p6-24-home-cooking', 'p6-25-lazy-morning', 'p6-27-houseplant-care', 'p6-28-movie-night'],
};

export function getMockProtagonist(index: number) {
  return MOCK_PROTAGONISTS[index % MOCK_PROTAGONISTS.length]!;
}

export function getMockProtagonistName(index: number, locale: AppLocale) {
  return getMockProtagonist(index).names[locale];
}

export function getMockSceneImages(characterId: string): readonly ComicSceneId[] {
  return sceneImages[characterId] ?? sceneImages['protagonist-1']!;
}
