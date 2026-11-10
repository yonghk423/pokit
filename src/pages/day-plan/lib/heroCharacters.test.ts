import { COMIC_CHARACTERS, SELECTABLE_COMIC_CHARACTERS, SELECTABLE_COMIC_SCENES } from './heroCharacters';
import { COMIC_SCENES, canonicalComicSceneId } from './heroSceneImages';

it('offers one representative per character without removing saved scene IDs', () => {
  expect(SELECTABLE_COMIC_CHARACTERS).toHaveLength(5);
  expect(SELECTABLE_COMIC_SCENES).toHaveLength(5);
  for (const character of COMIC_CHARACTERS) {
    expect(character.scenes).toHaveLength(1);
    expect(character.preview).toEqual(character.scenes);
    expect(character.cover).toBe(character.scenes[0].source);
    expect(SELECTABLE_COMIC_SCENES).toContain(character.scenes[0]);
  }
  expect(COMIC_CHARACTERS.map(character => character.id)).not.toContain('protagonist-4');
});

it('resolves historical images to the matching character representative', () => {
  for (const [old, representative] of [
    ['01-exercise', '05-work'], ['p2-01-fly-kite', 'p2-04-birthday-surprise'],
    ['p3-25-library-study', 'p3-14-dog-walk'], ['p5-10-swimming-pool', 'p5-51-beach-bikini'],
    ['p6-18-jump-rope', 'p6-01-rush-hour-commute'],
  ]) {
    const id = canonicalComicSceneId(old);
    expect(id).not.toBeNull();
    expect(COMIC_SCENES.find(scene => scene.id === id)?.source).toBe(COMIC_SCENES.find(scene => scene.id === representative)?.source);
  }
  expect(canonicalComicSceneId('p3-01-street-map')).toBe('p3-26-train-station');
});
