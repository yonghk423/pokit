import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';

/** 첫 프레임은 스켈레톤만. 전환이 끝난 뒤 실제 행을 붙인다. */
export const CHUNKED_LIST_FIRST_PAINT = 0;
/** 아직 안 그린 행 자리 */
export const CHUNKED_LIST_PLACEHOLDER_HEIGHT = 64;

/**
 * 처음엔 스켈레톤만 두고, 전환이 끝나면 남은 행을 한 번에 붙인다.
 * 한 행씩 채워 보이지 않게 한다. 이미 그린 개수는 유지한다.
 * 탭이 포커스를 잃으면 붙이기를 멈춘다.
 */
export function useChunkedPaintLimit(total: number, active = true): number {
  const navigation = useNavigation();
  const [limit, setLimit] = useState(CHUNKED_LIST_FIRST_PAINT);
  const limitRef = useRef(CHUNKED_LIST_FIRST_PAINT);
  const totalRef = useRef(total);
  const enabledRef = useRef(true);
  const activeRef = useRef(active);
  limitRef.current = limit;
  totalRef.current = total;
  activeRef.current = active;

  useEffect(() => {
    let cancelled = false;
    let interactTask: { cancel: () => void } | null = null;

    const stop = () => {
      interactTask?.cancel();
      interactTask = null;
    };

    const commit = () => {
      if (cancelled || !enabledRef.current || !activeRef.current) return;
      const nextTotal = totalRef.current;
      if (limitRef.current >= nextTotal) return;
      limitRef.current = nextTotal;
      setLimit(nextTotal);
    };

    const start = () => {
      stop();
      if (!enabledRef.current || !activeRef.current) return;
      if (limitRef.current >= totalRef.current) return;
      interactTask = InteractionManager.runAfterInteractions(() => {
        if (cancelled || !enabledRef.current || !activeRef.current) return;
        commit();
      });
    };

    enabledRef.current = navigation.isFocused();
    if (enabledRef.current && active) start();

    const unsubBlur = navigation.addListener('blur', () => {
      enabledRef.current = false;
      stop();
    });
    const unsubFocus = navigation.addListener('focus', () => {
      enabledRef.current = true;
      start();
    });

    return () => {
      cancelled = true;
      stop();
      unsubBlur();
      unsubFocus();
    };
  }, [active, navigation, total]);

  return limit;
}
