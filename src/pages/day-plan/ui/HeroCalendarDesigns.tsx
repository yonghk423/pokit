import { matchesStoreAccess, type StoreAccessFilter } from '../model/storeAccessFilter';
import { RETIRED_CALENDAR_DESIGNS } from '../model/retiredCalendarDesigns';
import { PHOTO_CALENDARS, freePhotoCalendar } from '../model/freePhotoCalendars';
import { FreePhotoCalendarPaper } from './FreePhotoCalendarPaper';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { installedPaper, installPaper, installDiaryItem, diaryImages, storeDownloadErrorMessage } from '../lib/calendarStoreDownload';
import { PremiumCalendarPaper, premiumPaperRatios } from './PremiumCalendarPaper';
import { isPremiumPaper, premiumCalendarItems } from '../model/premiumCalendarPapers';
import { ThemedText } from '@shared/ui/themed-text';
import { HeroCalendarPhoto } from './HeroCalendarPhoto';
import { WeatherSummary, getCalendarWeatherReport } from './WeatherSummary';
import { weatherCalendarLayout } from '../lib/weatherCalendarLayout';
import { WeatherCalendarHeader } from './WeatherCalendarHeader';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useCalendarWidgetImageReady } from '../model/calendarWidgetRenderReady';
import { HeroClipboardCalendar } from './HeroClipboardCalendar';
import { HeroPolaroidSurface, HeroPhotoEmulsion } from './HeroPolaroidSurface';
import { resolveHeroArtworkUri } from '../lib/heroArtworkUri';
import { AppAlert } from '@shared/lib/app-alert';
import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import { applyHeroCalendarDesign, useHeroCalendarDesign, useHeroCalendarCover, saveHeroCalendarCover } from '../model/heroCalendarDesign';
import { calendarPaperDays, groupCalendarDiaries } from '../lib/heroCalendar';
import type { ComicDiary } from '../lib/heroDiaryStorage';
import { selectCanTestProStoreItems, useSubscriptionStore } from '@features/subscriptions';
import { usePremiumPackPaywall } from './usePremiumPackPaywall';

export const CALENDAR_DESIGNS = [
  ...PHOTO_CALENDARS,
  { id: 'clipboard', name: 'Blue Clipboard', description: translateUiText("주황 보드와 파란 클립의 달력") },
  { id: 'bold', name: 'Bold Month', description: translateUiText("큰 월 제목과 여백이 있는 달력") },
  { id: 'photo', name: 'Photo Paper', description: translateUiText("한 장의 사진을 담은 달력") },
  { id: 'weather', name: 'Weather Calendar', description: translateUiText("현재 날씨와 날짜를 함께 보는 달력") },
  ...premiumCalendarItems,
] as const;
type Design = typeof CALENDAR_DESIGNS[number]['id'] | 'grid' | 'illustration';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const requiresCalendarDownload = (design: string) => isPremiumPaper(design) || design === 'weather';

export { calendarPaperDays } from '../lib/heroCalendar';

export function CalendarPaper({ widgetSize, selectedPreview = false, eventDates = [], design, month, today, diaries, onSelectDate, miniature = false, previewSavedCover = false, layoutHeight, layoutWidth, wallpaper = false, hideMonthHeading = false, onPreviousMonth, onNextMonth }: {
  widgetSize?: 'small' | 'large'; selectedPreview?: boolean; eventDates?: string[]; previewSavedCover?: boolean; wallpaper?: boolean; hideMonthHeading?: boolean; onPreviousMonth?: () => void; onNextMonth?: () => void; layoutHeight?: number; layoutWidth?: number; design: Design; month: Date; today: Date; diaries: ComicDiary[]; onSelectDate?: (date: string) => void; miniature?: boolean;
}) {
  const widgetImageReady = useCalendarWidgetImageReady();
  const [measuredWidth, setWidth] = useState(miniature ? 100 : 330);
  const frameWidth = layoutWidth ?? measuredWidth;
  const framed = !isPremiumPaper(design) && !widgetSize && layoutWidth != null;
  const width = framed ? frameWidth * (miniature ? 1 / 1.28 : 0.94) : frameWidth;
  const frameHeight = layoutHeight;
  if (framed && layoutHeight != null) layoutHeight = layoutHeight * (miniature ? 1 / 1.28 : design === 'weather' ? 1 : 0.94);
  const frame = (content: React.ReactNode) => framed ? <View style={{ width: frameWidth, height: frameHeight, justifyContent: 'center', alignItems: 'center' }}>
    <View style={{ width, borderRadius: design === 'weather' ? width * 18 / 330 : 2, boxShadow: `${width * 0.018}px ${width * 0.025}px ${width * 0.034}px rgba(49,43,36,0.28)` }}>{content}</View>
  </View> : content;
  const scale = Math.min(width / 330, layoutHeight != null ? layoutHeight / 540 : Infinity);
  const dates = calendarPaperDays(month);
  const grouped = groupCalendarDiaries(miniature ? [] : diaries);
  const hasCalendarPhotos = [...grouped.values()].some(records => records.some(diary => diary.scenes.some(scene => !!scene.artworkUri)));
  const weatherLayout = design === 'weather' && !miniature && !widgetSize && layoutHeight != null ? weatherCalendarLayout(width, layoutHeight, dates.length / 7, scale, hasCalendarPhotos) : null;
  const weatherScale = weatherLayout?.headerScale ?? scale;
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const savedPhoto = useHeroCalendarCover(monthKey);
  const photo = miniature && !previewSavedCover ? null : savedPhoto;
  const picking = useRef(false);
  const [busy, setBusy] = useState(false);
  const pickCover = async () => {
    if (picking.current || miniature) return;
    picking.current = true; setBusy(true);
    try {
      const picker = require('expo-image-picker') as typeof import('expo-image-picker');
      const result = await picker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1, presentationStyle: picker.UIImagePickerPresentationStyle.FULL_SCREEN });
      const asset = result.assets?.[0];
      if (!result.canceled && asset) await saveHeroCalendarCover(monthKey, asset.uri, asset.fileName);
    } catch { AppAlert.alert(translateUiText("사진 추가"), translateUiText("사진을 불러오지 못했어요. 다시 시도해주세요.")); }
    finally { picking.current = false; setBusy(false); }
  };
  const isPhoto = design === 'photo', isIllustration = design === 'illustration', isGrid = design === 'grid' || isIllustration;
  const fitted = layoutHeight != null;
  const coverScale = 0.65;
  const photoWidth = Math.min(width - 88 * scale, layoutHeight != null ? layoutHeight * 0.42 / 1.2 : 220 * scale) * coverScale;
  const photoHeight = photoWidth * 1.2 + 25 * scale * coverScale;
  if (freePhotoCalendar(design)) return <FreePhotoCalendarPaper eventDates={eventDates} widgetSize={widgetSize} design={design} width={frameWidth} height={layoutHeight ?? frameWidth * 1.8} month={month} today={today} diaries={diaries} miniature={miniature} onSelectDate={onSelectDate} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} />;
  if (isPremiumPaper(design)) return <PremiumCalendarPaper widgetSize={widgetSize} design={design} month={month} today={today} diaries={miniature ? [] : diaries} eventDates={eventDates} width={width} height={layoutHeight} miniature={miniature} onSelectDate={onSelectDate} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} />;
  if (design === 'clipboard') return frame(<HeroClipboardCalendar width={width} height={layoutHeight} month={month} today={today} miniature={miniature} eventDates={eventDates} recordDates={[...grouped.keys()]} photos={Object.fromEntries([...grouped].flatMap(([key, records]) => { const uri = records.flatMap(record => record.scenes).find(scene => scene.artworkUri)?.artworkUri; return uri ? [[key, uri]] : []; }))} onSelectDate={onSelectDate} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} />);
  const paper = <View testID="calendar-paper" pointerEvents={miniature ? 'none' : 'auto'} onLayout={layoutWidth == null ? e => { const next = e.nativeEvent.layout.width; if (next > 0) setWidth(current => current === next ? current : next); } : undefined} style={[styles.paper, wallpaper && { backgroundColor: framed ? '#FAFAF6' : 'transparent', shadowOpacity: 0, elevation: 0 }, design === 'weather' && { backgroundColor: '#FFFFFF', shadowOpacity: 0, borderRadius: 18 * scale, overflow: 'hidden' }, { padding: 19 * scale, paddingTop: (design === 'weather' && !miniature ? 24 : wallpaper ? 0 : fitted ? 24 : 37) * scale, paddingBottom: (wallpaper ? 6 : 19) * scale, ...(fitted ? { height: weatherLayout?.contentHeight ?? layoutHeight } : {}) }]}>
    {design === 'weather' && <><View testID="weather-calendar-summary">{miniature ? <WeatherCalendarHeader preview scale={weatherScale} /> : widgetSize ? <WeatherCalendarHeader displayLocale="en" report={getCalendarWeatherReport()} scale={weatherScale} /> : <WeatherSummary ink="#50514F" muted="#757671" showUnavailable presentation="calendar" scale={weatherScale} />}</View></>}
    {!wallpaper && design !== 'weather' && <View pointerEvents="none" style={[styles.clip, { width: (design === 'bold' ? 100 : 19) * scale, height: 10 * scale, top: -3 * scale, backgroundColor: isPhoto ? '#A79564' : '#30312F' }]} />}
    {!hideMonthHeading && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: isPhoto ? 'center' : 'space-between', marginBottom: (design === 'weather' ? 10 : wallpaper ? 8 : 22) * scale }}>
      {wallpaper && <Pressable accessibilityRole="button" accessibilityLabel={translateUiText("이전 달")} onPress={() => { tapHaptic('select'); onPreviousMonth?.(); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text allowFontScaling={!miniature} style={{ fontSize: 28, color: '#303330' }}>‹</Text></Pressable>}
      <Text allowFontScaling={!miniature} style={{ color: '#202522', fontSize: (design === 'weather' ? 20 : isPhoto ? 12 : isGrid ? 26 : fitted ? 52 : 68) * scale, fontWeight: isPhoto ? '400' : '700', letterSpacing: isPhoto ? 4 * scale : -1 * scale }}>{isPhoto || isGrid ? MONTHS[month.getMonth()].toUpperCase() : MONTHS[month.getMonth()].slice(0, 3)}</Text>
      {!isPhoto && <Text allowFontScaling={!miniature} style={{ color: widgetSize ? '#30333099' : '#303330', fontSize: (design === 'weather' ? 11 : 19) * scale }}>{month.getFullYear()}</Text>}
      {wallpaper && <Pressable accessibilityRole="button" accessibilityLabel={translateUiText("다음 달")} onPress={() => { tapHaptic('select'); onNextMonth?.(); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text allowFontScaling={!miniature} style={{ fontSize: 28, color: '#303330' }}>›</Text></Pressable>}
    </View>}

    <View style={fitted ? { flex: 1, minHeight: 0 } : undefined}>
    {isPhoto && <Pressable testID="calendar-cover-picker" accessibilityRole="button" accessibilityLabel={photo ? translateUiText("달력 사진 변경") : translateUiText("달력 사진 추가")} accessibilityState={{ busy, disabled: miniature || busy }} disabled={miniature || busy} onPress={() => { void pickCover(); }} style={{ width: photoWidth + 14 * scale * coverScale, height: photoHeight, alignSelf: 'center', marginBottom: 16 * scale, padding: 7 * scale * coverScale, paddingBottom: 18 * scale * coverScale, backgroundColor: '#F1F0EC', shadowColor: '#30342D', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }}>
      <HeroPolaroidSurface />
      <View style={{ flex: 1, backgroundColor: '#E6E7E1', justifyContent: 'center', alignItems: 'center' }}>{photo ? <View testID="calendar-cover-image" style={{ width: '100%', height: '100%' }}><HeroCalendarPhoto key={photo} uri={photo} contain /></View> : <Text allowFontScaling={!miniature} style={{ color: '#747B70', fontSize: Math.max(18, 28 * scale), fontWeight: '300' }}>+</Text>}<HeroPhotoEmulsion /></View>
    </Pressable>}

    <View style={{ flex: 1, minWidth: 0, ...(isPhoto || weatherLayout ? { minHeight: 0 } : fitted ? { height: '100%' } : {}) }}>
    <View style={{ flexDirection: 'row', paddingBottom: 10 * scale }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => <Text key={day} style={{ width: '14.2857%', textAlign: 'center', fontSize: (isPhoto ? 8 : 11) * scale, color: isGrid && i === 6 ? '#995C54' : '#464944' }}>{isPhoto && !widgetSize ? day[0] : day}</Text>)}</View>
    <View style={fitted ? { flex: 1, minHeight: 0 } : undefined}>
    {Array.from({ length: dates.length / 7 }, (_, row) => <View key={row} style={{ flexDirection: 'row', ...(fitted ? { flex: 1, minHeight: 0 } : {}), borderTopWidth: design === 'bold' ? StyleSheet.hairlineWidth : 0, borderColor: '#D1D3CE' }}>
      {dates.slice(row * 7, row * 7 + 7).map(day => {
        const key = getLocalDateKey(day), current = day.getMonth() === month.getMonth();
        const dayPhotos = (grouped.get(key) ?? []).flatMap(diary => diary.scenes).filter(scene => !!scene.artworkUri);
        const thumbnail = dayPhotos[0]?.artworkUri;
        const hasRecord = grouped.has(key), isToday = key === getLocalDateKey(today);
        return <Pressable key={key} disabled={miniature || !onSelectDate} testID={miniature ? undefined : `calendar-paper-day-${key}`} accessibilityRole="button" accessibilityLabel={`${key}${hasRecord ? translateUiText(", 기록 있음") : ''}${eventDates.includes(key) ? translateUiText(", 이벤트 또는 연동 일정 있음") : ''}`} onPress={() => { tapHaptic('select'); onSelectDate?.(key); }} style={({ pressed }) => ({ width: '14.2857%', ...(fitted ? { height: '100%' } : { height: miniature ? (isPhoto ? 25 : isGrid ? 53 : 47) * scale : Math.max(44, (isPhoto ? 25 : isGrid ? 53 : 47) * scale) }), padding: 3 * scale, opacity: pressed ? 0.45 : 1 })}>
          <View style={{ flex: 1, borderWidth: isGrid ? StyleSheet.hairlineWidth : 0, borderColor: isIllustration ? 'rgba(83, 77, 64, 0.32)' : '#BFC3BC', padding: isGrid ? 3 * scale : 0, alignItems: isGrid ? 'flex-start' : 'center', backgroundColor: isIllustration ? 'rgba(255, 250, 240, 0.42)' : 'transparent' }}>
            <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', maxWidth: '100%' }}>
            <Text testID={miniature ? `calendar-preview-date-${key}` : undefined} allowFontScaling={!miniature} numberOfLines={1} style={{ color: current ? '#252A26' : '#C7CAC4', fontSize: fitted && !miniature ? Math.max(12, (design === 'weather' ? 13 : isPhoto ? 12 : isIllustration ? 20 : isGrid ? 12 : 21) * scale) : (design === 'weather' ? 13 : isPhoto ? 9 : isIllustration ? 20 : isGrid ? 12 : 21) * scale, fontWeight: isIllustration || design === 'bold' ? '700' : '400', textDecorationLine: isToday ? 'underline' : 'none' }}>{day.getDate()}</Text>
              {eventDates.includes(key) ? <View pointerEvents="none" testID={`calendar-event-ring-${key}`} style={{ position: 'absolute', top: -2, bottom: -2, left: -6, right: -6, borderRadius: 50, borderWidth: 1.2, borderColor: '#A5644F', transform: [{ rotate: '-8deg' }] }} /> : null}
            </View>
            {isGrid && !isIllustration && current && !thumbnail && <View pointerEvents="none" style={{ width: '100%', flex: 1, justifyContent: 'space-evenly' }}>{[0, 1, 2].map(line => <View key={line} style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#E0E2DC' }} />)}</View>}
            {thumbnail ? <View pointerEvents="none" testID={`calendar-paper-photo-${key}`} style={weatherLayout ? { width: weatherLayout.photoWidth, height: weatherLayout.photoHeight, flexShrink: 0, alignSelf: 'center', marginTop: 2, padding: 2, paddingBottom: 4, backgroundColor: '#FFFEFA' } : isIllustration ? { flex: 1, minHeight: 0, width: '86%', maxWidth: 38 * scale, maxHeight: 48 * scale, alignSelf: 'center', marginTop: 2 * scale, marginBottom: 2 * scale, padding: 2 * scale, paddingBottom: 6 * scale, backgroundColor: '#FFFEFA', shadowColor: '#423B32', shadowOpacity: 0.24, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, transform: [{ rotate: `${((day.getDate() % 3) - 1) * 4}deg` }] } : { ...(isPhoto ? { aspectRatio: 1 / 1.2, flexShrink: 1 } : { flex: 1 }), minHeight: 0, width: '100%', maxWidth: 38 * scale, alignSelf: 'center', marginTop: 2 * scale, marginBottom: 2 * scale, padding: 1, backgroundColor: '#FFFFFF' }}>
              <HeroCalendarPhoto key={thumbnail} uri={resolveHeroArtworkUri(thumbnail)} />
              <Image accessible={false} source={require('../../../../assets/control-illustrations/calendar-white-tape.webp')} resizeMode="contain" style={{ position: 'absolute', top: -5 * scale, alignSelf: 'center', width: weatherLayout ? weatherLayout.photoWidth * .6 : 27 * scale, height: weatherLayout ? 5 : 10 * scale, transform: [{ rotate: '-4deg' }] }} />
            </View> : hasRecord && <View testID={`calendar-paper-record-${key}`} style={{ width: 3 * scale, height: 3 * scale, borderRadius: 2, backgroundColor: '#77816E', position: 'absolute', bottom: 2 * scale, alignSelf: 'center' }} />}
          </View>
        </Pressable>;
      })}
    </View>)}
    </View>
    </View>
    </View>
    {isPhoto && <Text allowFontScaling={!miniature} style={{ textAlign: 'center', fontSize: 9 * scale, color: widgetSize ? '#30333099' : '#85877F', marginTop: (wallpaper ? 6 : 12) * scale }}>{month.getFullYear()}</Text>}
    <View style={{ height: (weatherLayout ? 0 : wallpaper ? 4 : 18) * scale }} />
  </View>;
  return frame(paper);
}

export function HeroCalendarDesigns(props: { accessFilter?: StoreAccessFilter; month: Date; today: Date; diaries: ComicDiary[]; onSelectDate: (date: string) => void }) {
  const lock = useRef(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const selected = useHeroCalendarDesign() ?? 'bold';
  const isPro = useSubscriptionStore(selectCanTestProStoreItems);
  const paywall = usePremiumPackPaywall();
  const { width: windowWidth } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const previewWidth = Math.max(1, Math.floor(((gridWidth ?? windowWidth - 40) - 24) / 3));
  const previewStageHeight = (previewWidth - 8) * 540 / 330 + 8;
  return <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
    <View onLayout={event => setGridWidth(event.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22, alignItems: 'flex-start', justifyContent: 'flex-start' }}>{CALENDAR_DESIGNS.filter(item => !RETIRED_CALENDAR_DESIGNS.has(item.id) && matchesStoreAccess(props.accessFilter ?? 'all', !!(freePhotoCalendar(item.id) as { pro?: boolean } | undefined)?.pro)).map(item => {
      const previewLayoutWidth = previewWidth - 8;
      const previewLayoutHeight = previewLayoutWidth * (isPremiumPaper(item.id) ? premiumPaperRatios[item.id] : item.id === 'clipboard' ? 1340 / 914 : 540 / 330);
      // The clipboard artwork starts 25 reference pixels below its canvas.
      // Align its visible clip with the paper calendars' top clip edge.
      const previewTop = item.id === 'clipboard' ? -(25 / 1340 * previewLayoutHeight + 3 / 330 * previewLayoutWidth) : 0;
      const downloadable = requiresCalendarDownload(item.id);
      const installed = downloadable && !!installedPaper(item.id);
      const photoTheme = freePhotoCalendar(item.id);
      const proTheme = !!photoTheme && 'pro' in photoTheme && photoTheme.pro;
      const applied = selected === item.id && (!proTheme || (isPro && !!diaryImages(item.id)?.image)) && (!downloadable || installed);
      const status = downloading === item.id ? translateUiText("다운로드 중") : applied ? translateUiText("적용 중") : proTheme ? (isPro ? 'Pro · 선택하기' : 'Pro') : downloadable ? installed ? translateUiText("무료 · 적용하기") : translateUiText("무료 · 다운로드") : translateUiText("무료");
      return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.name}, ${status}, ${item.description}`} accessibilityState={{ selected: selected === item.id, disabled: applied || !!downloading }} disabled={applied || !!downloading} onPress={async () => {
        if (lock.current) return;
        lock.current = true;
        try {
        tapHaptic('select');
        if (proTheme && !isPro) {
          const result = await paywall.present();
          if ((result !== 'purchased' && result !== 'restored') || !selectCanTestProStoreItems(useSubscriptionStore.getState())) return;
        }
        if (proTheme) {
          setDownloading(item.id);
          await installDiaryItem(item.id);
        }
        if (downloadable && !installed) {
          setDownloading(item.id);
          await installPaper(item.id);
        }
        applyHeroCalendarDesign(item.id);
        } catch (error) {
          AppAlert.alert(translateUiText("다운로드 실패"), storeDownloadErrorMessage(error));
        } finally {
          lock.current = false;
          setDownloading(null);
        }
      }} style={{ width: previewWidth }}>
      <View pointerEvents="none" style={{ padding: 4, height: isPremiumPaper(item.id) ? previewLayoutHeight + 8 : previewStageHeight, justifyContent: 'flex-start' }}><View style={{ top: previewTop }}><CalendarPaper {...props} design={item.id} miniature layoutWidth={previewLayoutWidth} layoutHeight={previewLayoutHeight} /></View></View>
      <View style={styles.caption}><ThemedText style={styles.label}>{item.name}</ThemedText><ThemedText style={[styles.free, selected === item.id && { color: '#278B77' }]}>{status}</ThemedText></View>
    </Pressable>;
    })}</View>
    {paywall.modal}
  </ScrollView>;
}
const styles = StyleSheet.create({
  paper: { backgroundColor: '#FAFAF6', shadowColor: '#34362E', shadowOpacity: 0.15, shadowRadius: 5, shadowOffset: { width: 1, height: 4 }, elevation: 3 },
  clip: { position: 'absolute', alignSelf: 'center', borderRadius: 1 },
  caption: { marginTop: 8, minHeight: 51, gap: 2 },
  label: { fontSize: 10, lineHeight: 14, color: '#3E4439', textAlign: 'center' },
  free: { minHeight: 18, lineHeight: 18, fontSize: 11, color: '#73796C', textAlign: 'center' },
});
