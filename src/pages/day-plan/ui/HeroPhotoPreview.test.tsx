import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HeroPhotoPreview } from './HeroPhotoPreview';
jest.mock('@shared/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));

it('uses native byte progress and waits for image display before completing', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroPhotoPreview uri="file:///photo.jpg" style={{ width: 100, height: 140 }} />); });
  const image = () => tree.root.findAllByProps({ testID: 'hero-photo-preview-image' })[0];
  const bar = () => tree.root.findAllByProps({ accessibilityRole: 'progressbar' })[0];
  expect(bar().props.accessibilityValue.now).toBe(0);
  act(() => image().props.onProgress({ nativeEvent: { loaded: 50, total: 100 } }));
  expect(bar().props.accessibilityValue.now).toBe(50);
  act(() => image().props.onProgress({ nativeEvent: { loaded: 100, total: 100 } }));
  expect(bar().props.accessibilityValue.now).toBe(99);
  act(() => image().props.onLoad());
  expect(tree.root.findAllByProps({ accessibilityRole: 'progressbar' })).toHaveLength(0);
  act(() => tree.update(<HeroPhotoPreview uri="file:///another.jpg" style={{ width: 100, height: 140 }} />));
  expect(bar().props.accessibilityValue.now).toBe(0);
  act(() => image().props.onError());
  expect(tree.root.findAllByProps({ accessibilityRole: 'progressbar' })).toHaveLength(0);
  act(() => tree.unmount());
});
