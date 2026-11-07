import { Image } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroPolaroidEditor } from './HeroPolaroidEditor';
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: 'ComicSceneImage' }));
jest.mock('./HeroPolaroidProcessor', () => ({ HeroPolaroidProcessor: 'PolaroidProcessor' }));
const mockState = { isHydrated: true, pro: false, hydrate: jest.fn(async () => {}), refreshCustomerInfo: jest.fn(async () => null) };
const mockPaywall = jest.fn(async () => 'cancelled');
jest.mock('@features/subscriptions/model/subscriptionStore', () => ({ useSubscriptionStore: Object.assign((select: (s: unknown) => unknown) => select(mockState), { getState: () => mockState }), selectIsPro: (s: { pro: boolean }) => s.pro }));
jest.mock('@features/subscriptions/lib/presentPaywall', () => ({ presentPaywall: () => mockPaywall() }));
jest.mock('./HeroCardAppearanceControls', () => ({ HeroCardAppearanceControls: 'AppearanceControls' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').View }));
beforeEach(() => { jest.clearAllMocks(); mockState.pro = false; });
it.each(['save', 'share'])('blocks premium %s when the paywall is cancelled', async action => {
  const onExport = jest.fn(); let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPolaroidEditor initial={{ title: 'hello', date: '2026. 11. 06', film: 'warm' }} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  try {
    await act(async () => tree.root.findAllByProps({ testID: `polaroid-editor-${action}` })[0].props.onPress());
    expect(mockPaywall).toHaveBeenCalledTimes(1);
    expect(onExport).not.toHaveBeenCalled();
  } finally { act(() => tree.unmount()); }
});
it.each([false, true])('exports basic content for free and premium content for Pro (%s)', async pro => {
  mockState.pro = pro;
  const onExport = jest.fn(async () => {}); let tree!: ReactTestRenderer;
  const initial = { title: 'hello', date: '2026. 11. 06', film: pro ? 'warm' as const : 'original' as const };
  await act(async () => { tree = create(<HeroPolaroidEditor initial={initial} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  try {
    await act(async () => tree.root.findAllByProps({ testID: 'polaroid-editor-save' })[0].props.onPress());
    expect(mockPaywall).not.toHaveBeenCalled();
    expect(onExport).toHaveBeenCalledWith('save', initial);
  } finally { act(() => tree.unmount()); }
});

it('blocks export until correction is ready, then exports the exact preview pixels', async () => {
  const size = jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => success(900, 1200));
  mockState.pro = true;
  const onExport = jest.fn(async () => {});
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPolaroidEditor uri="file:///original.png" initial={{ title: 'hello', date: '', brightness: 50 }} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  try {
    await act(async () => tree.root.findAllByProps({ testID: 'polaroid-editor-save' })[0].props.onPress());
    expect(onExport).not.toHaveBeenCalled();
    await act(async () => tree.root.findByType('PolaroidProcessor' as never).props.onResult('data:image/png;base64,processed'));
    await act(async () => tree.root.findAllByProps({ testID: 'polaroid-editor-save' })[0].props.onPress());
    expect(onExport).toHaveBeenCalledWith('save', expect.objectContaining({ brightness: 50, processedUri: 'data:image/png;base64,processed' }));
  } finally { act(() => tree.unmount()); size.mockRestore(); }
});

it.each(['save', 'share'] as const)('hides writing independently of the date and applies it to %s', async action => {
  const onExport = jest.fn(async () => {});
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPolaroidEditor initial={{ title: 'Keep my writing', date: '2026. 11. 07' }} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  try {
    const toggle = () => tree.root.findAllByProps({ testID: 'polaroid-toggle-text' })[0];
    act(() => toggle().props.onPress());
    expect(tree.root.findAllByProps({ testID: 'polaroid-preview-title' })).toHaveLength(0);
    expect(tree.root.findAllByProps({ testID: 'polaroid-preview-date' }).length).toBeGreaterThan(0);
    await act(async () => tree.root.findAllByProps({ testID: `polaroid-editor-${action}` })[0].props.onPress());
    expect(onExport).toHaveBeenCalledWith(action, expect.objectContaining({ title: 'Keep my writing', showText: false }));
    act(() => toggle().props.onPress());
    expect(tree.root.findAllByProps({ testID: 'polaroid-preview-title' })[0].props.children).toBe('Keep my writing');
  } finally { act(() => tree.unmount()); }
});
