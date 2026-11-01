import { initialServiceProgress, loadServiceTutorial, resetServiceTutorialSession, tutorialDiaryId, tutorialRoutineVisible, useServiceTutorial } from './serviceTutorial';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

beforeEach(() => resetServiceTutorialSession());
it('ignores a saved active run and cannot restart or resume the retired tutorial', () => {
  localStorageClient.setJson('pokit:service-tutorial-v2', { ...initialServiceProgress, active: true, step: 'comicCharacter', dismissed: false, runId: 'old-run' });
  expect(loadServiceTutorial()).toMatchObject({ active: false, step: 'finish', dismissed: true });
  const store = useServiceTutorial.getState();
  store.start(); store.resume(); store.advance('finish', 'comicStart'); store.skipStep(); store.nextMode();
  expect(useServiceTutorial.getState()).toMatchObject({ active: false, step: 'finish', runId: null });
});
it('keeps personal diary selection and routine visibility independent of old guide progress', () => {
  const legacy = { ...initialServiceProgress, active: true, mode: 'comic' as const, diaryKey: 'old-diary' };
  expect(tutorialDiaryId({ activeId: 'personal-diary', diaries: [] }, legacy)).toBe('personal-diary');
  expect(tutorialRoutineVisible('personal-card', { ...legacy, mode: 'rhythm', routineKey: 'old-card' })).toBe(true);
});
