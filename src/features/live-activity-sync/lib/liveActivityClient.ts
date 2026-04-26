import { NativeModules, Platform } from 'react-native';

import type { LockFlowLiveActivityPayload } from '../model/types';

type LiveActivityNativeModule = {
  upsertActivity?: (payloadJson: string) => Promise<void> | void;
  endActivity?: () => Promise<void> | void;
  endActivityByBlockId?: (blockId: string) => Promise<void> | void;
  upsertAndSuspend?: (payloadJson: string) => Promise<void> | void;
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

/**
 * Live Activity를 upsert하고, 완료 후 앱을 백그라운드(잠금화면)로 보낸다.
 * Swift에서 upsert → suspend를 원자적으로 실행하므로 upsert 누락이 없다.
 */
export async function upsertLiveActivityAndDismiss(
  payload: LockFlowLiveActivityPayload,
): Promise<boolean> {
  const module = getNativeModule();
  if (!module?.upsertAndSuspend) return false;
  if (!(await checkAvailable(module))) return false;

  await module.upsertAndSuspend(JSON.stringify(payload));
  return true;
}

export async function endLockFlowLiveActivity(blockId?: string): Promise<boolean> {
  const module = getNativeModule();
  if (!module) return false;
  if (!(await checkAvailable(module))) return false;

  const target = typeof blockId === 'string' ? blockId.trim() : '';
  if (target.length > 0 && module.endActivityByBlockId) {
    await module.endActivityByBlockId(target);
    return true;
  }
  if (!module.endActivity) return false;
  await module.endActivity();
  return true;
}
