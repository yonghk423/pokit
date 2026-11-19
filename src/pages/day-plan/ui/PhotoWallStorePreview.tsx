import { BASIC_STORE_THUMBNAILS } from '../lib/basicStoreThumbnails';
import { PhotoWallClip } from './HeroPhotoWall';
import { View } from 'react-native';
import { DiaryItemImage } from './DiaryItemImage';

const looseFrames = [
  { left: 8, top: 10, angle: -12 },
  { left: 53, top: 16, angle: 9 },
  { left: 13, top: 52, angle: 8 },
  { left: 55, top: 55, angle: -10 },
];

/** Store layout previews avoid decoding photographic artwork. */
export function PhotoWallStorePreview({ variant, square = false }: { variant: 'none' | 'black' | 'aligned'; square?: boolean }) {
  const hanging = variant === 'black';
  const frames = hanging ? Array.from({ length: 8 }, (_, i) => ({ left: 6 + i % 4 * 23, top: 28 + Math.floor(i / 4) * 36, angle: 0 })) : variant === 'aligned' ? looseFrames.map((_, index) => ({ left: 10 + (index % 2) * 44, top: 8 + Math.floor(index / 2) * 45, angle: 0 })) : looseFrames;

  return <View testID={`photo-wall-store-preview-${variant}`} pointerEvents="none" style={{ width: '100%', aspectRatio: square ? 1 : 1102 / 1427 }}>
    {hanging ? <DiaryItemImage source={BASIC_STORE_THUMBNAILS['photo-wall-black']}
      contentFit="contain" style={{ position: 'absolute', top: '12%', width: '100%', height: '42%', zIndex: 2 }} /> : null}
    {hanging ? [0, 1, 2, 3].map(i => <View key={i} style={{ position: 'absolute', left: `${15.5 + i * 23}%`, top: '16%', height: '70%', width: 0.7, backgroundColor: '#292929' }} />) : null}
    {frames.map((frame, index) => <View key={index} style={{ position: 'absolute', left: `${frame.left}%`, top: `${frame.top}%`, width: hanging ? '19%' : '33%', aspectRatio: 0.8, padding: hanging ? 1 : 3, paddingBottom: hanging ? 3 : 9, transform: [{ rotate: `${frame.angle}deg` }], shadowColor: '#403B30', shadowOpacity: 0.2, shadowRadius: hanging ? 1 : 2, shadowOffset: { width: 1, height: 2 } }}>
      <View style={{ position: 'absolute', inset: 0, backgroundColor: '#F1F0EC', borderWidth: 0.5, borderColor: '#D2D0C9' }} />
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#E9E9E6' }} />
      {hanging ? <View style={{ position: 'absolute', top: -7, left: '22%', transform: [{ scale: 0.5 }] }}><PhotoWallClip /></View> : null}
    </View>)}
  </View>;
}
