jest.mock('../model/heroDiaryClip', () => ({ DIARY_CLIP_IMAGES: {} }));
jest.mock('expo-image', () => ({ Image: { loadAsync: jest.fn(async (source: unknown) => ({ source })) } }));
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Image } from 'expo-image';
import { useStoreArtwork } from './storeArtwork';

it('loads calendar cover originals without a decode size cap', async () => {
  function Probe() { useStoreArtwork(); return null; }
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Probe />); });
  const covers = [
    require('../../../../assets/store-previews/city-animation-couch.webp'),
    require('../../../../assets/store-previews/everyday-cinema-top-only.webp'),
    require('../../../../assets/store-previews/warm-sepia-open-panel.webp'),
    require('../../../../assets/store-previews/textured-watercolor.webp'),
    require('../../../../assets/store-previews/citypop-retro.webp'),
  ];
  for (const source of covers) {
    expect((Image.loadAsync as jest.Mock).mock.calls).toContainEqual([source]);
  }
  act(() => tree.unmount());
});
