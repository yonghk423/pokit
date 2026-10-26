import { beginComicScenePick, completeTutorialMateClose, completeTutorialSceneClose, initialServiceProgress, tutorialRoutineVisible, tutorialDiaryId, loadServiceTutorial, completeTutorialMateCreation, useServiceTutorial, tutorialStepProgress, tutorialSteps } from './serviceTutorial';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
jest.mock('@shared/lib/storage/localStorageClient', () => {
  const values = new Map<string, unknown>();
  return { localStorageClient: { getJson: (key: string) => values.get(key), setJson: (key: string, value: unknown) => values.set(key, value) } };
});
const store = () => useServiceTutorial.getState();
beforeEach(() => {
  useServiceTutorial.setState(initialServiceProgress);
  localStorageClient.setJson('pokit:service-tutorial-v2', initialServiceProgress);
});
it('starts with the hero and introduces Mate through its tray tool without a chooser', () => {
  store().start('comic');
  expect(store().step).toBe('comicStart');
  store().advance('comicStart', 'comicSuccess', { diaryKey: 'diary', sceneKey: 'scene' });
  store().nextMode();
  expect(store().step).toBe('comicWeather');
  expect(store().mode).toBe('comic');
  expect(store().active).toBe(true);
  store().advance('comicWeather', 'comicTools');
  store().advance('comicTools', 'rhythmAdd', { mode: 'rhythm' });
  expect(store().diaryKey).toBe('diary');
  store().advance('rhythmAdd', 'rhythmSuccess');
  store().nextMode();
  expect(store().step).toBe('finish');
  expect(store().active).toBe(false);
});
it('defaults a new run to the hero', () => {
  store().start();
  expect(store().mode).toBe('comic');
  expect(store().step).toBe('comicStart');
});
it('resumes at the tray tool after pausing between scene and Mate', () => {
  store().start('comic');
  store().advance('comicStart', 'comicSuccess', { diaryKey: 'diary' });
  store().nextMode();
  store().pause();
  store().resume();
  expect(store().active).toBe(true);
  expect(store().step).toBe('comicWeather');
});
it('requires creating, opening and closing the mate, without writing or checking a task', () => {
  store().start('rhythm');
  completeTutorialMateCreation('new-card');
  expect(store().step).toBe('rhythmAdd');
  store().advance('rhythmAdd', 'rhythmPicker');
  store().advance('rhythmPicker', 'rhythmForm');
  completeTutorialMateCreation('new-card');
  expect(store().step).toBe('rhythmOpen');
  completeTutorialMateClose('new-card');
  expect(store().step).toBe('rhythmOpen');
  store().advance('rhythmOpen', 'rhythmRecord');
  completeTutorialMateClose('unrelated');
  expect(store().step).toBe('rhythmRecord');
  completeTutorialMateClose('new-card::instance:today');
  expect(store().step).toBe('rhythmSuccess');
  expect(store().routineKey).toBe('new-card');
  expect(store().taskKey).toBeNull();
  store().nextMode(); expect(store().step).toBe('finish');
});
it('ignores unrelated actions and paused UI events', () => {
  store().start('comic'); store().advance('rhythmOpen', 'rhythmRecord');
  expect(store().step).toBe('comicStart');
  store().pause(); store().advance('comicStart', 'comicPick');
  expect(store().step).toBe('comicStart'); expect(store().active).toBe(false);
  store().resume();
  expect(store().active).toBe(true); expect(store().step).toBe('comicStart');
});
it('resumes the saved real record IDs after pausing', () => {
  store().start('rhythm'); store().advance('rhythmAdd', 'rhythmOpen', { routineKey: 'saved-card' });
  store().pause(); useServiceTutorial.setState(initialServiceProgress); store().start();
  expect(store().step).toBe('rhythmOpen'); expect(store().routineKey).toBe('saved-card'); expect(store().active).toBe(true);
  expect(loadServiceTutorial().routineKey).toBe('saved-card');
});

it('starts every fresh tutorial empty even when the person already has records', () => {
  store().start('rhythm'); store().advance('rhythmAdd', 'rhythmSuccess', { routineKey: 'old-tutorial', sceneKey: 'old-scene', diaryKey: 'old-diary' });
  store().start('rhythm');
  expect(store().routineKey).toBeNull(); expect(store().sceneKey).toBeNull(); expect(store().diaryKey).toBeNull();
  const personal = [{ key: 'personal-1' }, { key: 'personal-2' }];
  expect(personal.filter(item => tutorialRoutineVisible(item.key, store()))).toEqual([]);
  expect(personal).toHaveLength(2);
  store().advance('rhythmAdd', 'rhythmOpen', { routineKey: 'new-card' });
  expect(tutorialRoutineVisible('new-card', store())).toBe(true);
  expect(tutorialRoutineVisible('personal-1', store())).toBe(false);
  store().pause(); expect(tutorialRoutineVisible('personal-1', store())).toBe(true);
});
it('does not use the previously selected diary or picture for a new comic tutorial', () => {
  const library = { activeId: 'personal-diary', diaries: [{ id: 'personal-diary', scenes: [{ id: 'personal-scene' }] }, { id: 'created-diary', scenes: [] }] };
  store().start('comic'); expect(tutorialDiaryId(library, store())).toBeNull();
  store().advance('comicStart', 'comicPick', { diaryKey: 'created-diary' });
  expect(tutorialDiaryId(library, store())).toBe('created-diary');
  expect(library.diaries[0].scenes).toEqual([{ id: 'personal-scene' }]);
  store().pause(); expect(tutorialDiaryId(library, store())).toBe('personal-diary');
});

it('beginComicScenePick jumps from any chooser step onto comicPick with the new diary', () => {
  store().start('comic');
  store().advance('comicStart', 'comicReady');
  beginComicScenePick('fresh-diary');
  expect(store()).toMatchObject({ active: true, step: 'comicPick', diaryKey: 'fresh-diary', sceneKey: null });
});

it('migrates the old second-tutorial selection to the hero tray', () => {
  localStorageClient.setJson('pokit:service-tutorial-v2', { ...initialServiceProgress, completed: ['comic'], mode: 'rhythm', step: 'rhythmAdd', diaryKey: 'diary' });
  expect(loadServiceTutorial()).toMatchObject({ mode: 'comic', step: 'comicTools', diaryKey: 'diary' });
});

it('completes the comic tutorial by closing the scene detail without requiring memo or tasks', () => {
  store().start('comic');
  store().advance('comicStart', 'comicOpen', { sceneKey: 'first-scene' });
  store().advance('comicOpen', 'comicMemo');
  completeTutorialSceneClose('another-scene');
  expect(store().step).toBe('comicMemo');
  completeTutorialSceneClose('first-scene');
  expect(store().step).toBe('comicSuccess');
  expect(store().taskKey).toBeNull();
});
it.each(['comicMemo', 'comicTask', 'comicCheck'] as const)('asks to reopen after resuming from %s instead of waiting for a drawer that is closed', step => {
  store().start('comic');
  store().advance('comicStart', step, { sceneKey: 'already-opened' });
  expect(loadServiceTutorial().step).toBe('comicOpen');
  store().pause();
  store().start();
  expect(store().step).toBe('comicOpen');
  completeTutorialSceneClose('already-opened');
  expect(store().step).toBe('comicOpen');
});

it('continues from the tool introduction when its instruction is skipped', () => {
  store().start('comic');
  store().advance('comicStart', 'comicSuccess');
  store().nextMode();
  expect(store().step).toBe('comicWeather');
  store().skipStep();
  expect(store().step).toBe('comicTools');
  store().skipStep();
  expect(store()).toMatchObject({ active: true, mode: 'rhythm', step: 'rhythmAdd' });
});

it('continues from weather details to the mate tool tutorial after the modal is closed', () => {
  store().start('comic');
  store().advance('comicStart', 'comicSuccess');
  store().nextMode();
  store().advance('comicWeather', 'comicTools');
  expect(store()).toMatchObject({ active: true, mode: 'comic', step: 'comicTools' });
});
it('asks to reopen a mate after resuming instead of waiting for a drawer that is no longer open', () => {
  store().start('rhythm');
  store().advance('rhythmAdd', 'rhythmRecord', { routineKey: 'mate' });
  store().pause();
  store().start();
  expect(store().step).toBe('rhythmOpen');
  completeTutorialMateClose('mate');
  expect(store().step).toBe('rhythmOpen');
});


it.each(['rhythm', 'comic'] as const)('advances each actual action independently in %s', mode => {
  store().start(mode);
  const steps = tutorialSteps[mode];
  steps.forEach((step, index) => {
    expect(store().step).toBe(step);
    expect(tutorialStepProgress(mode, step)).toEqual({ current: index + 1 + (mode === 'rhythm' ? tutorialSteps.comic.length + 2 : 0), total: tutorialSteps.comic.length + 2 + tutorialSteps.rhythm.length });
    expect(store().active).toBe(true);
    expect(store().completed).toEqual([]);
    store().skipStep();
  });
  expect(store().step).toBe(mode === 'rhythm' ? 'rhythmSuccess' : 'comicSuccess');
});
it('preserves the next step when the previous creation sheet closes', () => {
  store().start('rhythm');
  store().advance('rhythmAdd', 'rhythmPicker');
  store().skipStep();
  store().advance('rhythmPicker', 'rhythmAdd');
  expect(store().step).toBe('rhythmForm');
  store().skipStep();
  expect(store().step).toBe('rhythmTemplate');
  store().skipStep();
  completeTutorialMateCreation('prepared-mate');
  expect(store().step).toBe('rhythmOpen');
  expect(store().routineKey).toBe('prepared-mate');
  store().skipStep();
  completeTutorialMateClose('prepared-mate');
  expect(store().step).toBe('rhythmSuccess');
});
it('persists the newly separated actions for resume', () => {
  store().start('comic');
  store().advance('comicStart', 'comicName');
  expect(loadServiceTutorial().step).toBe('comicName');
});

it.each([
  { step: 'finish', completed: ['comic'] },
  { step: 'comicOpen', completed: ['comic', 'rhythm'] },
])('does not restore highlights for a completed tutorial: %s', progress => {
  localStorageClient.setJson('pokit:service-tutorial-v2', { ...initialServiceProgress, ...progress, active: true });
  expect(loadServiceTutorial()).toMatchObject({ active: false, step: 'finish' });
  store().resume();
  expect(store().active).toBe(false);
});
