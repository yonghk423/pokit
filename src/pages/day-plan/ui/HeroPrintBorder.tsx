import { useState } from 'react';
import { View } from 'react-native';
import { DiaryItemImage } from './DiaryItemImage';
import { useDiaryTheme } from '../model/diaryTheme';
import { diaryImages } from '../lib/calendarStoreDownload';

const parts = {
  tl: {left:0,top:0,width:24,height:24},
  tr: {right:0,top:0,width:24,height:24},
  bl: {left:0,bottom:0,width:24,height:24},
  br: {right:0,bottom:0,width:24,height:24},
  top: {left:24,right:24,top:0,height:24},
  bottom: {left:24,right:24,bottom:0,height:24},
  left: {left:0,top:24,bottom:24,width:24},
  right: {right:0,top:24,bottom:24,width:24},
} as const;
/** Edges follow the full print, preserving corner sizes at every photo ratio. */
export function HeroPrintBorder() {
  const [width, setWidth] = useState(200);
  const corner = Math.min(24, width * 0.12);
  const inset = corner / 3;
  const theme = useDiaryTheme('frame');
  const images = theme?.id ? diaryImages(theme.id) : undefined;
  if (!images) return null;
  return <View pointerEvents="none" accessible={false} onLayout={event => setWidth(event.nativeEvent.layout.width)} style={{position:'absolute',left:-inset,right:-inset,top:-inset,bottom:-inset}}>
    {Object.entries(parts).map(([role, style]) => images[role] ? <DiaryItemImage key={role} source={{uri:images[role]}} contentFit="fill" style={{position:'absolute',...Object.fromEntries(Object.entries(style).map(([key, value]) => [key, value === 24 ? corner : value]))}} /> : null)}
  </View>;
}
