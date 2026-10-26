import { create } from 'zustand';
import type { ImageSourcePropType } from 'react-native';

type HeroTabArtwork = { source: ImageSourcePropType; setSource: (source: ImageSourcePropType) => void };
/** The tab follows the settled scene, never every frame of a swipe. */
export const useHeroTabArtwork = create<HeroTabArtwork>((set) => ({
  source: require('../../../../assets/tab-icons/comic-portrait-v2.webp'),
  setSource: source => set(state => state.source === source ? state : { source }),
}));
