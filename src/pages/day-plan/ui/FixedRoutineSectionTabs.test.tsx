import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TextInput } from 'react-native';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { StorageKeys } from '@shared/lib/storage/storageKeys';
import { FixedRoutineSectionTabs } from './FixedRoutineSectionTabs';
import { palette } from '../lib/dayPlanPalette';

jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/handdrawn-frame', () => ({ HanddrawnFrame: () => null }));
jest.mock('@shared/ui/paper-grain', () => ({ PaperGrain: () => null }));
jest.mock('@shared/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('@shared/ui/post-it-card-shell', () => ({ PostItCardShell: ({ children }: { children: React.ReactNode }) => children }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? children : null }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));
jest.mock('@shared/ui/themed-text-input', () => ({ ThemedTextInput: jest.requireActual('react-native').TextInput }));

it('saves a renamed tab across remounts and restores the default name', () => {
  localStorageClient.removeItem(StorageKeys.routineTabLabels);
  const render = () => <FixedRoutineSectionTabs section="catalog" onSelectSection={jest.fn()} c={palette(false)} isDark={false} />;
  let tree!: ReactTestRenderer;
  act(() => { tree = create(render()); });
  const tab = (name: string) => tree.root.findAll(node => node.props.accessibilityRole === 'tab' && node.props.accessibilityLabel === name && typeof node.props.onLongPress === 'function')[0];
  act(() => { tab('catalog.routineListTab').props.onLongPress(); });
  act(() => { tree.root.findByType(TextInput).props.onChangeText('  나의 도우미  '); });
  act(() => { tree.root.findByType(TextInput).props.onSubmitEditing(); });
  expect(tab('나의 도우미')).toBeDefined();
  expect(localStorageClient.getJson(StorageKeys.routineTabLabels)).toEqual({ catalog: '나의 도우미' });
  act(() => { tree.unmount(); tree = create(render()); });
  expect(tab('나의 도우미')).toBeDefined();
  act(() => { tab('나의 도우미').props.onLongPress(); });
  act(() => { tree.root.findAll(node => typeof node.props.onPress === 'function' && node.findAllByProps({ children: 'catalog.resetTabName' }).length > 0)[0].props.onPress(); });
  expect(tab('catalog.routineListTab')).toBeDefined();
  expect(localStorageClient.getJson(StorageKeys.routineTabLabels)).toEqual({});
  act(() => { tree.unmount(); });
});
