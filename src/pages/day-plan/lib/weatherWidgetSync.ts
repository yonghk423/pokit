import { NativeModules, Platform } from 'react-native';

type WeatherWidgetNativeModule = {
  syncWeatherWidgetJson?: (json: string) => void;
};

export type WeatherWidgetPayload = {
  version: 1;
  temperature: number;
  description: string;
  city: string;
  /** OpenWeather icon code, e.g. `10d`. */
  icon: string;
  fetchedAt: number;
};

/** Push the latest in-app weather snapshot to the comic scene home widgets. */
export function syncWeatherToWidget(payload: WeatherWidgetPayload): void {
  if (Platform.OS !== 'ios') return;
  const module = NativeModules.PokitWidgetSync as WeatherWidgetNativeModule | undefined;
  if (!module?.syncWeatherWidgetJson) return;
  try {
    module.syncWeatherWidgetJson(JSON.stringify(payload));
  } catch {
    // Widget refresh is best-effort.
  }
}
