import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';
import { objectParticle, readRoutineTabLabels, subscribeRoutineTabLabels, writeRoutineTabLabels } from './routineTabLabels';

afterEach(() => localStorageClient.removeItem(StorageKeys.routineTabLabels));

it('uses 을 after a batchim and 를 after an open syllable', () => {
  expect(objectParticle('준비물')).toBe('을');
  expect(objectParticle('도우미')).toBe('를');
  expect(objectParticle('Kit')).toBe('');
});

it('notifies readers when a tab nickname is saved or cleared', () => {
  const seen: Array<string | undefined> = [];
  const stop = subscribeRoutineTabLabels(() => seen.push(readRoutineTabLabels().catalog));
  writeRoutineTabLabels({ catalog: '  도우미  ' });
  writeRoutineTabLabels({});
  stop();
  expect(seen).toEqual(['도우미', undefined]);
  expect(readRoutineTabLabels()).toEqual({});
});
