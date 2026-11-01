import { COMIC_CHARACTERS, SELECTABLE_COMIC_CHARACTERS, SELECTABLE_COMIC_SCENES } from './heroCharacters';
import { COMIC_SCENES, canonicalComicSceneId } from './heroSceneImages';

it.each(['protagonist-3', 'protagonist-4'])('offers only the forty consistent painted scenes for %s', id => {
  const character = SELECTABLE_COMIC_CHARACTERS.find(character => character.id === id)!;
  expect(character.scenes).toHaveLength(40);
  expect(character.scenes.every(scene => Number(scene.id.split('-')[1]) >= 11)).toBe(true);
  expect(character.preview.every(preview => character.scenes.some(scene => scene.id === preview.id))).toBe(true);
  expect(character.scenes.some(scene => scene.source === character.cover)).toBe(true);
});

it('keeps all twenty retired IDs resolvable for existing diaries without offering them for selection', () => {
  const retired = COMIC_SCENES.filter(scene => /^p[34]-(?:0[1-9]|10)-/.test(scene.id));
  expect(retired).toHaveLength(20);
  for (const scene of retired) {
    expect(canonicalComicSceneId(scene.id)).toBe(scene.id);
    expect(COMIC_CHARACTERS.some(character => character.scenes.some(offered => offered.id === scene.id))).toBe(false);
    expect(SELECTABLE_COMIC_SCENES.some(offered => offered.id === scene.id)).toBe(false);
  }
});

it('preserves the other character collections', () => {
  for (const id of ['protagonist-1', 'protagonist-2', 'protagonist-5']) {
    const character = COMIC_CHARACTERS.find(character => character.id === id)!;
    const expected = COMIC_SCENES.filter(scene => id === 'protagonist-1' ? !/^p[2345]-/.test(scene.id) : scene.id.startsWith(id === 'protagonist-2' ? 'p2-' : 'p5-'));
    expect(character.scenes).toEqual(expected);
  }
});
