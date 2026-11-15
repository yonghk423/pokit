import { DiaryItemImage } from './DiaryItemImage';
import { View, StyleSheet, type ImageStyle } from 'react-native';
import { useDiaryTheme, type ThemeSlot } from '../model/diaryTheme';
export function ProDiaryDecoration({slot, style}: {slot: ThemeSlot; style: ImageStyle}) {
  const item = useDiaryTheme(slot);
  if (!item) return null;
  return <View accessible={false} pointerEvents="none" style={StyleSheet.absoluteFill}>
    <DiaryItemImage source={item.source} contentFit="contain" style={[{ position: 'absolute' }, style]} />
  </View>;
}
export function PhotoDecorations() {
  return <>
    <ProDiaryDecoration slot="mark" style={{ top: 0, right: 4, width: 21, height: 36 }} />
    <ProDiaryDecoration slot="corner" style={{ top: 0, left: 0, width: 30, height: 30 }} />
    <ProDiaryDecoration slot="pin" style={{ top: 0, left: '42%', width: 23, height: 23 }} />
    <ProDiaryDecoration slot="charm" style={{ bottom: 0, right: 0, width: 22, height: 33 }} />
  </>;
}
