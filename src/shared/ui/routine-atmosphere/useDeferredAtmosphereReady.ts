import { useIsFocused } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';

import { prefetchRoutineAtmosphereAssets } from './routineAtmosphereAssets';

/**
 * 탭 전환·리스트 레이아웃을 우선한 뒤, 프리페치가 끝나면 한 번에 true.
 * 한 번 true가 되면 blur해도 유지해 재진입 시 리마운트·깜빡임을 막는다.
 */
export function useDeferredAtmosphereReady(delayMs = 80): boolean {
  const focused = useIsFocused();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    if (!focused) return;

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      const wait = new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, delayMs);
      });

      void Promise.all([prefetchRoutineAtmosphereAssets(), wait]).then(() => {
        if (!cancelled) setReady(true);
      });
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [delayMs, focused, ready]);

  return ready;
}
