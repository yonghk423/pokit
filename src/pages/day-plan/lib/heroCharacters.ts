import { COMIC_SCENE_THUMBNAILS } from './heroSceneThumbnails';
import { COMIC_SCENES } from './heroSceneImages';
export const DEFAULT_COMIC_CHARACTER_ID = 'protagonist-1';
const FIRST_CHARACTER_SCENES = COMIC_SCENES.filter(scene => !/^p[23456]-/.test(scene.id));
const SECOND_CHARACTER_SCENES = COMIC_SCENES.filter(scene => scene.id.startsWith('p2-'));
// The first ten exports in these collections use a different, photographic
// rendering style. Retain their IDs for saved diaries, but never offer them anew.
const RETIRED_PAINTED_STYLE_SCENES = /^p[34]-(?:0[1-9]|10)-/;
export const SELECTABLE_COMIC_SCENES = COMIC_SCENES.filter(scene => !RETIRED_PAINTED_STYLE_SCENES.test(scene.id));
const THIRD_CHARACTER_SCENES = COMIC_SCENES.filter(scene => scene.id.startsWith('p3-') && !RETIRED_PAINTED_STYLE_SCENES.test(scene.id));
const FOURTH_CHARACTER_SCENES = COMIC_SCENES.filter(scene => scene.id.startsWith('p4-') && !RETIRED_PAINTED_STYLE_SCENES.test(scene.id));
const FIFTH_CHARACTER_SCENES = COMIC_SCENES.filter(scene => scene.id.startsWith('p5-'));
const SIXTH_CHARACTER_SCENES = COMIC_SCENES.filter(scene => scene.id.startsWith('p6-'));
/** Each character owns its image collection. */
export const COMIC_CHARACTERS = [{
  id: DEFAULT_COMIC_CHARACTER_ID,
  name: 'comicDay.character.one',
  description: 'comicDay.character.description',
  cover: COMIC_SCENE_THUMBNAILS['46-camping'],
  preview: ['05-work', '10-park-walk', '06-reading'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: FIRST_CHARACTER_SCENES,
}, {
  id: 'protagonist-2',
  name: 'comicDay.character.two',
  description: 'comicDay.character.descriptionTwo',
  cover: COMIC_SCENE_THUMBNAILS['p2-01-fly-kite'],
  preview: ['p2-04-birthday-surprise', 'p2-10-rainy-crosswalk', 'p2-27-piano-practice'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: SECOND_CHARACTER_SCENES,
}, {
  id: 'protagonist-3',
  name: 'comicDay.character.three',
  description: 'comicDay.character.descriptionThree',
  cover: COMIC_SCENE_THUMBNAILS['p3-14-dog-walk'],
  preview: ['p3-14-dog-walk', 'p3-37-laundromat', 'p3-48-help-neighbor'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: THIRD_CHARACTER_SCENES,
}, {
  id: 'protagonist-4',
  name: 'comicDay.character.four',
  description: 'comicDay.character.descriptionFour',
  cover: COMIC_SCENE_THUMBNAILS['p4-19-station-wait'],
  preview: ['p4-19-station-wait', 'p4-38-harbor-view', 'p4-40-return-library-books'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: FOURTH_CHARACTER_SCENES,
}, {
  id: 'protagonist-5',
  name: 'comicDay.character.five',
  description: 'comicDay.character.descriptionFive',
  cover: COMIC_SCENE_THUMBNAILS['p5-01-platform'],
  preview: ['p5-51-beach-bikini', 'p5-68-mri-control-room', 'p5-100-city-ferry-deck'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: FIFTH_CHARACTER_SCENES,
}, {
  id: 'protagonist-6',
  name: 'comicDay.character.six',
  description: 'comicDay.character.descriptionSix',
  cover: COMIC_SCENE_THUMBNAILS['p6-01-rush-hour-commute'],
  preview: ['p6-06-angry-email', 'p6-18-jump-rope', 'p6-32-sad-bus-stop'].map(id => COMIC_SCENES.find(scene => scene.id === id)!),
  scenes: SIXTH_CHARACTER_SCENES,
}] as const;
export type ComicCharacter = typeof COMIC_CHARACTERS[number];
/** Available protagonists for new diaries. */
export const SELECTABLE_COMIC_CHARACTERS = COMIC_CHARACTERS;
