import { create } from 'zustand';

import {
  ensureLocalNotificationPermission,
  getLocalNotificationPermissionSnapshot,
  type LocalNotificationPermissionSnapshot,
} from '@shared/lib/notifications';

type LocalNotificationsState = {
  /** 마지막으로 OS와 맞춘 권한 스냅샷 */
  permission: LocalNotificationPermissionSnapshot;
  /** OS에 질의만 하고 스토어를 갱신합니다. */
  refreshPermission: () => Promise<void>;
  /** 시스템 권한 요청(필요 시) 후 스토어를 갱신합니다. */
  ensurePermission: () => Promise<boolean>;
};

export const useLocalNotificationsStore = create<LocalNotificationsState>((set, get) => ({
  permission: 'unknown',
  refreshPermission: async () => {
    const permission = await getLocalNotificationPermissionSnapshot();
    set({ permission });
  },
  ensurePermission: async () => {
    const granted = await ensureLocalNotificationPermission();
    await get().refreshPermission();
    return granted;
  },
}));
