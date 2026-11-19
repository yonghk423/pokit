import { DiaryItemImage } from './DiaryItemImage';
import { StyleSheet, View } from 'react-native';
import { PHOTO_WALL_COLUMNS, PHOTO_WALL_RAIL_TOP, photoWallLayout } from '../lib/photoWallLayout';

export function HeroPhotoWall({ width, count, layout, cordColor = '#39352F', railTop = PHOTO_WALL_RAIL_TOP + 7 }: { width: number; count: number; cordColor?: string; railTop?: number; layout?: ReturnType<typeof photoWallLayout> }) {
  const { frames } = layout ?? photoWallLayout(width, count);
  const columns = PHOTO_WALL_COLUMNS;
  return <View testID="photo-wall-hardware" pointerEvents="none" style={StyleSheet.absoluteFill}>
    {frames.slice(0, columns).map((frame, column) => {
      const lastIndex = column + Math.floor((count - 1 - column) / columns) * columns;
      const last = frames[lastIndex];
      const top = railTop;
      return <View key={column} style={{ position: 'absolute', left: frame.left + frame.width / 2 - 0.5, top, width: 1, height: last.top + last.height - 12 - top, backgroundColor: cordColor }} />;
    })}
  </View>;
}

export const PHOTO_WALL_HEADER_HEIGHT = PHOTO_WALL_RAIL_TOP + 12;

export function PhotoWallHeader({ width, count }: { width: number; count: number }) {
  const { frames } = photoWallLayout(width, Math.min(count, PHOTO_WALL_COLUMNS));
  return <View style={{ width, height: PHOTO_WALL_HEADER_HEIGHT }}>
    {/* The scrolling cords are clipped at the header boundary. Bridge them behind the rail. */}
    {frames.map((frame, column) => <View key={column} style={{ position: 'absolute', left: frame.left + frame.width / 2 - 0.5, top: 35, bottom: 0, width: 1, backgroundColor: '#39352F' }} />)}
    <View style={{ position: 'absolute', left: 3, right: 3, top: 32, height: Math.max(5, width * 0.018), borderRadius: 8, backgroundColor: '#252321', shadowColor: '#3E2E24', shadowOpacity: 0.38, shadowRadius: 4, shadowOffset: { width: 0, height: 5 }, elevation: 5 }} />
    <DiaryItemImage source={require('../../../../assets/control-illustrations/cherry-black-long-photo-wall.webp')}
      contentFit="fill" style={{ position: 'absolute', top: 28, width, height: width * 496 / 1200 }} />
    {frames.map((frame, column) => <View key={`eyelet-${column}`} style={{ position: 'absolute', left: frame.left + frame.width / 2 - 2, top: 35.5, width: 4, height: 4.5, borderRadius: 2, backgroundColor: '#181715', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 1, shadowOffset: { width: 0.5, height: 1 }, borderWidth: 0.8, borderTopColor: '#D0CBC0', borderLeftColor: '#6C665E', borderRightColor: '#171613', borderBottomColor: '#171613' }} />)}
  </View>;
}

/** Small lacquered metal clip, centered on each hanging cord. */
export function PhotoWallClip() {
  return <DiaryItemImage source={require('../../../../assets/control-illustrations/cherry-photo-clip.webp')} contentFit="contain" style={{ width: 14, height: 14 }} />;
}
