import { NativeModules, Platform } from 'react-native';
import { loadAppFontId, saveAppFontId } from '@shared/lib/storage';
import { useAppFontStore } from './appFontStore';
jest.mock('@shared/lib/storage', () => ({ loadAppFontId: jest.fn(() => 'corncorn'), loadAppFontSizeId: () => 'sm', saveAppFontId: jest.fn(), saveAppFontSizeId: jest.fn() }));
const previousOS = Platform.OS;
const previousModule = NativeModules.PokitWidgetSync;
afterEach(() => {
 Object.defineProperty(Platform, 'OS', { configurable: true, value: previousOS });
 NativeModules.PokitWidgetSync = previousModule;
 jest.clearAllMocks();
});
it('updates the native widget when the app font changes', () => {
 Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
 const syncAppFontId = jest.fn(); NativeModules.PokitWidgetSync = { syncAppFontId };
 useAppFontStore.getState().setFontId('cafe24ShiningStar');
 expect(saveAppFontId).toHaveBeenCalledWith('cafe24ShiningStar');
 expect(syncAppFontId).toHaveBeenCalledWith('cafe24ShiningStar');
});
it('sends the persisted font to the widget on app startup', () => {
 Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
 const syncAppFontId = jest.fn(); NativeModules.PokitWidgetSync = { syncAppFontId };
 jest.mocked(loadAppFontId).mockReturnValueOnce('hiMelody');
 useAppFontStore.getState().hydrate();
 expect(syncAppFontId).toHaveBeenCalledWith('hiMelody');
 expect(useAppFontStore.getState().fontId).toBe('hiMelody');
});
it('still changes app typography on older native builds without the new widget method', () => {
 Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
 NativeModules.PokitWidgetSync = {};
 expect(() => useAppFontStore.getState().setFontId('corncorn')).not.toThrow();
 expect(useAppFontStore.getState().fontId).toBe('corncorn');
});
