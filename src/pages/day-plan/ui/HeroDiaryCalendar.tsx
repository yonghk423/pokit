import { useDeviceEvents } from '@features/apple-calendar/useDeviceEvents';
import { eventsOnDay } from '@features/apple-calendar/calendarDates';
import { BackChevron } from '@shared/ui/icon-symbol';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { penContour } from '@shared/ui/pen-frame';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { AppModal } from '@shared/ui/app-modal';
import { AppAlert } from '@shared/lib/app-alert';
import { useTranslation } from '@shared/lib/i18n';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { ThemedText } from '@shared/ui/themed-text';
import { PaperGrain } from '@shared/ui/paper-grain';
import { getLocalDateKey, parseLocalDateKeyToDate } from '@entities/day-plan/lib/localDateKey';
import { calendarCover, comicCalendarDays, groupCalendarDiaries, type CalendarCover } from '../lib/heroCalendar';
import type { ComicDiary } from '../lib/heroDiaryStorage';
import type { ComicDayScene } from '../lib/heroDayStorage';
import { COMIC_SCENES } from '../lib/heroSceneImages';
import { ComicSceneImage } from './HeroSceneImage';

const COVER_KEY = 'pokit:comic-calendar-covers:v1';
export function HeroCalendarIcon({ ink, size = 24 }: { ink: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 40 40" accessible={false}>
    {/* Layered paper edges, metal binding, and a folded lower corner. */}
    <Path d="M7 10 35 8.8 36 35 8 36Z" fill="#B9B6AC" opacity={0.2} />
    <Path d="M6 8.5 33.5 8 34 34 6.5 35Z" fill="#E5E2D8" stroke={ink} strokeWidth={0.7} strokeLinejoin="round" />
    <Path d="M5.5 6.5Q19 5.8 33 6.5L32.8 29.5 28.5 33 5.8 33.5Z" fill="#FAF9F3" stroke={ink} strokeWidth={1.05} strokeLinejoin="round" />
    <Path d="M6 7h26.5v7H6Z" fill="#DADFD4" />
    <Path d="M6 14h26.5M28.5 33v-4l4.3.5" fill="none" stroke={ink} strokeWidth={0.65} strokeLinejoin="round" />
    <Path d="M11 9V4.8q0-2.3 1.7-2.3t1.7 2.3V8M24 9V4.8q0-2.3 1.7-2.3t1.7 2.3V8" fill="none" stroke={ink} strokeWidth={1.15} strokeLinecap="round" />
    <Path d="M9.5 18h2m4.5 0h2m4.5 0h2m-15 5h2m4.5 0h2m4.5 0h2m-15 5h2m4.5 0h2" fill="none" stroke={ink} strokeWidth={1.15} strokeLinecap="round" />
    <Path d="M21 20.4q4-1.5 5.2 1.2 1 3-2.2 3.5-3.6.5-3-2.6" fill="none" stroke="#A56B53" strokeWidth={0.8} strokeLinecap="round" />
    <Path d="m8 35 22-.5" stroke={ink} strokeWidth={0.45} opacity={0.4} />
  </Svg>;
}
/** A blank sheet with a gently curled corner: no diary on this date yet. */
export function EmptyDiaryIcon({ ink }: { ink: string }) {
  return <Svg width={76} height={66} viewBox="0 0 76 66" accessible={false}>
    <Path d="M19.8 8.9Q36 8.3 52.5 8.5Q52.1 26.3 54.3 42.6C55.5 49.8 49.2 55.8 41.3 56.1L20.5 56.7Q21.1 32.9 19.8 8.9Z" stroke={ink} strokeWidth={1.05} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M41.3 56.1Q46.3 51.3 46.3 46.8Q51.2 47.6 54.3 42.6M46.3 46.8Q48 51 41.3 56.1" stroke={ink} strokeWidth={0.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17.8 58.3Q33.6 57.4 49.7 58M26.1 59.5L42.8 59" stroke={ink} strokeWidth={0.45} opacity={0.48} fill="none" strokeLinecap="round" />
  </Svg>;
}
function HangingScene({ scene, width, stacked = false, angle = -2, isDark }: { scene: ComicDayScene; width: number; stacked?: boolean; angle?: number; isDark: boolean }) {
  const height = width * 1.2;
  const paper = isDark ? '#353832' : '#E6E3DA';
  const original = COMIC_SCENES.find(item => item.id === scene.image)?.source;
  return <View pointerEvents="none" style={{ width, height: height + 10, marginTop: 2 }}>
    {stacked ? <><View style={[s.paper, { backgroundColor: paper, width, height, top: 11, transform: [{ rotate: '5deg' }, { translateX: 2 }] }]} /><View style={[s.paper, { backgroundColor: paper, width, height, top: 8, transform: [{ rotate: '-4deg' }, { translateX: -2 }] }]} /></> : null}
    <View style={[s.paper, { backgroundColor: paper, width, height, top: 8, padding: Math.max(2, width * 0.035), transform: [{ rotate: `${angle}deg` }] }]}>
      <PaperGrain opacity={0.85} />
      <View style={{ flex: 1, borderRadius: 0, overflow: 'hidden' }}>
        <ComicSceneImage imageKey={`calendar:${scene.artworkUri ?? scene.image}`} source={scene.artworkUri ? { uri: scene.artworkUri } : original} fallbackSource={original} contentFit="cover" contentPosition="top" style={StyleSheet.absoluteFill} />
      </View>
    </View>

  </View>;
}
export function HeroDiaryCalendar({ diaries, today, ink, muted, isDark, onClose, onOpen }: { diaries: ComicDiary[]; today: string; ink: string; muted: string; isDark: boolean; onClose: () => void; onOpen: (id: string) => void }) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const initial = parseLocalDateKeyToDate(today) ?? new Date();
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1, 12));
  const [selected, setSelected] = useState(today);
  const diaryScroll = useRef<ScrollView>(null);
  const diaryOffset = useRef(0);
  const [atEnd, setAtEnd] = useState(false);
  const selectDate = (key: string) => { tapHaptic('select'); diaryOffset.current = 0; setAtEnd(false); setSelected(key); };
  const [gridWidth, setGridWidth] = useState(350);
  const [diaryRowHeight, setDiaryRowHeight] = useState(220);
  const [covers, setCovers] = useState<Record<string, CalendarCover>>(() => localStorageClient.getJson(COVER_KEY) ?? {});
  const grouped = useMemo(() => groupCalendarDiaries(diaries), [diaries]);
  const days = comicCalendarDays(month);
  const cell = gridWidth / 7;
  const rowHeight = Math.max(86, Math.ceil((cell - 12) * 1.2 + 44));
  const linked = useDeviceEvents(month.getFullYear(), month.getMonth(), locale === 'ko');
  const selectedEvents = eventsOnDay(linked.events, parseLocalDateKeyToDate(selected)!);
  const selectedDiaries = grouped.get(selected) ?? [];
  const selectedDate = parseLocalDateKeyToDate(selected)!;
  const move = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1, 12);
    setMonth(next);
    selectDate(next.getFullYear() === initial.getFullYear() && next.getMonth() === initial.getMonth() ? today : getLocalDateKey(next));
  };
  const pickCover = (diary: ComicDiary, scene: ComicDayScene) => { tapHaptic('select'); AppAlert.alert(t('comicCalendar.cover'), t('comicCalendar.coverPrompt'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('comicCalendar.setCover'), onPress: () => { tapHaptic('confirm'); const next = { ...covers, [selected]: { diaryId: diary.id, sceneId: scene.id } }; localStorageClient.setJson(COVER_KEY, next); setCovers(next); } },
  ]); };
  return <AppModal visible presentationStyle="fullScreen" animationType="none" onRequestClose={onClose}>
    <View style={[s.root, { backgroundColor: isDark ? '#20241F' : '#F7F6F4', paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.header}>
        <View style={s.monthNavigation}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('comicCalendar.previous')} onPress={() => move(-1)} style={[s.touch, s.previous]}><BackChevron color={ink} /></Pressable>
        <ThemedText accessibilityRole="header" style={[s.month, { color: ink }]}>{month.getFullYear()}.{String(month.getMonth() + 1).padStart(2, '0')}</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel={t('comicCalendar.next')} onPress={() => move(1)} style={[s.touch, s.next]}><View style={{ transform: [{ rotate: '180deg' }] }}><BackChevron color={ink} /></View></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); onClose(); }} style={[s.touch, s.close]}><Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d="M5 5L19 19M19 5L5 19" stroke={ink} strokeWidth={1.5} strokeLinecap="round" /></Svg></Pressable>
      </View>
      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
        <View style={s.body} onLayout={event => setGridWidth(event.nativeEvent.layout.width)}>
          <View style={s.weekdays}>{Array.from({ length: 7 }, (_, i) => <ThemedText key={i} style={[s.weekday, { color: muted }]}>{new Date(2026, 0, 4 + i, 12).toLocaleDateString(locale ?? 'ko', { weekday: 'short' })}</ThemedText>)}</View>
          <View style={s.grid}>{days.map((day, index) => {
            if (day == null) return <View key={`blank-${index}`} style={[s.day, { width: `${100 / 7}%`, height: rowHeight }]} />;
            const key = getLocalDateKey(new Date(month.getFullYear(), month.getMonth(), day, 12));
            const records = grouped.get(key) ?? [];
            const cover = calendarCover(records, covers[key]);
            const chosen = selected === key;
            return <Pressable key={key} testID={`comic-calendar-day-${key}`} accessibilityRole="button" accessibilityLabel={`${key}, ${t('comicCalendar.diaryCount', { count: records.length })}`} accessibilityState={{ selected: chosen }} onPress={() => selectDate(key)} style={[s.day, { width: `${100 / 7}%`, height: rowHeight }]}>
              <View style={s.dateNumber}>{chosen ? <Svg width={30} height={28} viewBox="0 0 30 28" style={StyleSheet.absoluteFill} accessible={false}><Path d="M15 2C32 0 32 24 15 26C-2 28-3 4 15 2Z" fill="none" stroke={ink} strokeWidth={1} /></Svg> : null}<ThemedText style={{ color: key === today || chosen ? ink : muted, fontSize: 14, lineHeight: 22 }}>{day}</ThemedText></View>
              {eventsOnDay(linked.events, new Date(month.getFullYear(), month.getMonth(), day)).length ? <View testID={`calendar-event-dot-${key}`} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: ink, alignSelf: 'center', marginVertical: 2 }} /> : null}
              {cover ? <View style={{ alignItems: 'center' }}><HangingScene scene={cover.scene} width={Math.max(20, cell - 12)} stacked={records.reduce((sum, diary) => sum + diary.scenes.length, 0) > 1} angle={day % 2 ? -2 : 2} isDark={isDark} /></View> : null}
            </Pressable>;
          })}</View>
          <View style={s.detail}>
            <ThemedText accessibilityRole="header" style={[s.detailDate, { color: ink }]}>{selectedDate.toLocaleDateString(locale ?? 'ko', { month: 'long', day: 'numeric', weekday: 'long' })}</ThemedText>
            {linked.error ? <ThemedText accessibilityLiveRegion="polite" style={{ color: muted, fontSize: 13 }}>{linked.error}</ThemedText> : null}
            {selectedEvents.map((event, index) => <View key={`${event.id}:${event.startDate}:${index}`} style={{ flexDirection: 'row', gap: 12, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: muted }}>
              <ThemedText style={{ color: muted, fontSize: 13, width: 56 }}>{event.allDay ? (locale === 'ko' ? '종일' : 'All day') : new Date(event.startDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</ThemedText>
              <ThemedText style={{ color: ink, flex: 1, fontSize: 16 }}>{event.title || (locale === 'ko' ? '제목 없는 일정' : 'Untitled event')}</ThemedText>
            </View>)}
            {!selectedDiaries.length ? <View style={s.empty} accessible accessibilityRole="image" accessibilityLabel={t('comicCalendar.empty')}><EmptyDiaryIcon ink={muted} /></View> : <ScrollView key={selected} ref={diaryScroll} testID="comic-calendar-diary-scroll" nestedScrollEnabled showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={({ nativeEvent }) => { diaryOffset.current = nativeEvent.contentOffset.y; setAtEnd(nativeEvent.contentOffset.y + nativeEvent.layoutMeasurement.height >= nativeEvent.contentSize.height - 4); }} style={{ maxHeight: diaryRowHeight }} contentContainerStyle={{ paddingBottom: 0 }}>
              {selectedDiaries.map((diary, diaryIndex) => <View key={diary.id} onLayout={diaryIndex === 0 ? event => { const height = Math.ceil(event.nativeEvent.layout.height); if (height > 0) setDiaryRowHeight(height); } : undefined}>
              <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); onOpen(diary.id); }} style={s.diaryHeading}><ThemedText numberOfLines={1} style={{ flex: 1, color: ink, fontSize: 15 }}>{diary.title}</ThemedText><ThemedText style={{ color: muted }}>→</ThemedText></Pressable>
              <ScrollView horizontal nestedScrollEnabled directionalLockEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={s.sceneRow}>{diary.scenes.map((scene, index) => <Pressable key={scene.id} accessibilityRole="button" accessibilityLabel={`${diary.title}, ${scene.title}`} accessibilityHint={t('comicCalendar.coverHint')} onPress={() => { tapHaptic(); onOpen(diary.id); }} onLongPress={() => pickCover(diary, scene)} style={s.sceneHit}><HangingScene scene={scene} width={Math.max(80, Math.min(128, (gridWidth - 64) / 3))} angle={index % 2 ? 2 : -2} isDark={isDark} /></Pressable>)}</ScrollView>
            </View>)}
            </ScrollView>}
            {selectedDiaries.length > 1 ? <View style={s.moreSlot}>
              {!atEnd ? <Pressable testID="comic-calendar-more" accessibilityRole="button" accessibilityLabel={t('comicCalendar.more')} onPress={() => { tapHaptic(); diaryScroll.current?.scrollTo({ y: diaryOffset.current + diaryRowHeight, animated: true }); }} hitSlop={6} style={s.moreButton}>
                <Svg width={30} height={27} viewBox="0 0 30 27" accessible={false}>
                  <Path d={penContour([[7, 7], [10.8, 10.8], [15.2, 14], [19.4, 10.5], [23, 6.4]], 1.35, 0.4)} fill={muted} />
                  <Path d={penContour([[8, 14], [11.4, 17.1], [15.4, 20.2], [19.1, 16.9], [22, 13.5]], 1.05, 1.3)} fill={muted} />
                </Svg>
              </Pressable> : null}
            </View> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  </AppModal>;
}
const s = StyleSheet.create({
  root: { flex: 1 }, header: { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, minHeight: 52 }, monthNavigation: { width: '70%', maxWidth: 320, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, previous: { position: 'absolute', left: 0, top: 0, bottom: 0 }, next: { position: 'absolute', right: 0, top: 0, bottom: 0 }, close: { position: 'absolute', right: 10, top: 0, bottom: 0 }, touch: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, arrow: { fontSize: 34, lineHeight: 40 }, month: { fontSize: 24, lineHeight: 34, textAlign: 'center', width: 130, flexShrink: 1 },
  content: { paddingHorizontal: 12, paddingBottom: 24 }, body: { width: '100%', maxWidth: 840, alignSelf: 'center' }, weekdays: { flexDirection: 'row', borderBottomWidth: 0.7, borderColor: '#B9BBB2', paddingVertical: 9 }, weekday: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 14, lineHeight: 22 }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, day: { borderRightWidth: 0.4, borderBottomWidth: 0.4, borderColor: '#C4C5BD', paddingHorizontal: 2 }, dateNumber: { width: 30, height: 28, alignItems: 'center', justifyContent: 'center' },
  paper: { position: 'absolute', borderRadius: 0, borderWidth: 0.3, borderColor: '#CFCCC3', shadowColor: '#29271F', shadowOffset: { width: 2, height: 3 }, shadowRadius: 3, shadowOpacity: 0.2, elevation: 2 },
  moreSlot: { height: 40, alignItems: 'center', justifyContent: 'center' }, moreButton: { minWidth: 52, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  detail: { borderRadius: 3, marginTop: 20, paddingVertical: 12, overflow: 'hidden' }, detailDate: { fontSize: 19, lineHeight: 28, paddingHorizontal: 14, marginBottom: 6 }, diaryHeading: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, minHeight: 38, alignItems: 'center' }, sceneRow: { gap: 14, paddingHorizontal: 16, paddingBottom: 14 }, sceneHit: { paddingTop: 4, paddingHorizontal: 3, paddingBottom: 8 }, empty: { minHeight: 100, gap: 10, alignItems: 'center', justifyContent: 'center' },
});
