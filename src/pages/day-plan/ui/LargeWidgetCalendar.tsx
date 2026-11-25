import { Image } from 'expo-image';
import { useEffect, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import { formatWeekdayShort } from '@shared/lib/i18n';
import { calendarPaperDays, groupCalendarDiaries } from '../lib/heroCalendar';
import { resolveHeroArtworkUri } from '../lib/heroArtworkUri';
import type { ComicDiary } from '../lib/heroDiaryStorage';
import type { HeroCalendarDesign } from '../model/heroCalendarDesign';
import type { WidgetArtwork } from '../model/largeWidgetArtwork';
import { useCalendarWidgetImageReady } from '../model/calendarWidgetRenderReady';
import { HeroCalendarPhoto } from './HeroCalendarPhoto';
import { getCalendarWeatherReport, subscribeCalendarWeather } from './WeatherSummary';
import { WeatherCalendarHeader } from './WeatherCalendarHeader';

function WidgetWeather() {
  const report = useSyncExternalStore(subscribeCalendarWeather, getCalendarWeatherReport);
  const refresh = useCalendarWidgetImageReady();
  useEffect(() => { refresh?.(); }, [report, refresh]);
  return <View style={styles.weather}><WeatherCalendarHeader displayLocale="en" report={report} scale={0.38} /></View>;
}

type Props = {
  artwork: WidgetArtwork;
  design: HeroCalendarDesign;
  month: Date;
  today: Date;
  diaries: ComicDiary[];
  eventDates: string[];
  onBackgroundDisplay: () => void;
};

// The canvas shares the native large-widget snapshot's 330 × 346 aspect ratio.
export function LargeWidgetCalendar({ artwork, design, month, today, diaries, eventDates, onBackgroundDisplay }: Props) {
  const days = calendarPaperDays(month);
  const grouped = groupCalendarDiaries(diaries);
  const events = new Set(eventDates);
  const todayKey = getLocalDateKey(today);
  const ink = artwork.ink;
  const citypop = design.startsWith('citypop-retro-');
  const contrast = artwork.badge ?? '#fffaf1';
  const eventColor = artwork.eventRing ?? '#a24532';
  const leftTitle = ['mono-cafe', 'lemon-slice', 'mint-sneakers', 'soft-mint', 'spiral-plan', 'weather'].includes(design);
  const centered = design === 'kraft-clip' || design === 'ivory-paper';
  const year = <Text style={[styles.year, { color: ink + '99' }]}>{month.getFullYear()}</Text>;
  const namedMonth = centered || design === 'spiral-plan' || design === 'soft-mint';
  const watercolor = design.startsWith('textured-watercolor-');
  const monthSuffix = watercolor
    ? ' ' + month.toLocaleDateString('en-US', { month: 'short' })
    : '.' + String(month.getMonth() + 1).padStart(2, '0');
  const title = namedMonth
    ? <>{month.toLocaleDateString('en-US', { month: 'long' })} {year}</>
    : <>{year}{monthSuffix}</>;
  return <View style={styles.canvas}>
    <Image testID="large-widget-background" source={artwork.source} style={StyleSheet.absoluteFill} contentFit="fill" transition={0} onDisplay={onBackgroundDisplay} />
    {design === 'weather' && <WidgetWeather />}
    <View style={[styles.heading, artwork.headingHeight !== undefined && { height: artwork.headingHeight }, leftTitle && styles.left, centered && styles.center, citypop && styles.citypopHeading]}>
      {design === 'bold'
        ? <View style={styles.boldHeading}><Text allowFontScaling={false} style={[styles.boldMonth, { color: ink }]}>{month.toLocaleDateString('en-US', { month: 'short' })}</Text><Text allowFontScaling={false}>{year}</Text></View>
        : <Text allowFontScaling={false} numberOfLines={1} style={[styles.month, watercolor && styles.watercolorMonth, { color: ink }]}>{title}</Text>}
    </View>
    <View style={styles.weekdays}>{days.slice(0, 7).map(day => <Text key={day.getDay()} allowFontScaling={false} style={[styles.weekday, { color: ink }]}>{formatWeekdayShort(day, 'en')}</Text>)}</View>
    <View style={styles.grid}>{Array.from({ length: days.length / 7 }, (_, row) =>
      <View key={row} style={styles.week}>{days.slice(row * 7, row * 7 + 7).map(day => {
        const key = getLocalDateKey(day);
        if (day.getMonth() !== month.getMonth()) return <View key={key} style={styles.cell} />;
        const records = grouped.get(key);
        const uri = records?.flatMap(entry => entry.scenes).find(scene => scene.artworkUri)?.artworkUri;
        const selected = todayKey === key;
        return <View key={key} style={styles.cell}>
          {uri && <View style={styles.photo}><HeroCalendarPhoto uri={resolveHeroArtworkUri(uri)} /></View>}
          <View testID={'widget-date-' + key} style={[styles.numberBox, !!uri && styles.photoLabel, !!uri && { backgroundColor: contrast }, selected && { backgroundColor: ink }]}>
            <Text allowFontScaling={false} style={[styles.number, !!uri && styles.smallNumber, { color: selected ? contrast : ink }]}>{day.getDate()}</Text>
          </View>
          {events.has(key) && <View testID={'widget-event-' + key} style={[styles.eventRing, citypop && styles.citypopRing, !!uri && styles.photoEvent, { borderColor: eventColor }]} />}
          {!!records?.length && !uri && <View style={[styles.recordDot, { backgroundColor: ink }]} />}
        </View>;
      })}</View>)}</View>
  </View>;
}

const styles = StyleSheet.create({
  canvas: { width: 330, height: 346 },
  heading: { height: 130, paddingHorizontal: 16, paddingBottom: 4, alignItems: 'flex-end', justifyContent: 'flex-end' },
  citypopHeading: { height: 172, paddingTop: 14, justifyContent: 'flex-start' },
  left: { alignItems: 'flex-start' }, center: { alignItems: 'center' },
  month: { fontSize: 18, lineHeight: 25, fontWeight: '500', fontVariant: ['tabular-nums'] },
  watercolorMonth: { fontSize: 22, lineHeight: 28, fontWeight: '400' },
  year: { fontSize: 14, fontWeight: '400' },
  boldHeading: { width: '100%', flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  boldMonth: { fontSize: 46, fontWeight: '700' },
  weather: { position: 'absolute', top: 1, right: 8, width: 160 },
  weekdays: { flexDirection: 'row', paddingHorizontal: 7, height: 24, alignItems: 'center' },
  weekday: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '500' },
  grid: { flex: 1, paddingHorizontal: 7, paddingBottom: 6 },
  week: { flex: 1, flexDirection: 'row' }, cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  numberBox: { borderRadius: 14, minWidth: 27, height: 24, alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 20, lineHeight: 24, fontVariant: ['tabular-nums'] },
  recordDot: { position: 'absolute', bottom: 1, width: 3, height: 3, borderRadius: 2 },
  eventRing: { position: 'absolute', width: 32, height: 27, borderRadius: 16, borderWidth: 1.5 },
  citypopRing: { width: 29, height: 23, borderWidth: 1.3 },
  photo: { position: 'absolute', width: 35, height: '95%', maxHeight: 35, backgroundColor: '#fff', padding: 1 },
  photoLabel: { position: 'absolute', bottom: 0, right: 1, minWidth: 19, height: 16, borderRadius: 8 },
  smallNumber: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  photoEvent: { bottom: 0, right: 0, width: 22, height: 18 },
});
