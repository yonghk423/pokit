import { DayPlanTabFocusContext } from '../model/dayPlanTabFocus';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn(), getProviderStatusAsync: jest.fn(), getLastKnownPositionAsync: jest.fn() }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ locale: 'ko' }) }));
jest.mock('@shared/lib/time/useTodayDate', () => ({ useTodayDate: () => new Date(2026, 10, 2) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/pen-frame', () => ({ PenFrame: () => null }));
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));
jest.mock('../lib/weatherWidgetSync', () => ({ syncWeatherToWidget: jest.fn() }));
jest.mock('../../welcome-intro/ui/ServiceTutorialTarget', () => ({ ServiceTutorialTarget: jest.requireActual('react-native').View }));
jest.mock('../../welcome-intro/ui/ServiceTutorialCoach', () => ({ ServiceTutorialCoach: () => null }));
jest.mock('../../welcome-intro/model/serviceTutorial', () => ({ useServiceTutorial: () => false }));

it('retries hidden weather on tab return, avoids background-tab requests, and refreshes on app return', async () => {
  jest.useFakeTimers();
  const previousKey = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
  process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY = 'weather-test-key';
  // Load after setting the bundle configuration, without using a real credential.
  const { WeatherSummary } = require('./WeatherSummary');
  let active!: (state: 'active') => void;
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
    active = listener;
    return { remove: jest.fn() };
  });
  const originalFetch = global.fetch;
  const fetchWeather = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ main: { temp: 16 }, weather: [{ description: 'clear sky', icon: '01d' }] }) });
  global.fetch = fetchWeather;
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ granted: false, canAskAgain: false } as never);
  jest.mocked(Location.getProviderStatusAsync).mockResolvedValue({ locationServicesEnabled: true } as never);
  jest.mocked(Location.getLastKnownPositionAsync).mockResolvedValue({ coords: { latitude: 37, longitude: 127 } } as never);
  let tree!: ReactTestRenderer;
  const render = (focused: boolean) => <DayPlanTabFocusContext.Provider value={focused}><WeatherSummary ink="#222" muted="#888" /></DayPlanTabFocusContext.Provider>;
  try {
    await act(async () => { tree = create(render(true)); });
    await act(async () => { jest.advanceTimersByTime(0); });
    expect(tree.toJSON()).toBeNull();
    await act(async () => { tree.update(render(false)); });
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ granted: true } as never);
    await act(async () => { active('active'); });
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    await act(async () => { tree.update(render(true)); });
    expect(tree.root.findAllByProps({ testID: 'weather-retry' })).toHaveLength(0);
    expect(JSON.stringify(tree.toJSON())).toContain('16°');
    fetchWeather.mockRejectedValue(new Error('offline'));
    await act(async () => { active('active'); });
    expect(JSON.stringify(tree.toJSON())).toContain('16°');
  } finally {
    act(() => tree?.unmount());
    global.fetch = originalFetch;
    subscription.mockRestore();
    if (previousKey === undefined) delete process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
    else process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY = previousKey;
    jest.useRealTimers();
  }
});
