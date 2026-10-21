import { COMIC_SCENE_THUMBNAILS } from './comicSceneThumbnails';
import { COMIC_SCENES } from './comicSceneImages';
export const DEFAULT_COMIC_CHARACTER_ID = 'protagonist-1';
/** Each character owns its image collection; add future characters here. */
export const COMIC_CHARACTERS = [{
  id: DEFAULT_COMIC_CHARACTER_ID,
  name: 'comicDay.character.one',
  description: 'comicDay.character.description',
  cover: COMIC_SCENE_THUMBNAILS.focus.large,
  preview: [COMIC_SCENES[2], COMIC_SCENES[3], COMIC_SCENES[4]],
  scenes: COMIC_SCENES,
}] as const;
export type ComicCharacter = typeof COMIC_CHARACTERS[number];
