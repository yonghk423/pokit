import {
  DEFAULT_SPINE_GAP_BLOCK_MINUTES,
  normalizeSpineDefaultBlockMinutes,
  SPINE_GAP_BLOCK_MINUTE_OPTIONS,
  type SpineGapBlockMinuteOption,
} from '../spineDefaultBlockMinutes';

import { localStorageClient } from './localStorageClient';
import { StorageKeys } from './storageKeys';

type SettingsSpineShape = {
  spineDefaultBlockMinutes?: number;
};

function readSpineSettings(): SettingsSpineShape {
  const root = localStorageClient.getJson<SettingsSpineShape>(StorageKeys.settings) ?? {};
  return root && typeof root === 'object' ? root : {};
}

export function loadSpineDefaultBlockMinutes(): number {
  return normalizeSpineDefaultBlockMinutes(readSpineSettings().spineDefaultBlockMinutes);
}

export function saveSpineDefaultBlockMinutes(minutes: number): number {
  const normalized = normalizeSpineDefaultBlockMinutes(minutes);
  const root = localStorageClient.getJson<Record<string, unknown>>(StorageKeys.settings) ?? {};
  localStorageClient.setJson(StorageKeys.settings, {
    ...root,
    spineDefaultBlockMinutes: normalized,
  });
  return normalized;
}

export {
  DEFAULT_SPINE_GAP_BLOCK_MINUTES,
  SPINE_GAP_BLOCK_MINUTE_OPTIONS,
  type SpineGapBlockMinuteOption,
};
