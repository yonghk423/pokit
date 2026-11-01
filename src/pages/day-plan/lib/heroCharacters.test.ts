import { COMIC_CHARACTERS, SELECTABLE_COMIC_CHARACTERS, SELECTABLE_COMIC_SCENES } from './heroCharacters';
import { COMIC_SCENES, canonicalComicSceneId } from './heroSceneImages';

it.each(['protagonist-3', 'protagonist-4'])('offers the forty consistent painted scenes for %s', id => {
  const character = SELECTABLE_COMIC_CHARACTERS.find(character => character.id === id)!;
  expect(character.scenes).toHaveLength(40);
  expect(character.scenes.every(scene => Number(scene.id.split('-')[1]) >= 11)).toBe(true);
  expect(character.preview.every(preview => character.scenes.some(scene => scene.id === preview.id))).toBe(true);
  expect(character.scenes.some(scene => scene.source === character.cover)).toBe(true);
});

it('remaps retired painted-style IDs so existing diaries keep a resolvable scene', () => {
  const remaps: Record<string, string> = {
    'p3-01-street-map': 'p3-26-train-station',
    'p3-02-moving-plant': 'p3-20-repot-houseplant',
    'p3-03-washing-dishes': 'p3-41-fold-laundry',
    'p3-04-art-gallery': 'p3-35-painting-canvas',
    'p3-05-table-tennis': 'p3-36-badminton',
    'p3-06-dawn-fishing': 'p3-42-harbor-fishing',
    'p3-07-feeding-cat': 'p3-14-dog-walk',
    'p3-08-piano-practice': 'p3-49-rooftop-guitar',
    'p3-09-library-books': 'p3-25-library-study',
    'p3-10-night-food-stall': 'p3-46-cook-ramen',
    'p4-01-library-books': 'p4-40-return-library-books',
    'p4-02-making-tea': 'p4-50-sunset-tea',
    'p4-03-picnic-blanket': 'p4-42-park-picnic-friend',
    'p4-04-choosing-scarf': 'p4-15-flower-market',
    'p4-05-painting-flowerpot': 'p4-14-park-watercolor',
    'p4-06-hillside-walk': 'p4-32-autumn-bridge-walk',
    'p4-07-returning-book': 'p4-40-return-library-books',
    'p4-08-herb-garden': 'p4-41-harvest-herbs',
    'p4-09-station-wait': 'p4-19-station-wait',
    'p4-10-carrying-child': 'p4-48-wrap-gift',
  };
  expect(Object.keys(remaps)).toHaveLength(20);
  for (const [from, to] of Object.entries(remaps)) {
    expect(canonicalComicSceneId(from)).toBe(to);
    expect(COMIC_SCENES.some(scene => scene.id === from)).toBe(false);
    expect(SELECTABLE_COMIC_SCENES.some(scene => scene.id === to)).toBe(true);
  }
});

it('preserves the other character collections', () => {
  for (const id of ['protagonist-1', 'protagonist-2', 'protagonist-5']) {
    const character = COMIC_CHARACTERS.find(character => character.id === id)!;
    const expected = COMIC_SCENES.filter(scene => id === 'protagonist-1' ? !/^p[23456]-/.test(scene.id) : scene.id.startsWith(id === 'protagonist-2' ? 'p2-' : 'p5-'));
    expect(character.scenes).toEqual(expected);
  }
});

it('keeps protagonist-1 at the 100-scene cap and remaps trimmed late ids', () => {
  const first = COMIC_CHARACTERS.find(character => character.id === 'protagonist-1')!;
  expect(first.scenes).toHaveLength(100);
  expect(first.scenes.every(scene => Number(scene.id.split('-')[0]) <= 100)).toBe(true);
  expect(canonicalComicSceneId('157-starbucks-cafe')).toBe('57-blue-bottle-cafe');
  expect(canonicalComicSceneId('101-hairbrush-singing')).toBe('25-skincare');
});
