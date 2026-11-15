import { View } from 'react-native';
import { DiaryItemImage } from './DiaryItemImage';

const looseFrames = [
  { left: 8, top: 10, angle: -12 },
  { left: 53, top: 16, angle: 9 },
  { left: 13, top: 52, angle: 8 },
  { left: 55, top: 55, angle: -10 },
];

/** Store layout previews avoid decoding photographic artwork. */
export function PhotoWallStorePreview({ variant, square = false }: { variant: 'none' | 'black'; square?: boolean }) {
  const hanging = variant === 'black';
  const frames = hanging ? [] : looseFrames;

  return <View testID={`photo-wall-store-preview-${variant}`} pointerEvents="none" style={{ width: '100%', aspectRatio: square ? 1 : 1102 / 1427 }}>
    {hanging ? <DiaryItemImage source={require('../../../../assets/store-previews/walnut-photo-wall.webp')}
      contentFit="contain" style={{ width: '100%', height: '100%' }} /> : null}
    {frames.map((frame, index) => <View key={index} style={{ position: 'absolute', left: `${frame.left}%`, top: `${frame.top}%`, width: hanging ? '14%' : '33%', aspectRatio: 0.8, padding: hanging ? 1 : 3, paddingBottom: hanging ? 3 : 9, transform: [{ rotate: `${frame.angle}deg` }], shadowColor: '#403B30', shadowOpacity: 0.2, shadowRadius: hanging ? 1 : 2, shadowOffset: { width: 1, height: 2 } }}>
      <View style={{ position: 'absolute', inset: 0, backgroundColor: '#F1F0EC', borderWidth: 0.5, borderColor: '#D2D0C9' }} />
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: '#E9E9E6' }} />
    </View>)}
  </View>;
}
