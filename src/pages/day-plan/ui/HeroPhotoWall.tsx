import { DiaryItemImage } from './DiaryItemImage';
import { StyleSheet, View } from 'react-native';
import { PHOTO_WALL_COLUMNS, PHOTO_WALL_RAIL_TOP, photoWallLayout } from '../lib/photoWallLayout';

export function HeroPhotoWall({ width, count, layout, cordColor = '#75604E' }: { width: number; count: number; cordColor?: string; layout?: ReturnType<typeof photoWallLayout> }) {
  const { frames } = layout ?? photoWallLayout(width, count);
  const columns = PHOTO_WALL_COLUMNS;
  return <View testID="photo-wall-hardware" pointerEvents="none" style={StyleSheet.absoluteFill}>
    {frames.slice(0, columns).map((frame, column) => {
      const lastIndex = column + Math.floor((count - 1 - column) / columns) * columns;
      const last = frames[lastIndex];
      const top = PHOTO_WALL_RAIL_TOP + 7;
      return <View key={column} style={{ position: 'absolute', left: frame.left + frame.width / 2 - 0.5, top, width: 1, height: last.top + last.height - 12 - top, backgroundColor: cordColor }} />;
    })}
  </View>;
}

export const PHOTO_WALL_HEADER_HEIGHT = PHOTO_WALL_RAIL_TOP + 12;

export function PhotoWallHeader({ width }: { width: number }) {
  return <DiaryItemImage source={require('../../../../assets/control-illustrations/walnut-photo-wall.webp')}
    contentFit="fill" style={{ width, height: PHOTO_WALL_HEADER_HEIGHT }} />;
}
