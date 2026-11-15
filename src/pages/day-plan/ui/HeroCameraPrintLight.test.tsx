import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Animated, Image } from 'react-native';
import { HeroCameraPrintLight } from './HeroCameraPrintLight';
import { proDiaryCatalog } from '../model/proDiaryCatalog';
import { HERO_CAMERA_IMAGES } from '../model/heroCameraStyle';

let mockTheme: { id: string } | undefined;
let mockCamera = 'mini-evo';
jest.mock('../model/diaryTheme', () => ({ useDiaryTheme: () => mockTheme }));
jest.mock('../model/heroCameraStyle', () => ({
  useHeroCameraStyle: () => mockCamera,
  HERO_CAMERA_IMAGES: { 'mini-evo': 1, 'mini-12': 2, 'polaroid-now': 3, 'kodak-mini-shot': 4, 'leica-sofort-2': 5 },
}));

it('renders a blinking red light inside every camera at both print sizes and stops on unmount', () => {
  const source = jest.spyOn(Image, 'resolveAssetSource').mockReturnValue({ uri: 'test', width: 512, height: 512, scale: 1 });
  const stop = jest.fn();
  const loop = jest.spyOn(Animated, 'loop').mockReturnValue({ start: jest.fn(), stop, reset: jest.fn() });
  try {
    const themes = [undefined, ...proDiaryCatalog.filter(item => item.category === 'camera')];
    for (const theme of themes) {
      mockTheme = theme;
      for (const camera of theme ? ['mini-evo'] : Object.keys(HERO_CAMERA_IMAGES)) {
        mockCamera = camera;
        for (const [width, height] of [[75, 53], [60, 48]]) {
          let tree!: ReactTestRenderer;
          act(() => { tree = create(<HeroCameraPrintLight testID="lamp" width={width} height={height} />); });
          const style = tree.root.findAllByProps({ testID: 'lamp' }).find(node => node.props.style?.position === 'absolute')!.props.style;
          expect(style.left).toBeGreaterThanOrEqual(0);
          expect(style.top).toBeGreaterThanOrEqual(0);
          expect(style.left + style.width).toBeLessThanOrEqual(width);
          expect(style.top + style.height).toBeLessThanOrEqual(height);
          expect(loop).toHaveBeenCalled();
          act(() => tree.unmount());
          expect(stop).toHaveBeenCalled();
        }
      }
    }
  } finally { source.mockRestore(); loop.mockRestore(); mockTheme = undefined; }
});
