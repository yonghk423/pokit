import { flushLocalStorageClientWrites, localStorageClient } from '../localStorageClient';

import { DEV_MOCK_SEED_MODULES } from './registry';
import type { DevMockSeedResult } from './types';

const DEV_MOCK_SEED_BUNDLE_VERSION_KEY = 'pokit:dev-mock-seed-bundle-version';

/** 등록된 모듈 id@version 조합 */
export function getDevMockSeedBundleVersion(): string {
  return DEV_MOCK_SEED_MODULES.map((module) => `${module.id}@${module.version}`).join('+');
}

export async function runDevMockSeed(): Promise<DevMockSeedResult> {
  const merged: DevMockSeedResult = {};
  for (const module of DEV_MOCK_SEED_MODULES) {
    const partial = await module.seed();
    Object.assign(merged, partial);
  }

  localStorageClient.setItemRaw(DEV_MOCK_SEED_BUNDLE_VERSION_KEY, getDevMockSeedBundleVersion());
  await flushLocalStorageClientWrites();
  return merged;
}

export async function runDevMockClear(): Promise<void> {
  for (const module of [...DEV_MOCK_SEED_MODULES].reverse()) {
    await module.clear();
  }
  localStorageClient.removeItem(DEV_MOCK_SEED_BUNDLE_VERSION_KEY);
  await flushLocalStorageClientWrites();
}
