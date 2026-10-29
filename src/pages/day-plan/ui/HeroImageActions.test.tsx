import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert } from 'react-native';
import * as media from 'expo-media-library/legacy';
import * as sharing from 'expo-sharing';
import { HeroImageActions } from './HeroImageActions';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('expo-media-library/legacy', () => ({ requestPermissionsAsync: jest.fn(), saveToLibraryAsync: jest.fn() }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
let tree: ReactTestRenderer;
beforeEach(() => { jest.clearAllMocks(); jest.spyOn(Alert, 'alert').mockImplementation(() => undefined); jest.mocked(media.requestPermissionsAsync).mockResolvedValue({ granted: true } as never); jest.mocked(media.saveToLibraryAsync).mockResolvedValue(undefined); jest.mocked(sharing.isAvailableAsync).mockResolvedValue(true); jest.mocked(sharing.shareAsync).mockResolvedValue(undefined); act(() => { tree = create(<HeroImageActions uri="file:///completed.png" />); }); });
afterEach(() => act(() => tree.unmount()));
const button = (kind: string) => tree.root.findAllByProps({ testID: `hero-image-${kind}` })[0];
it('saves only the selected local PNG and prevents repeated saves', async () => {
  await act(async () => { button('save').props.onPress(); button('save').props.onPress(); });
  expect(media.saveToLibraryAsync).toHaveBeenCalledTimes(1);
  expect(media.saveToLibraryAsync).toHaveBeenCalledWith('file:///completed.png');
  expect(button('save').props.disabled).toBe(true);
});
it('does not save without permission', async () => {
  jest.mocked(media.requestPermissionsAsync).mockResolvedValue({ granted: false } as never);
  await act(async () => button('save').props.onPress());
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
  await act(async () => button('save').props.onPress());
  expect(button('save').props.disabled).toBe(false);
  expect(Alert.alert).toHaveBeenCalledWith('comicDay.export.failed');
});
