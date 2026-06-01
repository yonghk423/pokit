import {
  ensureLocalNotificationPermission,
  getLocalNotificationPermissionSnapshot,
} from '@shared/lib/notifications';

import { useLocalNotificationsStore } from './localNotificationsStore';

jest.mock('@shared/lib/notifications', () => ({
  getLocalNotificationPermissionSnapshot: jest.fn(),
  ensureLocalNotificationPermission: jest.fn(),
}));

const mockGetSnapshot = getLocalNotificationPermissionSnapshot as jest.MockedFunction<
  typeof getLocalNotificationPermissionSnapshot
>;
const mockEnsure = ensureLocalNotificationPermission as jest.MockedFunction<
  typeof ensureLocalNotificationPermission
>;

describe('localNotificationsStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useLocalNotificationsStore.setState({ permission: 'unknown' });
  });

  it('refreshes permission snapshot', async () => {
    mockGetSnapshot.mockResolvedValue('denied');
    await useLocalNotificationsStore.getState().refreshPermission();
    expect(useLocalNotificationsStore.getState().permission).toBe('denied');
  });

  it('ensures permission and refreshes store', async () => {
    mockEnsure.mockResolvedValue(true);
    mockGetSnapshot.mockResolvedValue('granted');
    await expect(useLocalNotificationsStore.getState().ensurePermission()).resolves.toBe(true);
    expect(useLocalNotificationsStore.getState().permission).toBe('granted');
  });
});
