import { COMIC_SCENE_THUMBNAILS } from './heroSceneThumbnails';
import { COMIC_SCENES } from './heroSceneImages';
export const DEFAULT_COMIC_CHARACTER_ID = 'protagonist-1';
const FIRST_CHARACTER_SCENES: (typeof COMIC_SCENES)[number][] = COMIC_SCENES.filter(scene => scene.id === '05-work');
const SECOND_CHARACTER_SCENES: (typeof COMIC_SCENES)[number][] = COMIC_SCENES.filter(scene => scene.id === 'p2-04-birthday-surprise');
export const SELECTABLE_COMIC_SCENES = COMIC_SCENES.filter(scene => ["05-work", "p2-04-birthday-surprise", "p3-14-dog-walk", "p5-51-beach-bikini", "p6-01-rush-hour-commute"].includes(scene.id));
const THIRD_CHARACTER_SCENES: (typeof COMIC_SCENES)[number][] = COMIC_SCENES.filter(scene => scene.id === 'p3-14-dog-walk');
const FIFTH_CHARACTER_SCENES: (typeof COMIC_SCENES)[number][] = COMIC_SCENES.filter(scene => scene.id === 'p5-51-beach-bikini');
const SIXTH_CHARACTER_SCENES: (typeof COMIC_SCENES)[number][] = COMIC_SCENES.filter(scene => scene.id === 'p6-01-rush-hour-commute');
/** Each character owns its image collection. */
export const COMIC_CHARACTERS = [{
  id: DEFAULT_COMIC_CHARACTER_ID,
  name: 'comicDay.character.one',
  description: 'comicDay.character.description',
  cover: COMIC_SCENE_THUMBNAILS['05-work'],
  preview: ['05-work'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: FIRST_CHARACTER_SCENES,
}, {
  id: 'protagonist-2',
  name: 'comicDay.character.two',
  description: 'comicDay.character.descriptionTwo',
  cover: COMIC_SCENE_THUMBNAILS['p2-04-birthday-surprise'],
  preview: ['p2-04-birthday-surprise'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: SECOND_CHARACTER_SCENES,
}, {
  id: 'protagonist-3',
  name: 'comicDay.character.three',
  description: 'comicDay.character.descriptionThree',
  cover: COMIC_SCENE_THUMBNAILS['p3-14-dog-walk'],
  preview: ['p3-14-dog-walk'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: THIRD_CHARACTER_SCENES,
}, {
  id: 'protagonist-5',
  name: 'comicDay.character.five',
  description: 'comicDay.character.descriptionFive',
  cover: COMIC_SCENE_THUMBNAILS['p5-51-beach-bikini'],
  preview: ['p5-51-beach-bikini'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: FIFTH_CHARACTER_SCENES,
}, {
  id: 'protagonist-6',
  name: 'comicDay.character.six',
  description: 'comicDay.character.descriptionSix',
  cover: COMIC_SCENE_THUMBNAILS['p6-01-rush-hour-commute'],
  preview: ['p6-01-rush-hour-commute'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: SIXTH_CHARACTER_SCENES,
}] as const;
export type ComicCharacter = typeof COMIC_CHARACTERS[number];
/** Available protagonists for new diaries. */
export const SELECTABLE_COMIC_CHARACTERS: readonly ComicCharacter[] = COMIC_CHARACTERS;
