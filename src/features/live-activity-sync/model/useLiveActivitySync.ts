import { useEffect } from 'react';

import { upsertLockFlowLiveActivity } from '../lib/liveActivityClient';
import type { LockFlowLiveActivityPayload } from './types';

/**
 * React 18 Strict Mode(dev)에서 effect가 두 번 돌면 `useRef`가 초기화되어
 * 동일 페이로드로 네이티브 upsert가 중복 호출될 수 있음 → 모듈 단위로 한 번만 보낸다.
 */
let lastSerializedLiveActivityPayload: string | null = null;

export function useLiveActivitySync(payload: LockFlowLiveActivityPayload | null): void {
  useEffect(() => {
    if (!payload) {
      lastSerializedLiveActivityPayload = null;
      return;
    }

    const nextSerialized = JSON.stringify(payload);
    if (lastSerializedLiveActivityPayload === nextSerialized) {
      return;
    }

    lastSerializedLiveActivityPayload = nextSerialized;
    void upsertLockFlowLiveActivity(payload);
  }, [payload]);
}
