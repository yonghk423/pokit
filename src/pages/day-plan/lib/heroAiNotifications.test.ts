import { prepareHeroAiNotification } from './heroAiNotifications';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'test-project' } } } } }));
jest.mock('@shared/lib/i18n', () => ({ getAppLocale: () => 'ko' }));
jest.mock('expo-notifications', () => ({ getPermissionsAsync: jest.fn(), requestPermissionsAsync: jest.fn(), getExpoPushTokenAsync: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true }); });
it('registers an allowed physical device with the project and locale', async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true } as never);
  jest.mocked(Notifications.getExpoPushTokenAsync).mockResolvedValue({ data: 'ExponentPushToken[device]' } as never);
  const value = await prepareHeroAiNotification();
  expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
  expect(value).toEqual({ token: 'ExponentPushToken[device]', locale: 'ko' });
  expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'test-project' });
});
it('does not block generation when permission is denied or registration fails', async () => {
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: false } as never);
  await expect(prepareHeroAiNotification()).resolves.toBeUndefined();
  expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  jest.mocked(Notifications.getPermissionsAsync).mockRejectedValueOnce(new Error('native unavailable'));
  await expect(prepareHeroAiNotification()).resolves.toBeUndefined();
});
it('skips simulator push registration', async () => {
  Object.defineProperty(jest.requireMock('expo-device'), 'isDevice', { value: false, configurable: true });
  await expect(prepareHeroAiNotification()).resolves.toBeUndefined();
  expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  Object.defineProperty(jest.requireMock('expo-device'), 'isDevice', { value: true, configurable: true });
});
