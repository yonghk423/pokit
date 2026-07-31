import { flushLocalStorageClientWrites, localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type PersistedWelcomeIntro = {
  seen: boolean;
};

export function loadWelcomeIntroSeen(): boolean {
  const v = localStorageClient.getJson<PersistedWelcomeIntro>(StorageKeys.welcomeIntro);
  return v?.seen === true;
}

export function markWelcomeIntroSeen(): void {
  localStorageClient.setJson<PersistedWelcomeIntro>(StorageKeys.welcomeIntro, { seen: true });
}

export async function markWelcomeIntroSeenAndFlush(): Promise<void> {
  markWelcomeIntroSeen();
  await flushLocalStorageClientWrites();
}
