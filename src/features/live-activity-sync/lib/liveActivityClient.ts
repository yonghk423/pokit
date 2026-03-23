import { NativeModules, Platform } from 'react-native';

import type { LockFlowLiveActivityPayload } from '../model/types';

type LiveActivityNativeModule = {
  upsertActivity?: (payloadJson: string) => Promise<void> | void;
  endActivity?: () => Promise<void> | void;
  isAvailable?: () => Promise<boolean> | boolean;
};

const MODULE_NAME = 'LockFlowLiveActivity';

let hasWarnedMissingModule = false;

function getNativeModule(): LiveActivityNativeModule | null {
  if (Platform.OS !== 'ios') return null;

  const candidate = (NativeModules as Record<string, unknown>)[MODULE_NAME];
  if (!candidate || typeof candidate !== 'object') {
    if (__DEV__ && !hasWarnedMissingModule) {
      hasWarnedMissingModule = true;
      console.info(
        `[LiveActivity] Native module "${MODULE_NAME}" is not installed yet. Falling back to no-op sync.`,
      );
    }
    return null;
  }

  return candidate as LiveActivityNativeModule;
}

async function checkAvailable(module: LiveActivityNativeModule): Promise<boolean> {
  if (!module.isAvailable) return true;
  try {
    return Boolean(await module.isAvailable());
  } catch {
    return false;
  }
}

export async function upsertLockFlowLiveActivity(
  payload: LockFlowLiveActivityPayload,
): Promise<boolean> {
  const module = getNativeModule();
  if (!module?.upsertActivity) return false;
  if (!(await checkAvailable(module))) return false;

  await module.upsertActivity(JSON.stringify(payload));
  return true;
}

export async function endLockFlowLiveActivity(): Promise<boolean> {
  const module = getNativeModule();
  if (!module?.endActivity) return false;
  if (!(await checkAvailable(module))) return false;

  await module.endActivity();
  return true;
}
