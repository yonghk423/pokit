import { useEffect } from 'react';

import { useLocalNotificationsStore } from '@entities/local-notifications';

/**
 * 로컬 알림 권한 전역 스토어와 동기화합니다.
 * - 마운트 시 OS 스냅샷 갱신
 * - `ensurePermission`은 설정·온보딩 등에서 권한 요청 + 스토어 반영에 사용
 *
 * 앱이 백그라운드에서 돌아올 때의 갱신은 `useAppBootstrap`의 `AppState`와 함께 처리합니다.
 */
export function useLocalNotifications() {
  const permission = useLocalNotificationsStore((s) => s.permission);
  const refreshPermission = useLocalNotificationsStore((s) => s.refreshPermission);
  const ensurePermission = useLocalNotificationsStore((s) => s.ensurePermission);

  useEffect(() => {
    void refreshPermission();
  }, [refreshPermission]);

  return { permission, refreshPermission, ensurePermission };
}
