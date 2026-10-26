import { COMIC_SCENE_THUMBNAILS } from './heroSceneThumbnails';
import { COMIC_SCENES } from './heroSceneImages';
const PUPPY_SCENES = COMIC_SCENES.filter(scene => scene.id.startsWith('puppy-'));
export const DEFAULT_COMIC_CHARACTER_ID = 'protagonist-1';
/** Each character owns its image collection; add future characters here. */
export const COMIC_CHARACTERS = [{
  id: DEFAULT_COMIC_CHARACTER_ID,
  name: 'comicDay.character.one',
  description: 'comicDay.character.description',
  cover: COMIC_SCENE_THUMBNAILS['46-camping'],
  preview: [COMIC_SCENES[2], COMIC_SCENES[3], COMIC_SCENES[4]],
  scenes: COMIC_SCENES.filter(scene => !scene.id.startsWith('puppy-')),
}, {
  id: 'puppy-companion',
  name: 'comicDay.character.puppy',
  description: 'comicDay.character.puppyDescription',
  cover: COMIC_SCENE_THUMBNAILS['puppy-ball-play'],
  preview: [PUPPY_SCENES[1], PUPPY_SCENES[2], PUPPY_SCENES[9]],
  scenes: PUPPY_SCENES,
}] as const;
export type ComicCharacter = typeof COMIC_CHARACTERS[number];
