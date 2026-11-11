import { HeroCalendarPhoto } from './HeroCalendarPhoto';
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
import { groupCalendarDiaries } from '../lib/heroCalendar';
import type { ComicDiary } from '../lib/heroDiaryStorage';

export const CALENDAR_DESIGNS = [
  { id: 'clipboard', name: 'Blue Clipboard', description: '주황 보드와 파란 클립의 달력' },
  { id: 'bold', name: 'Bold Month', description: '큰 월 제목과 여백이 있는 달력' },
  { id: 'photo', name: 'Photo Paper', description: '한 장의 사진을 담은 달력' },
] as const;
type Design = typeof CALENDAR_DESIGNS[number]['id'] | 'grid' | 'illustration';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Monday-first dates, including muted neighbouring days to preserve the paper grid. */
export function calendarPaperDays(month: Date) {
  const year = month.getFullYear(), index = month.getMonth();
  const offset = (new Date(year, index, 1, 12).getDay() + 6) % 7;
  const count = new Date(year, index + 1, 0, 12).getDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, i) => new Date(year, index, i - offset + 1, 12));
}


export function CalendarPaper({ selectedPreview = false, eventDates = [], design, month, today, diaries, onSelectDate, miniature = false, previewSavedCover = false, layoutHeight, layoutWidth, wallpaper = false, hideMonthHeading = false, onPreviousMonth, onNextMonth }: {
  selectedPreview?: boolean; eventDates?: string[]; previewSavedCover?: boolean; wallpaper?: boolean; hideMonthHeading?: boolean; onPreviousMonth?: () => void; onNextMonth?: () => void; layoutHeight?: number; layoutWidth?: number; design: Design; month: Date; today: Date; diaries: ComicDiary[]; onSelectDate?: (date: string) => void; miniature?: boolean;
}) {
  const widgetImageReady = useCalendarWidgetImageReady();
  const [measuredWidth, setWidth] = useState(miniature ? 100 : 330);
  const width = layoutWidth ?? measuredWidth;
  const scale = Math.min(width / 330, layoutHeight != null ? layoutHeight / 540 : Infinity);
  const dates = calendarPaperDays(month);
  const grouped = groupCalendarDiaries(miniature ? [] : diaries);
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
    } catch { AppAlert.alert('사진 추가', '사진을 불러오지 못했어요. 다시 시도해주세요.'); }
    finally { picking.current = false; setBusy(false); }
  };
  const isPhoto = design === 'photo', isIllustration = design === 'illustration', isGrid = design === 'grid' || isIllustration;
  const fitted = layoutHeight != null;
  const coverScale = 0.65;
  const photoWidth = Math.min(width - 88 * scale, fitted ? layoutHeight * 0.42 / 1.2 : 220 * scale) * coverScale;
  const photoHeight = photoWidth * 1.2 + 25 * scale * coverScale;
  if (design === 'clipboard') return <HeroClipboardCalendar width={width} height={layoutHeight} month={month} today={today} miniature={miniature} eventDates={eventDates} recordDates={[...grouped.keys()]} photos={Object.fromEntries([...grouped].flatMap(([key, records]) => { const uri = records.flatMap(record => record.scenes).find(scene => scene.artworkUri)?.artworkUri; return uri ? [[key, uri]] : []; }))} onSelectDate={onSelectDate} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} />;
  return <View testID="calendar-paper" pointerEvents={miniature ? 'none' : 'auto'} onLayout={layoutWidth == null ? e => { const next = e.nativeEvent.layout.width; if (next > 0) setWidth(current => current === next ? current : next); } : undefined} style={[styles.paper, wallpaper && { backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 }, { padding: 19 * scale, paddingTop: (wallpaper ? 0 : fitted ? 24 : 37) * scale, paddingBottom: (wallpaper ? 6 : 19) * scale, ...(fitted ? { height: layoutHeight } : {}) }]}>
    {!wallpaper && <View pointerEvents="none" style={[styles.clip, { width: (design === 'bold' ? 100 : 19) * scale, height: 10 * scale, top: -3 * scale, backgroundColor: isPhoto ? '#A79564' : '#30312F' }]} />}
    {!hideMonthHeading && <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: isPhoto ? 'center' : 'space-between', marginBottom: (wallpaper ? 8 : 22) * scale }}>
      {wallpaper && <Pressable accessibilityRole="button" accessibilityLabel="이전 달" onPress={() => { tapHaptic('select'); onPreviousMonth?.(); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 28, color: '#303330' }}>‹</Text></Pressable>}
      <Text style={{ color: '#202522', fontSize: (isPhoto ? 12 : isGrid ? 26 : fitted ? 52 : 68) * scale, fontWeight: isPhoto ? '400' : '700', letterSpacing: isPhoto ? 4 * scale : -1 * scale }}>{isPhoto || isGrid ? MONTHS[month.getMonth()].toUpperCase() : MONTHS[month.getMonth()].slice(0, 3)}</Text>
      {!isPhoto && <Text style={{ color: '#303330', fontSize: 19 * scale }}>{month.getFullYear()}</Text>}
      {wallpaper && <Pressable accessibilityRole="button" accessibilityLabel="다음 달" onPress={() => { tapHaptic('select'); onNextMonth?.(); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 28, color: '#303330' }}>›</Text></Pressable>}
    </View>}
    <View style={fitted ? { flex: 1, minHeight: 0 } : undefined}>
    {isPhoto && <Pressable testID="calendar-cover-picker" accessibilityRole="button" accessibilityLabel={photo ? '달력 사진 변경' : '달력 사진 추가'} accessibilityState={{ busy, disabled: miniature || busy }} disabled={miniature || busy} onPress={() => { void pickCover(); }} style={{ width: photoWidth + 14 * scale * coverScale, height: photoHeight, alignSelf: 'center', marginBottom: 16 * scale, padding: 7 * scale * coverScale, paddingBottom: 18 * scale * coverScale, backgroundColor: '#F1F0EC', shadowColor: '#30342D', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } }}>
      <HeroPolaroidSurface />
      <View style={{ flex: 1, backgroundColor: '#E6E7E1', justifyContent: 'center', alignItems: 'center' }}>{photo ? <View testID="calendar-cover-image" style={{ width: '100%', height: '100%' }}><HeroCalendarPhoto key={photo} uri={photo} contain /></View> : <Text style={{ color: '#747B70', fontSize: Math.max(18, 28 * scale), fontWeight: '300' }}>+</Text>}<HeroPhotoEmulsion /></View>
    </Pressable>}

    <View style={{ flex: 1, minWidth: 0, ...(isPhoto ? { minHeight: 0 } : fitted ? { height: '100%' } : {}) }}>
    <View style={{ flexDirection: 'row', paddingBottom: 10 * scale }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => <Text key={day} style={{ width: '14.2857%', textAlign: 'center', fontSize: (isPhoto ? 8 : 11) * scale, color: isGrid && i === 6 ? '#995C54' : '#464944' }}>{isPhoto ? day[0] : day}</Text>)}</View>
    <View style={fitted ? { flex: 1, minHeight: 0 } : undefined}>
    {Array.from({ length: dates.length / 7 }, (_, row) => <View key={row} style={{ flexDirection: 'row', ...(fitted ? { flex: 1, minHeight: 0 } : {}), borderTopWidth: design === 'bold' ? StyleSheet.hairlineWidth : 0, borderColor: '#D1D3CE' }}>
      {dates.slice(row * 7, row * 7 + 7).map(day => {
        const key = getLocalDateKey(day), current = day.getMonth() === month.getMonth();
        const dayPhotos = (grouped.get(key) ?? []).flatMap(diary => diary.scenes).filter(scene => !!scene.artworkUri);
        const thumbnail = dayPhotos[0]?.artworkUri;
        const hasRecord = grouped.has(key), isToday = key === getLocalDateKey(today);
        return <Pressable key={key} disabled={miniature || !onSelectDate} testID={miniature ? undefined : `calendar-paper-day-${key}`} accessibilityRole="button" accessibilityLabel={`${key}${hasRecord ? ', 기록 있음' : ''}${eventDates.includes(key) ? ', 이벤트 또는 연동 일정 있음' : ''}`} onPress={() => { tapHaptic('select'); onSelectDate?.(key); }} style={({ pressed }) => ({ width: '14.2857%', ...(fitted ? { height: '100%' } : { height: miniature ? (isPhoto ? 25 : isGrid ? 53 : 47) * scale : Math.max(44, (isPhoto ? 25 : isGrid ? 53 : 47) * scale) }), padding: 3 * scale, opacity: pressed ? 0.45 : 1 })}>
          <View style={{ flex: 1, borderWidth: isGrid ? StyleSheet.hairlineWidth : 0, borderColor: isIllustration ? 'rgba(83, 77, 64, 0.32)' : '#BFC3BC', padding: isGrid ? 3 * scale : 0, alignItems: isGrid ? 'flex-start' : 'center', backgroundColor: isIllustration ? 'rgba(255, 250, 240, 0.42)' : 'transparent' }}>
            <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: current ? '#252A26' : '#C7CAC4', fontSize: fitted ? Math.max(12, (isPhoto ? 12 : isIllustration ? 20 : isGrid ? 12 : 21) * scale) : (isPhoto ? 9 : isIllustration ? 20 : isGrid ? 12 : 21) * scale, fontWeight: isIllustration || design === 'bold' ? '700' : '400', textDecorationLine: isToday ? 'underline' : 'none' }}>{day.getDate()}</Text>
              {eventDates.includes(key) ? <View pointerEvents="none" testID={`calendar-event-ring-${key}`} style={{ position: 'absolute', top: -2, bottom: -2, left: -6, right: -6, borderRadius: 50, borderWidth: 1.2, borderColor: '#A5644F', transform: [{ rotate: '-8deg' }] }} /> : null}
            </View>
            {isGrid && !isIllustration && current && !thumbnail && <View pointerEvents="none" style={{ width: '100%', flex: 1, justifyContent: 'space-evenly' }}>{[0, 1, 2].map(line => <View key={line} style={{ height: StyleSheet.hairlineWidth, backgroundColor: '#E0E2DC' }} />)}</View>}
            {thumbnail ? <View pointerEvents="none" testID={`calendar-paper-photo-${key}`} style={isIllustration ? { flex: 1, minHeight: 0, width: '86%', maxWidth: 38 * scale, maxHeight: 48 * scale, alignSelf: 'center', marginTop: 2 * scale, marginBottom: 2 * scale, padding: 2 * scale, paddingBottom: 6 * scale, backgroundColor: '#FFFEFA', shadowColor: '#423B32', shadowOpacity: 0.24, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, transform: [{ rotate: `${((day.getDate() % 3) - 1) * 4}deg` }] } : { ...(isPhoto ? { aspectRatio: 1 / 1.2, flexShrink: 1 } : { flex: 1 }), minHeight: 0, width: '100%', maxWidth: 38 * scale, alignSelf: 'center', marginTop: 2 * scale, marginBottom: 2 * scale, padding: 1, backgroundColor: '#FFFFFF' }}>
              <HeroCalendarPhoto key={thumbnail} uri={resolveHeroArtworkUri(thumbnail)} />
              <Image accessible={false} source={require('../../../../assets/control-illustrations/calendar-white-tape.webp')} resizeMode="contain" style={{ position: 'absolute', top: -5 * scale, alignSelf: 'center', width: 27 * scale, height: 10 * scale, transform: [{ rotate: '-4deg' }] }} />
            </View> : hasRecord && <View testID={`calendar-paper-record-${key}`} style={{ width: 3 * scale, height: 3 * scale, borderRadius: 2, backgroundColor: '#77816E', position: 'absolute', bottom: 2 * scale, alignSelf: 'center' }} />}
          </View>
        </Pressable>;
      })}
    </View>)}
    </View>
    </View>
    </View>
    {isPhoto && <Text style={{ textAlign: 'center', fontSize: 9 * scale, color: '#85877F', marginTop: (wallpaper ? 6 : 12) * scale }}>{month.getFullYear()}</Text>}
    <View style={{ height: (wallpaper ? 4 : 18) * scale }} />
  </View>;
}

export function HeroCalendarDesigns(props: { month: Date; today: Date; diaries: ComicDiary[]; onSelectDate: (date: string) => void }) {
  const selected = useHeroCalendarDesign() ?? 'bold';
  const { width: windowWidth } = useWindowDimensions();
  const previewWidth = Math.max(1, (windowWidth - 64) / 3);
  return <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 22, alignItems: 'flex-start', justifyContent: 'flex-start' }}>{CALENDAR_DESIGNS.map(item => {
      const previewLayoutWidth = previewWidth - 8;
      const previewLayoutHeight = previewLayoutWidth * (item.id === 'clipboard' ? 1340 / 914 : 540 / 330);
      return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.name}, ${selected === item.id ? '적용 중' : '무료'}, ${item.description}`} accessibilityState={{ selected: selected === item.id, disabled: selected === item.id }} disabled={selected === item.id} onPress={() => { if (selected !== item.id) { tapHaptic('select'); applyHeroCalendarDesign(item.id); } }} style={{ width: previewWidth }}>
      <View pointerEvents="none" style={{ padding: 4, height: previewLayoutHeight + 8, justifyContent: 'center' }}><CalendarPaper {...props} design={item.id} miniature layoutWidth={previewLayoutWidth} layoutHeight={previewLayoutHeight} /></View>
      <Text numberOfLines={2} style={styles.label}>{item.name}</Text><Text numberOfLines={1} style={[styles.free, selected === item.id && { color: '#55BFA8' }]}>{selected === item.id ? '적용 중' : '무료'}</Text>
    </Pressable>;
    })}</View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  paper: { backgroundColor: '#FAFAF6', shadowColor: '#34362E', shadowOpacity: 0.15, shadowRadius: 5, shadowOffset: { width: 1, height: 4 }, elevation: 3 },
  clip: { position: 'absolute', alignSelf: 'center', borderRadius: 1 },
  label: { fontSize: 10, lineHeight: 14, height: 28, color: '#3E4439', textAlign: 'center', marginTop: 8 },
  free: { height: 18, lineHeight: 18, fontSize: 11, color: '#73796C', textAlign: 'center', marginTop: 5 },
});
