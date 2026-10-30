import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import * as Notifications from 'expo-notifications';
import { useHeroAiNotifications } from './useHeroAiNotifications';
const mockPush = jest.fn();
const mockRouter = { push: mockPush };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('expo-notifications', () => ({ setNotificationHandler: jest.fn(), addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })), getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null), clearLastNotificationResponseAsync: jest.fn().mockResolvedValue(undefined) }));
function Listener() { useHeroAiNotifications(true); return null; }
it('opens the completed job on cold start and ignores duplicate responses', async () => {
  const response = { notification: { request: { identifier: 'notice-one', content: { data: { type: 'hero-ai-complete', jobId: 'hero-test-123' } } } } };
  jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValueOnce(response as never);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Listener />); });
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(tabs)/comic-day', params: { generationJob: 'hero-test-123' } });
  const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0][0];
  act(() => listener(response as never));
  expect(mockPush).toHaveBeenCalledTimes(1);
  act(() => listener({ notification: { request: { identifier: 'other', content: { data: { type: 'other' } } } } } as never));
  expect(mockPush).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  expect(jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.results[0].value.remove).toHaveBeenCalled();
});
