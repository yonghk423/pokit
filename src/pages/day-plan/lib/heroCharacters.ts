import { COMIC_SCENE_THUMBNAILS } from './heroSceneThumbnails';
import { COMIC_SCENES } from './heroSceneImages';
export const DEFAULT_COMIC_CHARACTER_ID = 'protagonist-1';
/** Each character owns its image collection; add future characters here. */
export const COMIC_CHARACTERS = [{
  id: DEFAULT_COMIC_CHARACTER_ID,
  name: 'comicDay.character.one',
  description: 'comicDay.character.description',
  cover: COMIC_SCENE_THUMBNAILS['46-camping'],
  preview: ['05-work', '10-park-walk', '06-reading'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: COMIC_SCENES,
}] as const;
export type ComicCharacter = typeof COMIC_CHARACTERS[number];

/** Available protagonists for new diaries. */
export const SELECTABLE_COMIC_CHARACTERS = [COMIC_CHARACTERS[0]] as const;
