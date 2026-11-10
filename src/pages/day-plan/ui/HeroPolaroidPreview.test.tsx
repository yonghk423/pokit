import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'react-native';
import { HeroPolaroidPreview } from './HeroPolaroidPreview';

jest.mock('./HeroPolaroidExport', () => ({ formatHeroPolaroidDate: () => '2026.11.08' }));
jest.mock('./HeroPolaroidSurface', () => ({ HeroPolaroidSurface: () => null }));
jest.mock('./HeroSceneImage', () => ({ ComicSceneImage: jest.requireActual('react-native').View }));
jest.mock('@shared/ui/themed-text', () => ({ ThemedText: jest.requireActual('react-native').Text }));

it('fills a stable portrait window without waiting for source dimensions', () => {
  jest.spyOn(Image, 'resolveAssetSource').mockImplementation(source => source as never);
  const getSize = jest.spyOn(Image, 'getSize').mockImplementation(() => {});
  let tree!: ReactTestRenderer;
  const render = (memo: string) => <HeroPolaroidPreview source={{ uri: 'file:///wide-detail-test.jpg' }} title="Today" memo={memo} />;
  act(() => { tree = create(render('Written memo')); });
  act(() => tree.root.findAllByProps({ testID: 'detail-polaroid-preview' })[0].props.onLayout({ nativeEvent: { layout: { width: 380, height: 600 } } }));
  expect(tree.root.findAllByProps({ testID: 'detail-polaroid-print' }).length).toBeGreaterThan(0);
  const style = tree.root.findAllByProps({ testID: 'detail-polaroid-print' })[0].props.style;
  const image = tree.root.findAll(node => typeof node.props.imageKey === 'string' && node.props.imageKey.startsWith('detail-polaroid:'))[0];
  expect(image.props.contentFit).toBe('cover');
  expect(image.props.contentPosition).toBe('center');
  expect(image.props.style.height / image.props.style.width).toBeCloseTo(1.2);
  act(() => tree.update(render('Updated memo')));
  expect(tree.root.findAllByProps({ testID: 'detail-polaroid-print' })[0].props.style).toEqual(style);
  expect(getSize).not.toHaveBeenCalled();
  act(() => tree.unmount());
  jest.restoreAllMocks();
});
