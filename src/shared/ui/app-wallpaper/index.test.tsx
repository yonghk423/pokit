import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AppWallpaperBackground } from './index';

it('leaves the standard surface visible without adding a duvet background', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<AppWallpaperBackground />); });
  expect(tree.toJSON()).toBeNull();
  act(() => tree.unmount());
});
