import { HeroCalendarPhoto } from './HeroCalendarPhoto';
import { resolveHeroArtworkUri } from '../lib/heroArtworkUri';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useCalendarWidgetImageReady } from '../model/calendarWidgetRenderReady';
import { Image, Pressable, Text, View } from 'react-native';
import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';

/** All overlay coordinates share the artwork's 1024 × 1536 reference frame. */
export function HeroClipboardCalendar({ width, height, month, today, miniature, eventDates, recordDates, photos = {}, onSelectDate, onPreviousMonth, onNextMonth }: {
  photos?: Record<string, string>; width: number; height?: number; month: Date; today: Date; miniature: boolean; eventDates: string[]; recordDates: string[]; onSelectDate?: (date: string) => void; onPreviousMonth?: () => void; onNextMonth?: () => void;
}) {
  const widgetImageReady = useCalendarWidgetImageReady();
  // Fill the available calendar canvas. Artwork and hit targets share the same
  // transform, so resizing never separates dates from the printed grid.
  const s = width / 914;
  const w = width, h = 1340 * s;
  const canvasHeight = height ?? h;
  const verticalScale = canvasHeight / h;
  const offset = (new Date(month.getFullYear(), month.getMonth(), 1, 12).getDay() + 6) % 7;
  const blue = '#1826AD';
  return <View testID="clipboard-calendar" style={{ width, height: canvasHeight, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ width: w, height: h, transform: [{ scaleY: verticalScale }] }}>
      <View style={{ position: 'absolute', left: -55 * s, top: -112 * s, width: 1024 * s, height: 1536 * s }}>
      {/* Clip the source photograph to the board and metal clip; no tabletop is painted. */}
      {[{ x: 55, y: 153, width: 914, height: 1298, radius: 62 }, { x: 385, y: 137, width: 252, height: 78, radius: 14 }, { x: 326, y: 184, width: 371, height: 76, radius: 20 }].map((part, index) => <View key={index} pointerEvents="none" style={{ position: 'absolute', left: part.x * s, top: part.y * s, width: part.width * s, height: part.height * s, borderRadius: part.radius * s, overflow: 'hidden' }}><Image onLoad={widgetImageReady} source={require('../../../../assets/control-illustrations/clipboard-calendar-v2.webp')} resizeMode="stretch" style={{ position: 'absolute', left: -part.x * s, top: -part.y * s, width: 1024 * s, height: 1536 * s }} /></View>)}
      <View style={{ position: 'absolute', left: 115 * s, top: 280 * s, width: 792 * s, height: 155 * s, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable disabled={miniature} accessibilityLabel="이전 달" accessibilityRole="button" onPress={() => { tapHaptic('select'); onPreviousMonth?.(); }} style={{ padding: 12 * s }}><Text style={{ color: blue, fontSize: 40 * s }}>‹</Text></Pressable>
        <View style={{ flex: 1 }}><Text style={{ color: blue, fontWeight: '800', fontSize: 78 * s }}>{month.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text><Text style={{ color: blue, fontSize: 26 * s }}>{month.getFullYear()}</Text></View>
        <Pressable disabled={miniature} accessibilityLabel="다음 달" accessibilityRole="button" onPress={() => { tapHaptic('select'); onNextMonth?.(); }} style={{ padding: 12 * s }}><Text style={{ color: blue, fontSize: 40 * s }}>›</Text></Pressable>
      </View>
      <View style={{ position: 'absolute', left: 115 * s, top: 461 * s, width: 792 * s, flexDirection: 'row' }}>{['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(label => <Text key={label} style={{ width: '14.285714%', textAlign: 'center', color: blue, fontWeight: '700', fontSize: 22 * s }}>{label}</Text>)}</View>
      <View style={{ position: 'absolute', left: 115 * s, top: 548 * s, width: 792 * s, height: 787 * s, flexDirection: 'row', flexWrap: 'wrap' }}>
        {Array.from({ length: 42 }, (_, i) => {
          const day = new Date(month.getFullYear(), month.getMonth(), i - offset + 1, 12), key = getLocalDateKey(day), current = day.getMonth() === month.getMonth();
          return <Pressable key={key} testID={`clipboard-day-${key}`} accessibilityRole="button" accessibilityLabel={key} disabled={miniature || !onSelectDate} onPress={() => { tapHaptic('select'); onSelectDate?.(key); }} style={{ width: 792 * s / 7, height: 787 * s / 6, padding: 7 * s, alignItems: 'flex-end' }}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: blue, opacity: current ? 1 : 0.3, fontSize: 25 * s, fontWeight: '600', textDecorationLine: key === getLocalDateKey(today) ? 'underline' : 'none' }}>{day.getDate()}</Text>
              {!miniature && (recordDates.includes(key) || eventDates.includes(key)) ? <View pointerEvents="none" testID={`clipboard-date-ring-${key}`} style={{ position: 'absolute', top: -4 * s, bottom: -4 * s, left: -9 * s, right: -9 * s, borderRadius: 50, borderWidth: Math.max(1, 2 * s), borderColor: '#C85B43' }} /> : null}
            </View>
            {photos[key] ? <View pointerEvents="none" testID={`clipboard-photo-${key}`} style={{ position: 'absolute', left: 10 * s, top: 38 * s, width: (792 / 7 - 20) * s, height: (787 / 6 - 46) * s, padding: 2 * s, paddingBottom: 6 * s, backgroundColor: '#FFFFFF' }}><HeroCalendarPhoto key={photos[key]} uri={resolveHeroArtworkUri(photos[key])} /></View> : null}
          </Pressable>;
        })}
      </View>
      </View>
    </View>
  </View>;
}
