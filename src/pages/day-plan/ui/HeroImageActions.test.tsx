import { HeroPolaroidEditor } from './HeroPolaroidEditor';
jest.mock('./HeroPolaroidEditor', () => ({ HeroPolaroidEditor: 'PolaroidEditor' }));
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import * as media from 'expo-media-library/legacy';
import * as sharing from 'expo-sharing';
import { HeroImageActions } from './HeroImageActions';
import { HeroPolaroidExport } from './HeroPolaroidExport';
jest.mock('./HeroPolaroidExport', () => ({ ...jest.requireActual('./HeroPolaroidExport'), HeroPolaroidExport: jest.fn(({ onComplete }: { onComplete: (uri: string) => void }) => { jest.requireActual('react').useEffect(() => { onComplete('file:///polaroid.png'); }, [onComplete]); return null; }) }));
jest.mock('react-native-view-shot', () => ({ releaseCapture: jest.fn() }));
jest.mock('@shared/lib/haptics/tapHaptic', () => ({ tapHaptic: jest.fn() }));
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('expo-media-library/legacy', () => ({ requestPermissionsAsync: jest.fn(), saveToLibraryAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('expo-asset', () => ({ Asset: { fromModule: jest.fn(() => ({ localUri: 'file:///bundled.webp', uri: 'file:///bundled.webp', downloadAsync: jest.fn(async () => undefined) })) } }));
jest.mock('expo-image-manipulator', () => ({ SaveFormat: { PNG: 'png' }, manipulateAsync: jest.fn(async () => ({ uri: 'file:///export.png' })) }));
jest.mock('expo-file-system/legacy', () => ({ deleteAsync: jest.fn(async () => undefined) }));
let tree: ReactTestRenderer;
beforeEach(async () => { jest.clearAllMocks(); jest.spyOn(Alert, 'alert').mockImplementation(() => undefined); jest.mocked(media.requestPermissionsAsync).mockResolvedValue({ granted: true } as never); jest.mocked(media.saveToLibraryAsync).mockResolvedValue(undefined); jest.mocked(sharing.isAvailableAsync).mockResolvedValue(true); jest.mocked(sharing.shareAsync).mockResolvedValue(undefined); await act(async () => { tree = create(<HeroImageActions uri="file:///completed.png" />); }); });
afterEach(() => act(() => tree.unmount()));
const button = (kind: string) => tree.root.findAllByProps({ testID: `hero-image-${kind}` })[0];
const openEditor = async () => { await act(async () => button('save').props.onPress()); };
const save = () => tree.root.findByType(HeroPolaroidEditor).props.onExport('save', tree.root.findByType(HeroPolaroidEditor).props.initial);

it('allows another download after completion while blocking overlapping saves', async () => {
  await openEditor();
  await act(async () => { void save(); void save(); });
  expect(media.saveToLibraryAsync).toHaveBeenCalledTimes(1);
  expect(media.saveToLibraryAsync).toHaveBeenCalledWith('file:///polaroid.png');
  expect(button('save').props.disabled).toBe(false);
  await openEditor();
  await act(async () => { void save(); });
  expect(media.saveToLibraryAsync).toHaveBeenCalledTimes(2);
  expect(tapHaptic).toHaveBeenCalled();
});
it('does not save without permission', async () => {
  jest.mocked(media.requestPermissionsAsync).mockResolvedValue({ granted: false } as never);
  await openEditor();
  await act(async () => { void save(); });
  expect(media.saveToLibraryAsync).not.toHaveBeenCalled();
  expect(button('save').props.disabled).toBe(false);
});
it('opens the system share sheet with the generated PNG', async () => {
  await act(async () => button('share').props.onPress());
  expect(sharing.shareAsync).toHaveBeenCalledWith('file:///completed.png', { mimeType: 'image/png', UTI: 'public.png' });
});
it('handles unavailable sharing and save failures without locking controls', async () => {
  jest.mocked(sharing.isAvailableAsync).mockResolvedValue(false);
  await act(async () => button('share').props.onPress());
  expect(sharing.shareAsync).not.toHaveBeenCalled();
  jest.mocked(media.saveToLibraryAsync).mockRejectedValue(new Error('disk'));
  await openEditor();
  await act(async () => { void save(); });
  expect(button('save').props.disabled).toBe(false);
  expect(Alert.alert).toHaveBeenCalledWith('comicDay.export.failed');
});

it('saves and shares a bundled illustration without any written title or AI result', async () => {
  act(() => tree.update(<HeroImageActions source={12} compact />));
  await act(async () => button('share').props.onPress());
  expect(sharing.shareAsync).toHaveBeenCalledWith('file:///export.png', { mimeType: 'image/png', UTI: 'public.png' });
  await openEditor();
  await act(async () => { void save(); });
  expect(media.saveToLibraryAsync).toHaveBeenCalledWith('file:///polaroid.png');
  const fs = require('expo-file-system/legacy');
  expect(fs.deleteAsync).toHaveBeenCalledWith('file:///export.png', { idempotent: true });
});

it('shows only save and share actions on illustration cards', () => {
 expect(tree.root.findAllByProps({ testID: 'hero-image-info' })).toHaveLength(0);
 expect(button('save')).toBeDefined();
 expect(button('share')).toBeDefined();
});

it('exports the current title with the diary date, rather than the download date', async () => {
  act(() => tree.update(<HeroImageActions uri="file:///completed.png" title="작은 행복을 굽는 오후" exportDate="2026-10-29" />));
  await openEditor();
  await act(async () => { void save(); });
  expect(jest.mocked(HeroPolaroidExport).mock.calls[0][0].content).toEqual({ uri: 'file:///completed.png', title: '작은 행복을 굽는 오후', date: '2026. 10. 29' });
  expect(media.saveToLibraryAsync).toHaveBeenCalledWith('file:///polaroid.png');
});

it('downloads the detail polaroid with its memo and only exposes a download action', async () => {
  act(() => tree.update(<HeroImageActions uri="file:///completed.png" title="해변" memo="태닝하고 싶다" exportDate="2026-11-03" saveOnly />));
  expect(tree.root.findAllByProps({ testID: 'hero-image-share' })).toHaveLength(0);
  await openEditor();
  await act(async () => { void save(); });
  expect(jest.mocked(HeroPolaroidExport).mock.calls[0][0].content).toEqual({ uri: 'file:///completed.png', title: '해변', memo: '태닝하고 싶다', date: '2026. 11. 03' });
  expect(media.saveToLibraryAsync).toHaveBeenCalledWith('file:///polaroid.png');
});

it('opens the editor without saving or requesting photo permission', async () => {
  await openEditor();
  expect(tree.root.findByType(HeroPolaroidEditor)).toBeTruthy();
  expect(media.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(media.saveToLibraryAsync).not.toHaveBeenCalled();
});
it('shares the decorated result from the editor', async () => {
  await openEditor();
  await act(async () => { void tree.root.findByType(HeroPolaroidEditor).props.onExport('share', { title: 'edited', date: '2026. 11. 06', film: 'warm' }); });
  expect(sharing.shareAsync).toHaveBeenCalledWith('file:///polaroid.png', { mimeType: 'image/png', UTI: 'public.png' });
  expect(jest.mocked(HeroPolaroidExport).mock.calls.at(-1)![0].content).toMatchObject({ title: 'edited', film: 'warm' });
});
