import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FlatList } from 'react-native';
import { HeroCanvasNote } from './HeroCanvasNote';
const mockJobs: { work: () => void; cancelled: boolean }[] = [];
jest.mock('@shared/lib/scheduleIdleTask', () => ({ scheduleIdleTask: (work: () => void) => { const job = { work, cancelled: false }; mockJobs.push(job); return { cancel: () => { job.cancelled = true; } }; } }));
jest.mock('../model/diaryTheme', () => ({ useDiaryTheme: () => undefined }));
jest.mock('./HeroInlineNote', () => ({ HeroInlineNote: 'InlineNote' }));
jest.mock('./HeroMiniMemo', () => ({ HeroMiniMemo: () => null }));
jest.mock('./HeroMovablePocket', () => ({ HeroMovablePocket: () => null }));
jest.mock('./HeroTrashIcon', () => ({ HeroTrashIcon: () => null }));
jest.mock('@features/subscriptions/model/subscriptionStore', () => ({ selectIsPro: () => false, useSubscriptionStore: Object.assign(() => false, { getState: () => ({}) }) }));
jest.mock('@features/apple-calendar/useDeviceEvents', () => ({ useDeviceEvents: () => ({ connected: false, loading: false, events: [], refresh: jest.fn() }) }));
jest.mock('../model/heroCanvasEvents', () => ({ saveCanvasEvents: jest.fn() }));
jest.mock('@shared/ui/native-hhmm-wheel-picker/NativeHhmmWheelPicker', () => ({ NativeHhmmWheelPicker: () => null }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 54, bottom: 34, left: 0, right: 0 }) }));
jest.mock('@shared/lib/storage/localStorageClient', () => ({ localStorageClient: { getJson: (key: string) => key === 'pokit:canvas-events:2026-11-15' ? Array.from({ length: 1000 }, (_, i) => ({ id: String(i), title: 'Event ' + i })) : null, getItemRaw: () => null, setJson: jest.fn(), setItemRaw: jest.fn(), removeItem: jest.fn() } }));
function finishJobs() { act(() => { for (const job of mockJobs.splice(0)) if (!job.cancelled) job.work(); }); }
it('shows a skeleton before loading and renders a bounded initial batch of 1000 events', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCanvasNote date="2026-11-15" ink="#222222" />); });
  act(() => tree.root.findByProps({ testID: 'hero-canvas-tab-event' }).props.onPress());
  expect(tree.root.findAllByProps({ testID: 'hero-events-skeleton' }).length).toBeGreaterThan(0);
  finishJobs();
  expect(tree.root.findAllByProps({ testID: 'hero-events-skeleton' })).toHaveLength(0);
  const list = tree.root.findByType(FlatList);
  expect(list.props.data).toHaveLength(1000);
  const rows = tree.root.findAll(node => typeof node.props.testID === 'string' && /^hero-event-delete-/.test(node.props.testID));
  // Each host and Pressable can share the testID; unique IDs count actual rows.
  expect(new Set(rows.map(row => row.props.testID)).size).toBeLessThanOrEqual(8);
  expect(rows.length).toBeGreaterThan(0);
  act(() => tree.unmount());
});
it('cancels an old date load instead of showing its events on a new date', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroCanvasNote date="2026-11-15" ink="#222222" />); });
  act(() => tree.update(<HeroCanvasNote date="2026-11-16" ink="#222222" />));
  act(() => tree.root.findByProps({ testID: 'hero-canvas-tab-event' }).props.onPress());
  finishJobs();
  expect(tree.root.findByType(FlatList).props.data).toEqual([]);
  act(() => tree.unmount());
});
