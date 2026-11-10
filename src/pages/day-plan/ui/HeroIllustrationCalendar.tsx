import { HeroCalendarPhoto } from './HeroCalendarPhoto';
import { CalendarPaper } from './HeroCalendarDesigns';
import { applyHeroCalendarDesign, CITY_CALENDAR_THEMES, readHeroCalendarDesign } from '../model/heroCalendarDesign';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useCalendarWidgetImageReady } from '../model/calendarWidgetRenderReady';
import { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Platform, Pressable, Text, View } from 'react-native';
import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import { CALENDAR_CONTRAST } from '../lib/illustrationCalendarContrast';
import { calendarCellContents, calendarRegionFrame, fitCalendarArtwork } from '../lib/illustrationCalendarGeometry';
import { CALENDAR_ARTWORK_LAYOUTS, CALENDAR_GRID_LAYOUTS } from '../lib/illustrationCalendarLayouts';
import { getLoadedIllustrationCalendarAssets, loadIllustrationCalendarAssets, type CalendarAssets } from '../lib/illustrationCalendarAssets';
import { resolveHeroArtworkUri } from '../lib/heroArtworkUri';
import { groupCalendarDiaries } from '../lib/heroCalendar';
import type { ComicDiary } from '../lib/heroDiaryStorage';

const SERIF = Platform.OS === 'ios' ? 'Baskerville' : 'serif';
const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DEFAULT_THEME = '01-rush-hour-commute';
export const LAYOUTS = CALENDAR_GRID_LAYOUTS;

export function illustrationCellFrame(themeId: string, slot: number, width: number, height: number) {
  const [left, top, gridWidth, gridHeight] = LAYOUTS[themeId] ?? LAYOUTS[DEFAULT_THEME];
  const row = Math.floor(slot / 7), col = slot % 7;
  return { left: (left + col * gridWidth / 7) * width, top: (top + row * gridHeight / 6) * height, width: gridWidth / 7 * width, height: gridHeight / 6 * height };
}

export function illustrationMonthCells(month: Date) {
  const year = month.getFullYear(), m = month.getMonth();
  const offset = (new Date(year, m, 1, 12).getDay() + 6) % 7;
  const count = new Date(year, m + 1, 0, 12).getDate();
  return Array.from({ length: 42 }, (_, slot) => {
    const day = slot - offset + 1;
    return day > 0 && day <= count ? new Date(year, m, day, 12) : null;
  });
}

type Props = {
  bottomInset?: number;
  eventDates?: string[];
  width: number;
  height: number;
  month: Date;
  today: Date;
  diaries: ComicDiary[];
  hideMonthHeading?: boolean;
  themeId?: string;
  topInset?: number;
  onSelectDate: (date: string) => void;
  onMoveMonth?: (delta: number) => void;
  onNavigate?: (tab: 'history' | 'index') => void;
  onChangeMode?: () => void;
};

export function HeroIllustrationCalendar(props: Props) {
  const themeId = props.themeId ?? DEFAULT_THEME;
  const [loaded, setLoaded] = useState(() => ({ themeId, assets: getLoadedIllustrationCalendarAssets(themeId) }));
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setFailed(false);
    loadIllustrationCalendarAssets(themeId).then(assets => { if (active) setLoaded({ themeId, assets }); }).catch(() => {
      if (!active) return;
      setFailed(true);
      const selected = readHeroCalendarDesign();
      const selectedTheme = CITY_CALENDAR_THEMES.find(theme => theme.design === selected)?.themeId;
      // A missing gallery preview must not reset a different, working selection.
      if (selectedTheme === themeId || selected === 'illustration') applyHeroCalendarDesign('bold');
    });
    return () => { active = false; };
  }, [themeId]);
  const assets = loaded.themeId === themeId ? loaded.assets : getLoadedIllustrationCalendarAssets(themeId);
  if (failed) return <CalendarPaper design="bold" month={props.month} today={props.today} diaries={props.diaries} eventDates={props.eventDates} onSelectDate={props.onSelectDate} onPreviousMonth={() => props.onMoveMonth?.(-1)} onNextMonth={() => props.onMoveMonth?.(1)} layoutWidth={props.width} layoutHeight={Math.max(1, props.height - (props.bottomInset ?? 0))} wallpaper hideMonthHeading={props.hideMonthHeading} />;
  if (!assets) return <View style={{ width: props.width, height: props.height, backgroundColor: '#F7F6F4' }} />;
  const frame = fitCalendarArtwork(themeId, props.width, props.height, props.topInset, props.bottomInset);
  return <View style={{ width: props.width, height: props.height, backgroundColor: '#F7F6F4', overflow: 'hidden' }}>
    <View testID="illustration-calendar-frame" style={{ position: 'absolute', ...frame }}>
      <ArtworkCalendar {...props} themeId={themeId} assets={assets} width={frame.width} height={frame.height} />
    </View>
  </View>;
}

/** Artwork, headers, dates, photos and hit areas share the same calibrated source coordinates. */
function ArtworkCalendar({ assets, eventDates = [], width, height, month, today, diaries, onSelectDate, onMoveMonth, hideMonthHeading = false, themeId = DEFAULT_THEME }: Props & { assets: CalendarAssets }) {
  const layout = CALENDAR_ARTWORK_LAYOUTS[themeId] ?? CALENDAR_ARTWORK_LAYOUTS[DEFAULT_THEME];
  const title = calendarRegionFrame(layout.month, width, height);
  const weekdays = calendarRegionFrame(layout.weekdays, width, height);
  const contrast = CALENDAR_CONTRAST[themeId];
  const titleInk = contrast?.title ?? '#28231D';
  const textContrast = (color: string) => ({ color, textShadowColor: color === '#FFF8E8' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.35)', textShadowRadius: 1, textShadowOffset: { width: 0, height: 0 } });
  const titleFontSize = Math.min(26, title.height * .72, title.width * .075);
  const weekdaySize = Math.min(13, weekdays.height * .74, weekdays.width / 7 * .28);
  const grouped = groupCalendarDiaries(diaries);
  const events = new Set(eventDates);
  const widgetImageReady = useCalendarWidgetImageReady();
  const background = { uri: assets.background };

  return <View testID="illustration-calendar-test" style={{ width, height, overflow: 'hidden' }}>
    <Image onLoad={widgetImageReady} testID="illustration-calendar-artwork" pointerEvents="none" source={background} cachePolicy="memory" transition={0} priority="high" contentFit="fill" style={{ position: 'absolute', width, height }} />
    {!hideMonthHeading && <View testID="illustration-calendar-heading" style={{ position: 'absolute', ...title, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={() => { tapHaptic('select'); onMoveMonth?.(-1); }} hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }} style={{ minWidth: 30, height: '100%', justifyContent: 'center', alignItems: 'center' }}><Text allowFontScaling={false} style={{ ...textContrast(titleInk), fontFamily: SERIF, fontSize: titleFontSize }}>‹</Text></Pressable>
      <Text allowFontScaling={false} style={{ ...textContrast(titleInk), fontFamily: SERIF, fontSize: titleFontSize, lineHeight: title.height, letterSpacing: .3, includeFontPadding: false }}>{month.getFullYear()}.{String(month.getMonth() + 1).padStart(2, '0')}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="다음 달" onPress={() => { tapHaptic('select'); onMoveMonth?.(1); }} hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }} style={{ minWidth: 30, height: '100%', justifyContent: 'center', alignItems: 'center' }}><Text allowFontScaling={false} style={{ ...textContrast(titleInk), fontFamily: SERIF, fontSize: titleFontSize }}>›</Text></Pressable>
    </View>}
    <View testID="illustration-calendar-weekdays" pointerEvents="none" style={{ position: 'absolute', ...weekdays, flexDirection: 'row', alignItems: 'center' }}>
      {WEEKDAYS.map((day, col) => <Text key={day} allowFontScaling={false} style={{ ...textContrast(contrast?.weekdays[col] ?? titleInk), fontFamily: SERIF, lineHeight: weekdays.height, width: `${100 / 7}%`, textAlign: 'center', fontSize: weekdaySize, includeFontPadding: false }}>{day}</Text>)}
    </View>
    {illustrationMonthCells(month).map((day, slot) => {
      if (!day) return null;
      const col = slot % 7;
      const frame = illustrationCellFrame(themeId, slot, width, height);
      const ink = contrast?.dates[slot] ?? titleInk;
      const content = calendarCellContents(frame.width, frame.height);
      const key = getLocalDateKey(day);
      const records = grouped.get(key) ?? [];
      const artwork = records.flatMap(record => record.scenes).find(scene => scene.artworkUri)?.artworkUri;
      const selected = key === getLocalDateKey(today);
      return <Pressable key={key} testID={`illustration-calendar-day-${key}`} accessibilityRole="button" accessibilityLabel={`${key}${records.length ? ', 기록 있음' : ''}${events.has(key) ? ', 이벤트 또는 연동 일정 있음' : ''}`} accessibilityState={{ selected }} onPress={() => { tapHaptic('select'); onSelectDate(key); }} style={({ pressed }) => ({ position: 'absolute', ...frame, opacity: pressed ? .7 : 1 })}>
        <Text testID={`illustration-calendar-number-${key}`} pointerEvents="none" allowFontScaling={false} style={{ ...textContrast(ink), position: 'absolute', left: 0, top: content.numberTop, width: '100%', height: content.numberHeight, fontFamily: SERIF, textAlign: 'center', fontSize: content.numberSize, lineHeight: content.numberHeight, includeFontPadding: false, fontWeight: selected ? '700' : '400' }}>{day.getDate()}</Text>
        {events.has(key) ? <View pointerEvents="none" testID={`illustration-event-ring-${key}`} style={{ position: 'absolute', top: content.numberTop - content.numberSize * .06, left: (frame.width - content.numberSize * 1.6) / 2, width: content.numberSize * 1.6, height: content.numberHeight + content.numberSize * .12, borderRadius: 50, borderWidth: 1.3, borderColor: ink === '#FFF8E8' ? '#FFD294' : '#9B3E25', transform: [{ rotate: '-8deg' }] }} /> : null}
        {artwork ? <View pointerEvents="none" testID={`illustration-calendar-polaroid-${key}`} style={{ position: 'absolute', left: (frame.width - content.photoWidth) / 2, top: content.photoTop, width: content.photoWidth, height: content.photoHeight, elevation: 2, padding: content.photoHeight * .055, paddingBottom: content.photoHeight * .16, backgroundColor: '#fff9e9', shadowColor: '#251c14', shadowOpacity: .32, shadowRadius: 1, shadowOffset: { width: 0, height: 1 }, transform: [{ rotate: `${col % 2 ? -4 : 4}deg` }] }}>
          <HeroCalendarPhoto key={artwork} uri={resolveHeroArtworkUri(artwork)} />
          <Image onLoad={widgetImageReady} source={{ uri: assets.leaf }} cachePolicy="memory" transition={0} contentFit="contain" style={{ position: 'absolute', width: '25%', height: '16%', top: '-5%', left: '12%' }} />
        </View> : null}
      </Pressable>;
    })}
  </View>;
}
