import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AccessibilityInfo, Keyboard, Platform, View } from 'react-native';

import { AppAlert, useAppAlertStore } from '@shared/lib/app-alert';
import { AppAlertRoot } from './AppAlertSurface';
import { AppModal } from '@shared/ui/app-modal';

jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/lib/hooks/use-color-scheme', () => ({ useColorScheme: () => 'light' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/handdrawn-frame', () => ({ HanddrawnFrame: jest.requireActual('react-native').View }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: jest.requireActual('react-native').View }));

beforeEach(() => {
  jest.useFakeTimers();
  useAppAlertStore.setState({ queue: [], scopes: [] });
  jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus').mockImplementation(() => {});
});
afterEach(() => { jest.runOnlyPendingTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

function button(tree: ReactTestRenderer, label: string) {
  return tree.root.findAll((node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0];
}

it('renders localized acknowledgement, hides background accessibility, and restores the surface after closing', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<AppAlertRoot><View testID="page" /></AppAlertRoot>); });
  act(() => AppAlert.alert('Saved', 'Your changes were saved.'));
  expect(button(tree, 'common.confirm')).toBeDefined();
  expect(tree.root.findAll((node) => node.props.importantForAccessibility === 'no-hide-descendants')).not.toHaveLength(0);
  act(() => button(tree, 'common.confirm').props.onPress());
  expect(button(tree, 'common.confirm')).toBeUndefined();
  expect(tree.root.findAll((node) => node.props.importantForAccessibility === 'no-hide-descendants')).toHaveLength(0);
  act(() => tree.unmount());
});

it('shows one alert inside an existing native modal and intercepts the modal back action safely', () => {
  const cancel = jest.fn();
  const closeSheet = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<AppAlertRoot><AppModal visible onRequestClose={closeSheet}><View /></AppModal></AppAlertRoot>); });
  act(() => AppAlert.alert('Delete', 'Keep or delete?', [{ text: 'Keep', style: 'cancel', onPress: cancel }, { text: 'Delete', style: 'destructive' }]));
  expect(tree.root.findAll((node) => node.props.accessibilityRole === 'button' && node.props.accessibilityLabel === 'Keep' && typeof node.props.onPress === 'function')).toHaveLength(1);
  const modal = tree.root.findAll((node) => node.props.visible === true && typeof node.props.onRequestClose === 'function' && node.type !== AppModal)[0];
  act(() => modal.props.onRequestClose({}));
  expect(closeSheet).not.toHaveBeenCalled();
  expect(button(tree, 'Keep')).toBeDefined();
  act(() => button(tree, 'Keep').props.onPress());
  expect(cancel).toHaveBeenCalledTimes(1);
  act(() => modal.props.onRequestClose({}));
  expect(closeSheet).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  expect(useAppAlertStore.getState().scopes).toEqual([]);
});


it('waits for the iOS root window to close before invoking an action that may open another sheet', () => {
  const originalOS = Platform.OS;
  Object.defineProperty(Platform, 'OS', { value: 'ios', configurable: true });
  const action = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<AppAlertRoot><View /></AppAlertRoot>); });
  act(() => AppAlert.alert('Continue', '', [{ text: 'Open sheet', onPress: action }]));
  act(() => button(tree, 'Open sheet').props.onPress());
  expect(action).not.toHaveBeenCalled();
  const modal = tree.root.findAll((node) => typeof node.props.onDismiss === 'function' && node.props.transparent === true)[0];
  act(() => modal.props.onDismiss());
  expect(action).toHaveBeenCalledTimes(1);
  act(() => modal.props.onDismiss());
  expect(action).toHaveBeenCalledTimes(1);
  act(() => tree.unmount());
  Object.defineProperty(Platform, 'OS', { value: originalOS, configurable: true });
});
