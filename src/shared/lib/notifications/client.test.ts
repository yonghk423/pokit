const mockScheduleNotificationAsync = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockGetAllScheduledNotificationsAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockSetNotificationHandler = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();
const mockAddNotificationResponseReceivedListener = jest.fn();
const mockAddNotificationReceivedListener = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: (...args: unknown[]) => mockSetNotificationHandler(...args),
  setNotificationChannelAsync: (...args: unknown[]) => mockSetNotificationChannelAsync(...args),
  getPermissionsAsync: (...args: unknown[]) => mockGetPermissionsAsync(...args),
  requestPermissionsAsync: (...args: unknown[]) => mockRequestPermissionsAsync(...args),
  scheduleNotificationAsync: (...args: unknown[]) => mockScheduleNotificationAsync(...args),
  cancelScheduledNotificationAsync: (...args: unknown[]) =>
    mockCancelScheduledNotificationAsync(...args),
  getAllScheduledNotificationsAsync: (...args: unknown[]) =>
    mockGetAllScheduledNotificationsAsync(...args),
  addNotificationResponseReceivedListener: (...args: unknown[]) =>
    mockAddNotificationResponseReceivedListener(...args),
  addNotificationReceivedListener: (...args: unknown[]) =>
    mockAddNotificationReceivedListener(...args),
  SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly' },
  AndroidImportance: { DEFAULT: 4 },
}));

import {
  addLocalNotificationReceivedListener,
  addLocalNotificationResponseListener,
  cancelLocalNotificationsById,
  cancelScheduledNotificationByIdentifier,
  cancelScheduledNotificationsByEventType,
  ensureLocalNotificationPermission,
  getLocalNotificationPermissionSnapshot,
  scheduleDailyLocalNotification,
  scheduleLocalNotification,
  scheduleWeeklyLocalNotification,
  sendImmediateNotification,
} from './client';

describe('notifications client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: true, status: 'granted' });
    mockScheduleNotificationAsync.mockResolvedValue('nid-1');
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      {
        identifier: 'orphan-1',
        content: { data: { eventType: 'priorityDayStart' } },
      },
    ]);
  });

  it('returns granted permission snapshot', async () => {
    await expect(getLocalNotificationPermissionSnapshot()).resolves.toBe('granted');
  });

  it('requests permission when not granted', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ granted: false, status: 'undetermined' });
    await expect(ensureLocalNotificationPermission()).resolves.toBe(true);
    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
  });

  it('schedules date, daily and weekly notifications', async () => {
    const at = new Date(Date.now() + 60_000);
    await scheduleLocalNotification({ title: 'T', body: 'B', triggerAt: at });
    await scheduleDailyLocalNotification({
      identifier: 'pokit:test',
      title: '매일',
      body: '본문',
      hour: 9,
      minute: 30,
    });
    await scheduleWeeklyLocalNotification({
      identifier: 'pokit:weekly',
      title: '주간',
      body: '본문',
      weekday: 6,
      hour: 11,
      minute: 15,
    });
    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it('cancels by identifier and event type', async () => {
    await cancelScheduledNotificationByIdentifier('pokit:test');
    await cancelScheduledNotificationsByEventType('priorityDayStart');
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalled();
  });

  it('sends immediate notification', async () => {
    await sendImmediateNotification({ title: '즉시', body: '알림' });
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: null }),
    );
  });

  it('cancels notifications by id list', async () => {
    await cancelLocalNotificationsById(['a', '', 'b']);
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledTimes(2);
  });

  it('returns denied and undetermined permission snapshots', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ granted: false, status: 'denied' });
    await expect(getLocalNotificationPermissionSnapshot()).resolves.toBe('denied');

    mockGetPermissionsAsync.mockResolvedValueOnce({ granted: false, status: 'undetermined' });
    await expect(getLocalNotificationPermissionSnapshot()).resolves.toBe('undetermined');
  });

  it('returns false when permission request is denied', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false, status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied' });
    await expect(ensureLocalNotificationPermission()).resolves.toBe(false);
  });

  it('skips scheduling for invalid or past trigger dates', async () => {
    await expect(
      scheduleLocalNotification({ title: 'T', body: 'B', triggerAt: new Date('invalid') }),
    ).resolves.toBeNull();
    await expect(
      scheduleLocalNotification({ title: 'T', body: 'B', triggerAt: new Date(Date.now() - 1000) }),
    ).resolves.toBeNull();
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('configures handler once and wires notification listeners', () => {
    const removeResponse = jest.fn();
    const removeReceived = jest.fn();
    let onResponse: ((event: unknown) => void) | undefined;
    let onReceived: ((event: unknown) => void) | undefined;
    mockAddNotificationResponseReceivedListener.mockImplementation((cb) => {
      onResponse = cb;
      return { remove: removeResponse };
    });
    mockAddNotificationReceivedListener.mockImplementation((cb) => {
      onReceived = cb;
      return { remove: removeReceived };
    });

    const payloads: Record<string, unknown>[] = [];
    const unsubResponse = addLocalNotificationResponseListener((data) => payloads.push(data));
    const unsubReceived = addLocalNotificationReceivedListener((data) => payloads.push(data));

    onResponse?.({
      notification: { request: { content: { data: { eventType: 'tap' } } } },
    });
    onReceived?.({
      request: { content: { data: { eventType: 'foreground' } } },
    });

    expect(payloads).toEqual([{ eventType: 'tap' }, { eventType: 'foreground' }]);
    unsubResponse();
    unsubReceived();
    expect(removeResponse).toHaveBeenCalled();
    expect(removeReceived).toHaveBeenCalled();
  });

  it('ignores empty identifier and event type cancel targets', async () => {
    await cancelScheduledNotificationByIdentifier('');
    await cancelScheduledNotificationsByEventType('');
    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('notifications client (non-native)', () => {
  it('returns unknown permission and skips scheduling on web', async () => {
    jest.resetModules();
    let mod: typeof import('./client');
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({
        Platform: { OS: 'web' },
      }));
      jest.doMock('expo-notifications', () => ({
        getPermissionsAsync: jest.fn(),
        scheduleNotificationAsync: jest.fn(),
        SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly' },
      }));
      mod = require('./client');
    });
    await expect(mod!.getLocalNotificationPermissionSnapshot()).resolves.toBe('unknown');
    await expect(
      mod!.scheduleLocalNotification({
        title: 'T',
        body: 'B',
        triggerAt: new Date('2025-05-26T09:00:00'),
      }),
    ).resolves.toBeNull();
    const noop = mod!.addLocalNotificationResponseListener(() => {});
    expect(typeof noop).toBe('function');
    noop();
  });
});

describe('notifications client (android channel)', () => {
  it('creates default notification channel on first use', async () => {
    jest.resetModules();
    const mockSetNotificationChannelAsync = jest.fn().mockResolvedValue(undefined);
    let mod: typeof import('./client');
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({
        Platform: { OS: 'android' },
      }));
      jest.doMock('expo-notifications', () => ({
        setNotificationHandler: jest.fn(),
        setNotificationChannelAsync: mockSetNotificationChannelAsync,
        getPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
        requestPermissionsAsync: jest.fn(),
        scheduleNotificationAsync: jest.fn().mockResolvedValue('id'),
        cancelScheduledNotificationAsync: jest.fn(),
        getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
        addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
        addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
        SchedulableTriggerInputTypes: { DATE: 'date', DAILY: 'daily', WEEKLY: 'weekly' },
        AndroidImportance: { DEFAULT: 4 },
      }));
      mod = require('./client');
    });
    await mod!.getLocalNotificationPermissionSnapshot();
    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ name: '기본' }),
    );
  });
});

