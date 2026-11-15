import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { CalendarPlannerNotes } from './CalendarPlannerNotes';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';

jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: jest.fn(), setJson: jest.fn() } }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ locale: 'ko' }) }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: ({ children }: any) => children }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }) }));

it('persists memo input and shows the latest saved value after Done and reopening', () => {
  const data = new Map<string, unknown>();
  jest.mocked(localStorageClient.getJson).mockImplementation(key => (data.get(key) ?? null) as any);
  jest.mocked(localStorageClient.setJson).mockImplementation((key, value) => { data.set(key, value); });
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CalendarPlannerNotes month="2026-11" scale={1} readOnly={false} />); });
  act(() => tree.root.findByProps({ accessibilityRole: 'button', accessibilityLabel: '월간 메모 편집' }).props.onPress());
  const editor = tree.root.findByProps({ testID: 'calendar-planner-keyboard-editor' });
  expect(['padding', 'height']).toContain(editor.props.behavior);
  act(() => tree.root.findByProps({ testID: 'calendar-planner-editor-input' }).props.onChange({ nativeEvent: { text: '산책하기' } }));
  expect(data.get('pokit:calendar-planner:2026-11')).toEqual({ memo: '산책하기', task: '', done: false });
  act(() => tree.root.findByProps({ testID: 'calendar-planner-keyboard-editor' }).findAll(node => node.props.accessibilityRole === 'button' && node.props.onPress)[0].props.onPress());
  expect(data.get('pokit:calendar-planner:2026-11')).toEqual({ memo: '산책하기', task: '', done: false });
  expect(tree.root.findAllByProps({ testID: 'calendar-planner-editor-input' })).toHaveLength(0);
  expect(tree.root.findAllByProps({ accessibilityRole: 'checkbox' })).toHaveLength(0);
  act(() => tree.root.findByProps({ accessibilityRole: 'button', accessibilityLabel: '월간 메모 편집' }).props.onPress());
  expect(tree.root.findByProps({ testID: 'calendar-planner-editor-input' }).props.value).toBe('산책하기');
  act(() => tree.unmount());
});
