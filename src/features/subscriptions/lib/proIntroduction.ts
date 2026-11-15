import { localStorageClient } from '@shared/lib/storage/localStorageClient';

const key = 'pokit:pro-introduction-seen';

/** Shared across features and app launches; viewing an introduction is not a paid entitlement. */
export function hasSeenProIntroduction(): boolean {
  return localStorageClient.getJson<boolean>(key) === true
    || !!localStorageClient.getJson<string>('pokit:pro-promotion-introduction');
}

export function markProIntroductionSeen(): void {
  localStorageClient.setJson(key, true);
}
