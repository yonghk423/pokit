import { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useAppFontSizeScale, useEffectiveAppFontId, scaleTypeSize, resolveAppFontMinLineHeight } from '@shared/lib/ui-font';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { rhythmCardDate } from '../lib/mateCardDate';
import type { CircularRoutineItem } from './CircularRoutineTimetable';

export function MateGridCard({ item, width, height, isDark }: { item: CircularRoutineItem; width: number; height: number; isDark: boolean }) {
  const ink = item.inkColor ?? '#000000';
  const date = rhythmCardDate(item.dateKey);
  const scale = width / 120;
  const appScale = useAppFontSizeScale();
  const fontId = useEffectiveAppFontId();
  const { fontScale } = useWindowDimensions();
  const [bodyHeight, setBodyHeight] = useState(0);
  const lineHeight = Math.max(scaleTypeSize(15 * scale, appScale), resolveAppFontMinLineHeight(fontId, scaleTypeSize(10 * scale, appScale))) * fontScale;
  const bodyLines = Math.max(1, Math.floor(bodyHeight / lineHeight));
  const summary = item.summaryLines?.length ? item.summaryLines.join('\n') : item.summary;
  const body = [summary, item.summaryFoot].filter(Boolean).join('\n\n');
  return <View style={{ width, height, backgroundColor: item.faceColor ?? (isDark ? '#363D36' : '#FFFFFF'), borderRadius: 10, overflow: 'hidden', padding: 10 * scale }}>
    <PaperGrain opacity={0.2} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 * scale }}>
      <IconSymbol name={item.icon} size={38 * scale} color={ink} />
      {date && <View style={{ alignItems: 'flex-end' }}><ThemedText style={{ color: ink, fontSize: 22 * scale, lineHeight: 26 * scale }}>{date.day}</ThemedText><ThemedText style={{ color: ink, fontSize: 7 * scale, lineHeight: 12 * scale }}>{date.monthYear}</ThemedText></View>}
    </View>
    <ThemedText numberOfLines={2} ellipsizeMode="tail" style={{ color: ink, fontSize: 12 * scale, lineHeight: 17 * scale, marginBottom: 12 * scale }}>{item.label}</ThemedText>
    <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }} onLayout={({ nativeEvent: { layout } }) => setBodyHeight(previous => previous === layout.height ? previous : layout.height)}>
      {body ? <ThemedText numberOfLines={bodyLines} ellipsizeMode="tail" style={{ color: ink, fontSize: 10 * scale, lineHeight: 15 * scale }}>{body}</ThemedText> : null}
    </View>
  </View>;
}
