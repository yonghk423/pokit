import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { Image } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroPolaroidEditor } from './HeroPolaroidEditor';
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: 'ComicSceneImage' }));
jest.mock('./HeroPolaroidProcessor', () => ({ HeroPolaroidProcessor: 'PolaroidProcessor' }));
const mockState = { isHydrated: true, pro: false, hydrate: jest.fn(async () => {}), refreshCustomerInfo: jest.fn(async () => null) };
jest.mock('../../settings/ui/ProPreviewPage', () => ({ ProPreviewPage: 'AppProScreen' }));
jest.mock('@features/subscriptions/model/subscriptionStore', () => ({ useSubscriptionStore: Object.assign((select: (s: unknown) => unknown) => select(mockState), { getState: () => mockState }), selectIsPro: (s: { pro: boolean }) => s.pro }));
jest.mock('./HeroCardAppearanceControls', () => ({ HeroCardAppearanceControls: 'AppearanceControls' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').View }));
beforeEach(() => { jest.clearAllMocks(); mockState.pro = false; });
beforeEach(() => { FEATURE_FLAGS.proSubscriptions = true; FEATURE_FLAGS.proPolaroidExport = true; });
afterEach(() => { FEATURE_FLAGS.proSubscriptions = false; FEATURE_FLAGS.proPolaroidExport = false; });
it.each(['save', 'share'])('blocks premium %s when the paywall is cancelled', async action => {
  const onExport = jest.fn(); let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPolaroidEditor initial={{ title: 'hello', date: '2026. 11. 06', film: 'warm' }} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  try {
    await act(async () => tree.root.findAllByProps({ testID: `polaroid-editor-${action}` })[0].props.onPress());
    expect(tree.root.findAllByType('AppProScreen' as never)).toHaveLength(1);
    await act(async () => tree.root.findByType('AppProScreen' as never).props.onClose());
    expect(tree.root.findAllByType('AppProScreen' as never)).toHaveLength(0);
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
    expect(tree.root.findAllByType('AppProScreen' as never)).toHaveLength(0);
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

it('resumes premium export only after the app subscription screen activates Pro', async () => {
  const onExport = jest.fn(async () => {});
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPolaroidEditor initial={{ title: 'hello', date: '', film: 'warm' }} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  try {
    await act(async () => tree.root.findAllByProps({ testID: 'polaroid-editor-save' })[0].props.onPress());
    expect(onExport).not.toHaveBeenCalled();
    await act(async () => { mockState.pro = true; tree.root.findByType('AppProScreen' as never).props.onActivated('purchased'); });
    expect(onExport).toHaveBeenCalledTimes(1);
  } finally { act(() => tree.unmount()); }
});

it('flips to the memo and reuses the writing editor while persisting saved text', () => {
  const { HeroCardEditor } = require('./HeroCardCaption');
  const onSaveText = jest.fn();
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPolaroidEditor initial={{ title: 'Before', memo: 'Memo', date: '2026.11.08' }} busy={false} onClose={jest.fn()} onExport={jest.fn()} onSaveText={onSaveText} />); });
  act(() => tree.root.findAllByProps({ testID: 'polaroid-preview-stage' })[0].props.onLayout({ nativeEvent: { layout: { width: 400, height: 600 } } }));
  act(() => tree.root.findAllByProps({ testID: 'polaroid-flip' })[0].props.onPress());
  expect(tree.root.findAllByProps({ testID: 'polaroid-flip' })[0].props.accessibilityLabel).toBe('사진 보기');
  act(() => tree.root.findAllByProps({ testID: 'polaroid-back-write' })[0].props.onPress());
  act(() => tree.root.findByType(HeroCardEditor).props.onChange({ title: 'After', memo: 'Updated memo' }));
  act(() => tree.root.findByType(HeroCardEditor).props.onSave());
  expect(onSaveText).toHaveBeenCalledWith({ title: 'After', memo: 'Updated memo' });
  expect(tree.root.findAllByType(HeroCardEditor)).toHaveLength(0);
  act(() => tree.unmount());
});


it('reserves the slider row and keeps the entire print smaller and stable while selecting adjustments', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPolaroidEditor initial={{ title: '', date: '2026.11.08' }} busy={false} onClose={jest.fn()} onExport={jest.fn()} />); });
  try {
    const field = (id: string) => tree.root.findAllByProps({ testID: id })[0];
    act(() => field('polaroid-preview-stage').props.onLayout({ nativeEvent: { layout: { width: 400, height: 600 } } }));
    const print = field('polaroid-preview-print').props.style;
    expect(print.height * print.transform[0].scale).toBeLessThanOrEqual(516);
    expect(print.width * print.transform[0].scale).toBeLessThanOrEqual(360);
    expect(field('polaroid-live-preview').props.contentFit).toBe('cover');
    expect(field('polaroid-slider-space').props.style.height).toBe(44);
    const brightness = tree.root.findAllByProps({ accessibilityLabel: '밝기' }).find(node => node.props.onPress);
    act(() => brightness!.props.onPress());
    expect(field('polaroid-adjustment-panel')).toBeDefined();
    expect(field('polaroid-slider-space').props.style.height).toBe(44);
    expect(field('polaroid-preview-print').props.style).toEqual(expect.objectContaining({ width: print.width, height: print.height }));
    expect(field('polaroid-preview-print').props.style.transform[0].scale).toBe(print.transform[0].scale);
  } finally { act(() => tree.unmount()); }
});


it('selects films inside the black toolbox without changing the print size', async () => {
  const onExport = jest.fn(async () => {});
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPolaroidEditor initial={{ title: '', date: '2026.11.08' }} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  try {
    const field = (id: string) => tree.root.findAllByProps({ testID: id })[0];
    expect(tree.root.findAllByProps({ testID: 'polaroid-filter-list' })).toHaveLength(0);
    act(() => field('polaroid-preview-stage').props.onLayout({ nativeEvent: { layout: { width: 400, height: 600 } } }));
    const print = field('polaroid-preview-print').props.style;
    act(() => field('polaroid-select-warm').props.onPress());
    expect(field('polaroid-select-warm').props.accessibilityState.selected).toBe(true);
    expect(field('polaroid-preview-print').props.style).toEqual(expect.objectContaining({ width: print.width, height: print.height }));
    expect(field('polaroid-preview-print').props.style.transform[0].scale).toBe(print.transform[0].scale);
    act(() => field('polaroid-tool-brightness').props.onPress());
    expect(tree.root.findAllByProps({ testID: 'polaroid-film-options' })).toHaveLength(0);
    act(() => field('polaroid-tool-film').props.onPress());
    expect(field('polaroid-select-warm').props.accessibilityState.selected).toBe(true);
    expect(field('polaroid-slider-space').props.style.height).toBe(44);
  } finally { act(() => tree.unmount()); }
});

it.each(['save', 'share'])('exports edited content without subscription checks in the free release (%s)', async action => {
  FEATURE_FLAGS.proSubscriptions = false;
  FEATURE_FLAGS.proPolaroidExport = false;
  mockState.pro = false;
  mockState.refreshCustomerInfo.mockClear();
  const onExport = jest.fn(async () => {});
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPolaroidEditor initial={{ title: 'hello', date: '2026. 11. 09', film: 'warm' }} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  try {
    await act(async () => tree.root.findAllByProps({ testID: `polaroid-editor-${action}` })[0].props.onPress());
    expect(onExport).toHaveBeenCalled();
    expect(mockState.refreshCustomerInfo).not.toHaveBeenCalled();
    expect(tree.root.findAllByType('AppProScreen' as never)).toHaveLength(0);
  } finally { act(() => tree.unmount()); }
});

it('shows editor immediately and reuses picker dimensions without another image lookup', async () => {
  jest.useFakeTimers();
  const size = jest.spyOn(Image, 'getSize').mockImplementation((_uri, success) => { success(1000, 1200); return Promise.resolve({ width: 1000, height: 1200 }); });
  let tree!: ReactTestRenderer;
  try {
    act(() => { tree = create(<HeroPolaroidEditor uri="file:///ready-photo.png" imageSize={{ width: 1000, height: 1200 }} initial={{ title: 'Ready', date: '2026. 11. 09' }} busy={false} onClose={jest.fn()} onExport={jest.fn()} />); });
    const field = (testID: string) => tree.root.findAllByProps({ testID })[0];
    act(() => field('polaroid-preview-stage').props.onLayout({ nativeEvent: { layout: { width: 400, height: 500 } } }));
    act(() => { jest.advanceTimersByTime(100); });
    expect(size).not.toHaveBeenCalled();
    expect(field('polaroid-editor-content').props.pointerEvents).toBe('auto');
    expect(tree.root.findAllByProps({ testID: 'polaroid-editor-skeleton' })).toHaveLength(0);
  } finally {
    if (tree) act(() => tree.unmount());
    size.mockRestore(); jest.useRealTimers();
  }
});

it('downloads separately from saving the diary entry', async () => {
  const onExport = jest.fn().mockResolvedValue(undefined);
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPolaroidEditor initial={{ title: 'Photo', date: '2026. 11. 09' }} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  try {
    await act(async () => { tree.root.findAllByProps({ testID: 'polaroid-editor-download' })[0].props.onPress(); });
    expect(onExport).toHaveBeenLastCalledWith('download', expect.objectContaining({ title: 'Photo' }));
    await act(async () => { tree.root.findAllByProps({ testID: 'polaroid-editor-save' })[0].props.onPress(); });
    expect(onExport).toHaveBeenLastCalledWith('save', expect.objectContaining({ title: 'Photo' }));
  } finally { act(() => tree.unmount()); }
});

it('uses the selected photo fit for preview and download', async () => {
  const onExport = jest.fn(async () => {});
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPolaroidEditor uri="file:///photo.png" initial={{ title: '', date: '2026.11.10' }} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  act(() => tree.root.findByProps({ testID: 'polaroid-fit-contain' }).props.onPress());
  expect(tree.root.findByProps({ testID: 'polaroid-live-preview' }).props.contentFit).toBe('contain');
  await act(async () => tree.root.findByProps({ testID: 'polaroid-editor-download' }).props.onPress());
  expect(onExport).toHaveBeenLastCalledWith('download', expect.objectContaining({ photoFit: 'contain' }));
  act(() => tree.root.findByProps({ testID: 'polaroid-fit-cover' }).props.onPress());
  expect(tree.root.findByProps({ testID: 'polaroid-live-preview' }).props.contentFit).toBe('cover');
  expect(tree.root.findByProps({ testID: 'polaroid-live-preview' }).props.style).toMatchObject({ width: 324, height: 291.6 });
  expect(tree.root.findByProps({ testID: 'polaroid-preview-print' }).props.style).toMatchObject({ width: 360, height: 432 });
  act(() => tree.unmount());
});

it('selects a calendar date and carries it into exports, with hide and today actions', async () => {
  const onExport = jest.fn(async () => {}); let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<HeroPolaroidEditor initial={{ title: 'hello', date: '2026. 11. 06', showDate: false }} busy={false} onClose={jest.fn()} onExport={onExport} />); });
  const press = async (id: string) => { await act(async () => { await tree.root.findAllByProps({ testID: id })[0].props.onPress(); }); };
  try {
    await press('polaroid-toggle-date');
    await press('polaroid-date-next');
    await press('polaroid-date-day-7');
    await press('polaroid-editor-share');
    expect(onExport).toHaveBeenLastCalledWith('share', expect.objectContaining({ date: '2026. 12. 07', showDate: true }));
    await press('polaroid-toggle-date');
    await press('polaroid-date-hide');
    await press('polaroid-editor-download');
    expect(onExport).toHaveBeenLastCalledWith('download', expect.objectContaining({ date: '2026. 12. 07', showDate: false }));
    await press('polaroid-toggle-date');
    await press('polaroid-date-today');
    await press('polaroid-editor-save');
    const now = new Date();
    expect(onExport).toHaveBeenLastCalledWith('save', expect.objectContaining({ date: `${now.getFullYear()}. ${String(now.getMonth() + 1).padStart(2, '0')}. ${String(now.getDate()).padStart(2, '0')}`, showDate: true }));
  } finally { act(() => tree.unmount()); }
});
