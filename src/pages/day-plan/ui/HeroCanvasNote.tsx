import { useWritingPromptsEnabled } from '@shared/lib/writingPromptPreferences';
import { AppWallpaperBackground } from '@shared/ui/app-wallpaper';
import { HeroContentSkeleton } from './HeroContentSkeleton';
import { scheduleIdleTask } from '@shared/lib/scheduleIdleTask';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { HeroInlineNote, type HeroInlineNoteHandle } from './HeroInlineNote';
import { noteColorIllustrationSources } from '@shared/ui/icon-symbol/noteColorIllustrationSources';
import { routineIllustrationSources } from '@shared/ui/icon-symbol/routineIllustrationSources';
import { ROUTINE_ILLUSTRATIONS, routineIllustrationLabel } from '@shared/lib/routineIllustrationCatalog';
import { controlIllustrationArtwork } from '@shared/ui/icon-symbol/controlIllustrationSources';
import { PaperGrain } from '@shared/ui/paper-grain';
import { PostItColorGrid } from '@shared/ui/post-it-color-palette';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { selectIsPro, useSubscriptionStore } from '@features/subscriptions/model/subscriptionStore';
import { HeroMiniMemo } from './HeroMiniMemo';
import { useDiaryTheme } from '../model/diaryTheme';
import { HeroMovablePocket } from './HeroMovablePocket';
import { useAppliedDiaryImage } from '../lib/useAppliedDiaryImage';
import { HeroTrashIcon } from './HeroTrashIcon';
import { AppAlert } from '@shared/lib/app-alert';
import { DIARY_CLIP_IMAGES, useHeroDiaryClip } from '../model/heroDiaryClip';
import { Image } from 'expo-image';
import { saveCanvasEvents, type CanvasEvent as OwnCanvasEvent } from '../model/heroCanvasEvents';
import { calendarSourceLabel } from '@features/apple-calendar/calendarSourceLabel';
import { useDeviceEvents } from '@features/apple-calendar/useDeviceEvents';
import { eventsOnDay } from '@features/apple-calendar/calendarDates';
import { parseLocalDateKeyToDate } from '@entities/day-plan/lib/localDateKey';
import { useTranslation } from '@shared/lib/i18n';
import { EventTitleField } from './EventTitleField';
import type { WebView } from 'react-native-webview';
import { Image as NativeImage, Text } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, PanResponder, FlatList, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { NativeHhmmWheelPicker } from '@shared/ui/native-hhmm-wheel-picker/NativeHhmmWheelPicker';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { setMonthlyCanvasExpanded } from '../model/monthlyCanvasExpansion';

const notePalette = [
  '#FFF8E8', '#F6E3E6', '#FFD6BA', '#FFF0AE', '#E4EFE4', '#BBE4DB', '#E3EEF6', '#D4DBFF', '#E4D4F4', '#F3C8DF',
  '#E44251', '#FF7344', '#EDA420', '#E7CF28', '#62AD42', '#179E84', '#208EC4', '#3056C8', '#8553BD', '#BC2780',
  '#302D2A', '#763849', '#855037', '#706031', '#365444', '#285E64', '#234C67', '#35395E', '#604264', '#814E70',
  '#FFFFFF', '#D4D0C9', '#9C9691', '#625F5D', '#222222',
];
type NoteColor = 'pen' | 'paper';
const graphiteSources = { ...controlIllustrationArtwork, ...routineIllustrationSources };
const noteIllustrations = Object.keys(graphiteSources);
const noteIllustrationSources: Record<string, number> = { ...graphiteSources, ...noteColorIllustrationSources };
const noteIllustrationLabels = new Map(ROUTINE_ILLUSTRATIONS.map(item => [item.id as string, item.labels]));

function paperInk(paper: string) {
  const [red, green, blue] = [1, 3, 5].map(start => parseInt(paper.slice(start, start + 2), 16) / 255);
  return 0.299 * red + 0.587 * green + 0.114 * blue < 0.52 ? '#FFFFFF' : '#302D2A';
}

type CanvasColors = Partial<Record<NoteColor, string>>;
const CanvasEventRow = memo(function CanvasEventRow({ event, ink, onDelete }: { event: OwnCanvasEvent; ink: string; onDelete: (id: string) => void }) {
  const { t } = useTranslation();
  return <View style={{ paddingVertical: 8, flexDirection: 'row', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${ink}33` }}>
    <ThemedText style={{ flex: 1, color: ink, fontSize: 17, lineHeight: 31 }}>
      {event.time ? event.time + '  ' : ''}
      {(event.inlineTitle ?? ('\uFFFC'.repeat(event.illustrations?.length ?? (event.illustration ? 1 : 0)) + event.title)).split('\uFFFC').map((part,index)=>{
        const id = index ? (event.illustrations ?? [event.illustration])[index-1] : undefined;
        return <Text key={index}>{id && noteIllustrationSources[id] ? <NativeImage source={noteIllustrationSources[id]} style={{width:28,height:28}} /> : null}{part}</Text>;
      })}
    </ThemedText>
    <Pressable testID={`hero-event-delete-${event.id}`} accessibilityRole="button" accessibilityLabel={t('common.delete')} onPress={() => onDelete(event.id)} style={{ width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><HeroTrashIcon size={23} color={ink} /></Pressable>
  </View>;
});

/** An independent canvas annotation; it never changes the photo layout bounds. */
export function HeroCanvasNote({ date, ink, initialHeight = 0, monthlyHeight, keyboardVerticalOffset = 0, returnAction, archiveView = false }: { date: string; ink: string; initialHeight?: number; monthlyHeight?: number; keyboardVerticalOffset?: number; returnAction?: ReactNode; archiveView?: boolean }) {
  const { locale, t } = useTranslation();
  const writingPromptsEnabled = useWritingPromptsEnabled();
  const proClip = useDiaryTheme('clip');
  const bookmark = useDiaryTheme('mark');
  const diaryClip = useHeroDiaryClip();
  const appliedClip = useAppliedDiaryImage('clip-' + diaryClip, 'image', DIARY_CLIP_IMAGES[diaryClip]);
  const insets = useSafeAreaInsets();
  const ko = locale === 'ko';
  const [tab, setTab] = useState<'story' | 'calendar' | 'event'>('story');
  const monthly = monthlyHeight !== undefined;
  const day = parseLocalDateKeyToDate(date)!;
  const linked = useDeviceEvents(day.getFullYear(), day.getMonth(), ko, !monthly);
  const events = useMemo(() => eventsOnDay(linked.events, day), [linked.events, date]);
  const calendarTab = tab === 'calendar';
  const [calendarFilter, setCalendarFilter] = useState<'all' | 'Google' | 'Apple'>('all');
  const calendarRows = events.map(event => {
    const label = calendarSourceLabel(event.sourceName, event.sourceType, false);
    const provider = label === 'Google Calendar' ? 'Google' : label.startsWith('Apple Calendar') ? 'Apple' : label;
    return { event, provider };
  }).filter(row => calendarFilter === 'all' || row.provider === calendarFilter);
  const eventKey = `pokit:canvas-events:${date}`;
  const [ownEvents, setOwnEvents] = useState<OwnCanvasEvent[]>([]);
  const [loadedEventKey, setLoadedEventKey] = useState<string | null>(null);
  const eventsReady = loadedEventKey === eventKey;
  const ownEventsRef = useRef(ownEvents);
  ownEventsRef.current = ownEvents;
  const [eventTitle, setEventTitle] = useState('');
  const [eventIcons, setEventIcons] = useState<string[]>([]);
  const eventInput = useRef<WebView>(null);
  const [eventTime, setEventTime] = useState<string | undefined>(() => localStorageClient.getJson<string>(`${eventKey}:draft-time`) ?? undefined);
  const [showTime, setShowTime] = useState(false);
  useEffect(() => {
    setEventIcons([]); setEventTitle(''); setEventTime(localStorageClient.getJson<string>(`${eventKey}:draft-time`) ?? undefined); setShowTime(false);
    const task = scheduleIdleTask(() => {
      const saved = localStorageClient.getJson<OwnCanvasEvent[]>(eventKey);
      setOwnEvents(Array.isArray(saved) ? saved : []);
      setLoadedEventKey(eventKey);
    });
    return () => task.cancel();
  }, [eventKey]);
  const deleteEvent = useCallback((id: string) => AppAlert.alert(t('canvas.event.deleteTitle'), t('canvas.event.deleteMessage'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: () => { const next = ownEventsRef.current.filter(item => item.id !== id); saveCanvasEvents(date, next); setOwnEvents(next); } },
  ]), [date, t]);
  const addEvent = () => {
    const title = eventTitle.replace(/\uFFFC/g, '').trim();
    if (!title || !eventsReady) return;
    const next = [...ownEvents, { id: `${Date.now()}:${Math.random().toString(36).slice(2)}`, title, inlineTitle: eventTitle, illustrations: eventIcons, ...(eventTime ? { time: eventTime } : {}) }];
    saveCanvasEvents(date, next);
    localStorageClient.removeItem(`${eventKey}:draft-time`);
    setOwnEvents(next); setEventIcons([]); setEventTitle(''); setEventTime(undefined); setShowTime(false); setEditing(false); Keyboard.dismiss();
  };
  const [editing, setEditing] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(initialHeight);
  const dark = useColorScheme() === 'dark';
  const canvasPaper = dark ? '#262B28' : '#F7F6F4';
  const [expanded, setExpanded] = useState(() => localStorageClient.getJson<boolean>('pokit:canvas-panel-expanded') === true);
  useEffect(() => { if (monthly && !archiveView) setMonthlyCanvasExpanded(expanded); }, [monthly, expanded, archiveView]);
  const [lowered, setLowered] = useState(() => !archiveView && localStorageClient.getJson<boolean>('pokit:canvas-panel-lowered') === true);
  const expansion = useRef(new Animated.Value(lowered ? -1 : expanded ? 1 : 0)).current;
  const currentExpansion = useRef(lowered ? -1 : expanded ? 1 : 0);
  const dragStart = useRef(0);
  const dragDistance = useRef(0);
  const collapsedTop = archiveView ? 0 : Math.max(0, canvasHeight - (monthlyHeight ?? 218));
  const headerHeight = insets.top + 54;
  const expandedTop = monthly || archiveView ? 0 : Math.min(collapsedTop, returnAction ? headerHeight : insets.top + 4);
  const isBookmark = bookmark || (!proClip && diaryClip === 'rose-pink-bookmark');
  // Let the illustrated clip overlap the paper edge to cover its transparent padding.
  const clipOffset = isBookmark ? (proClip ? 38 : 33) : (proClip ? 35 : 30);
  const travel = Math.max(1, collapsedTop - expandedTop);
  const hiddenTop = Math.max(collapsedTop, canvasHeight - 60);
  const hiddenTravel = Math.max(1, hiddenTop - collapsedTop);
  const panelTop = expansion.interpolate({ inputRange: [-1, 0, 1], outputRange: [hiddenTop, collapsedTop, expandedTop], extrapolate: 'clamp' });
  const visibleExpansion = expansion.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' });
  const paperOpacity = editing || archiveView ? 1 : expansion.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1], extrapolate: 'clamp' });
  useEffect(() => {
    const listener = expansion.addListener(({ value }) => { currentExpansion.current = value; });
    return () => { expansion.removeListener(listener); expansion.stopAnimation(); };
  }, [expansion]);
  const settlePanel = useCallback((state: boolean | 'hidden') => {
    const open = state === true;
    setLowered(state === 'hidden');
    localStorageClient.setJson('pokit:canvas-panel-lowered', state === 'hidden');
    setExpanded(open);
    if (monthly) setMonthlyCanvasExpanded(open);
    localStorageClient.setJson('pokit:canvas-panel-expanded', open);
    Animated.spring(expansion, { toValue: state === 'hidden' ? -1 : open ? 1 : 0, stiffness: 240, damping: 28, mass: 1, useNativeDriver: false }).start();
  }, [expansion]);
  const clipGesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => { dragDistance.current = 0; expansion.stopAnimation(value => { dragStart.current = value; }); },
    onPanResponderMove: (_, gesture) => {
      dragDistance.current = gesture.dy;
      const startOffset = dragStart.current < 0 ? -dragStart.current * hiddenTravel : -dragStart.current * travel;
      const offset = startOffset + gesture.dy;
      currentExpansion.current = Math.max(-1, Math.min(1, offset > 0 ? -offset / hiddenTravel : -offset / travel));
      if (monthly) setMonthlyCanvasExpanded(currentExpansion.current > 0.03);
      expansion.setValue(currentExpansion.current);
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dy) < 5 && Math.abs(gesture.dx) < 5) {
        settlePanel(dragStart.current < 0.5);
      } else {
        // A deliberate upward drag opens even before the midpoint. Ignore the
        // tiny reverse velocity that often occurs when lifting a finger.
        settlePanel(gesture.dy >= 12 && (dragStart.current <= 0 || currentExpansion.current < -0.4) ? 'hidden' : Math.abs(gesture.dy) >= 12 ? gesture.dy < 0 && dragStart.current >= 0 : dragStart.current >= 0.5);
      }
    },
    onPanResponderTerminate: () => settlePanel(currentExpansion.current < -0.4 ? 'hidden' : currentExpansion.current >= 0.5),
    onPanResponderTerminationRequest: () => false,
  }), [expansion, travel, hiddenTravel, settlePanel]);

  useEffect(() => {
    if (tab !== 'story') return;
    const syncFocus = () => inlineNote.current?.reportFocus();
    const show = Keyboard.addListener('keyboardDidShow', syncFocus);
    const hide = Keyboard.addListener('keyboardDidHide', syncFocus);
    return () => { show.remove(); hide.remove(); };
  }, [tab]);
  const storageKey = monthly ? `pokit:monthly-album-note:${date.slice(0, 7)}` : `pokit:canvas-note:${date}`;
  const [picker, setPicker] = useState<NoteColor | null>(null);
  const paletteProgress = useRef(new Animated.Value(0)).current;
  useLayoutEffect(() => {
    if (!picker) return;
    paletteProgress.setValue(0);
    const animation = Animated.timing(paletteProgress, { toValue: 1, duration: 180, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [picker, paletteProgress]);
  const colorKey = storageKey + ':colors';
  const [colors, setColors] = useState(() => localStorageClient.getJson<Partial<Record<NoteColor, string>>>(colorKey) ?? {});
  const eventColorKey = eventKey + ':colors';
  const [eventColors, setEventColors] = useState(() => localStorageClient.getJson<CanvasColors>(eventColorKey) ?? {});
  const palette = tab === 'event' ? eventColors : colors;
  function chooseColor(color?: string) {
    if (!picker) return;
    if (!selectIsPro(useSubscriptionStore.getState())) { router.push('/pro-preview'); return; }
    const next = { ...palette, [picker]: color };
    localStorageClient.setJson(tab === 'event' ? eventColorKey : colorKey, next);
    if (tab === 'event') setEventColors(next);
    else setColors(next);
    setPicker(null);
  }
  const notePaper = colors.paper;
  const panelPaper = tab === 'event' ? eventColors.paper : notePaper;
  const noteInk = colors.pen ?? (notePaper ? paperInk(notePaper) : ink);
  const eventInk = eventColors.pen ?? (eventColors.paper ? paperInk(eventColors.paper) : ink);
  const renderOwnEvent = useCallback(({ item }: { item: OwnCanvasEvent }) => <CanvasEventRow event={item} ink={eventInk} onDelete={deleteEvent} />, [eventInk, deleteEvent]);
  useEffect(() => { if (!editing) { setPicker(null); setIllustrationsOpen(false); } }, [editing]);
  const [illustrationMode, setIllustrationMode] = useState<'mono' | 'color'>('mono');
  const [illustrationsOpen, setIllustrationsOpen] = useState(false);
  const inlineNote = useRef<HeroInlineNoteHandle>(null);
  const [recentIllustration, setRecentIllustration] = useState(() => {
    const saved = localStorageClient.getItemRaw('pokit:note-recent-illustration');
    return saved && noteIllustrationSources[saved] ? saved : 'checklist';
  });
  const rememberIllustration = useCallback((id: string) => {
    localStorageClient.setItemRaw('pokit:note-recent-illustration', id);
    setRecentIllustration(id);
  }, []);
  return <KeyboardAvoidingView enabled={editing} keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardVerticalOffset : 0} pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { zIndex: editing ? 20 : 2 }]}>
    <View pointerEvents={editing ? 'auto' : 'box-none'} onLayout={({ nativeEvent: { layout } }) => setCanvasHeight(previous => previous === layout.height ? previous : layout.height)} style={{ flex: 1, backgroundColor: editing ? canvasPaper : 'transparent' }}>
      {monthly && !editing && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: canvasPaper, opacity: visibleExpansion }]}><AppWallpaperBackground /></Animated.View>}
      {!editing && !archiveView ? <Animated.View
        testID="hero-canvas-decoration-overlays"
        pointerEvents={expanded ? 'none' : 'box-none'}
        style={[StyleSheet.absoluteFill, { zIndex: 4, opacity: expansion.interpolate({ inputRange: [0, 0.72, 1], outputRange: [1, 0, 0], extrapolate: 'clamp' }) }]}
      >
        <HeroMiniMemo key={storageKey} storageKey={monthly ? `pokit:monthly-mini-memo:${date.slice(0, 7)}` : `pokit:mini-memo:${date}`} ko={ko} defaultTop={collapsedTop} />
        <HeroMovablePocket defaultTop={collapsedTop} ko={ko} />
      </Animated.View> : null}
      {/* Mask photos behind the bottom controls independently of the translucent note. */}
      <View testID="hero-canvas-bottom-background" pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: editing ? 64 : 52, backgroundColor: canvasPaper }} />
      <Animated.View onTouchStart={() => { if (illustrationsOpen) setIllustrationsOpen(false); }} testID="hero-canvas-reading-panel" pointerEvents={lowered && !editing ? 'none' : 'auto'} style={{ position: 'absolute', left: 0, right: 0, overflow: 'hidden', bottom: editing ? 64 : 52, top: editing ? (monthly || archiveView ? 0 : returnAction ? headerHeight : insets.top + 28) : panelTop }}>
        {panelPaper ? <Animated.View testID="hero-canvas-colored-paper" pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: panelPaper, opacity: paperOpacity }]}>
          <PaperGrain opacity={0.68} />
        </Animated.View> : null}
        {!editing && !monthly && !panelPaper && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: canvasPaper, opacity: paperOpacity, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' }]}><AppWallpaperBackground /></Animated.View>}

      <View style={{ display: tab === 'story' && (!lowered || editing) ? 'flex' : 'none', position: 'absolute', left: 20, right: 28, top: editing ? 0 : 8, bottom: 0 }}>
        <HeroInlineNote key={storageKey} ref={inlineNote} storageKey={storageKey} sources={noteIllustrationSources} ink={noteInk} onIllustrationInserted={rememberIllustration}
          randomPrompts={!monthly && writingPromptsEnabled}
          placeholder={monthly ? (translateUiText("이달의 이야기를 적어보세요.")) : t('comicDay.memoHint')}
          onFocusChange={setEditing} />
      </View>
      {!editing && calendarTab ? <ScrollView testID="hero-canvas-calendar-events" nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator style={{ position: 'absolute', left: 28, right: 28, top: 8, bottom: 0 }} contentContainerStyle={{ paddingBottom: 24 }}>
        {linked.connected ? <Pressable accessibilityRole="button" accessibilityLabel={translateUiText("캘린더 일정 새로고침")} disabled={linked.loading} onPress={linked.refresh} style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingRight: 12 }}><ThemedText style={{ color: noteInk, fontSize: 13 }}>{linked.loading ? (translateUiText("일정 확인 중…")) : (translateUiText("일정 새로고침"))}</ThemedText></Pressable> : null}
        {linked.error ? <ThemedText style={{ color: noteInk, fontSize: 14 }}>{linked.error}</ThemedText> : !linked.connected ? <ThemedText style={{ color: noteInk, fontSize: 14 }}>{translateUiText("설정에서 캘린더를 연결해주세요.")}</ThemedText> : null}
        <View style={{ alignSelf: 'flex-start', flexDirection: 'row', borderRadius: 10, borderWidth: 1, borderColor: `${noteInk}66`, marginVertical: 4 }}>
          {(['all', 'Google', 'Apple'] as const).map(filter => {
            const selected = calendarFilter === filter;
            const label = filter === 'all' ? t('diary.calendar.filterAll') : filter;
            return <Pressable key={filter} testID={`calendar-filter-${filter}`} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }}
              onPress={() => {
                void Haptics.selectionAsync();
                setCalendarFilter(filter);
              }}
              style={{ minHeight: 32, minWidth: 64, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center',
                borderLeftWidth: filter === 'all' ? 0 : StyleSheet.hairlineWidth, borderColor: `${noteInk}66` }}>
              <ThemedText style={{ color: noteInk, fontSize: 15, textDecorationLine: selected ? 'underline' : 'none' }}>{label}</ThemedText>
            </Pressable>;
          })}
        </View>
        {linked.loading && !calendarRows.length ? <HeroContentSkeleton ink={noteInk} testID="hero-calendar-skeleton" /> : null}
        {linked.connected && !linked.loading && !linked.error && !calendarRows.length ? <ThemedText style={{ color: noteInk, opacity: 0.65, fontSize: 13 }}>{translateUiText("이날의 일정이 없어요.")}</ThemedText> : null}
        {calendarRows.map(({ event, provider }, index) => (
          <View key={JSON.stringify([event.calendarId, event.id, event.startDate])}
            style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 9,
              borderBottomWidth: index < calendarRows.length - 1 ? StyleSheet.hairlineWidth : 0, borderStyle: 'dotted', borderColor: `${noteInk}55` }}>
            <ThemedText style={{ color: noteInk, fontSize: 14, minWidth: 44 }}>{event.allDay ? translateUiText("종일") : new Date(event.startDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</ThemedText>
            <ThemedText style={{ flex: 1, color: noteInk, fontSize: 16 }}>{event.title}</ThemedText>
            <ThemedText style={{ color: noteInk, opacity: 0.65, fontSize: 13, maxWidth: '32%', textAlign: 'right' }}>
              {provider}{event.calendarId?.startsWith('google-task:') ? ' · ' + translateUiText("할 일") : ''}
            </ThemedText>
          </View>
        ))}
      </ScrollView> : null}
      {tab === 'event' ? <View testID="hero-canvas-own-events" style={{ position: 'absolute', left: 28, right: 28, top: editing ? 0 : 8, bottom: 0 }}>
        <EventTitleField key={eventKey + ':' + ownEvents.length} webRef={eventInput} initialText={eventTitle} ids={eventIcons} sources={noteIllustrationSources}
          ink={eventInk} hint={t('canvas.event.placeholder')} label={translateUiText("이벤트 이름")} enabled={eventsReady}
          onFocus={() => { setEditing(true); setShowTime(false); }} onText={doc => { setEventTitle(doc.text); setEventIcons(doc.icons); }} />
        {editing ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <Pressable testID="hero-event-time" accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setEditing(true); setEventTime(value => value ?? '09:00'); setShowTime(value => !value); }} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: eventInk, fontSize: 17 }}>{eventTime ?? (translateUiText("+ 시간 추가"))}</ThemedText></Pressable>
            {eventTime ? <Pressable accessibilityRole="button" onPress={() => { setEventTime(undefined); localStorageClient.removeItem(`${eventKey}:draft-time`); setShowTime(false); }} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: eventInk, opacity: 0.6 }}>{translateUiText("시간 없이")}</ThemedText></Pressable> : null}
          </View>
          {showTime ? <NativeHhmmWheelPicker valueHhmm={eventTime ?? '09:00'} onChangeHhmm={setEventTime} isDark={dark} ink={eventInk} textColor={eventInk} surface={panelPaper ?? canvasPaper} accessibilityLabelPrefix={translateUiText("이벤트 시간")} /> : null}
          {showTime ? <Pressable testID="hero-event-time-save" accessibilityRole="button" onPress={() => { localStorageClient.setJson(`${eventKey}:draft-time`, eventTime ?? '09:00'); setShowTime(false); eventInput.current?.injectJavaScript("window.note.focus();true;"); }} style={{ minHeight: 44, alignSelf: 'flex-end', justifyContent: 'center' }}><ThemedText style={{ color: eventInk }}>{translateUiText("시간 저장 후 글쓰기")}</ThemedText></Pressable> : null}
        </ScrollView> : null}
        {!editing ? eventsReady ? <FlatList testID="hero-canvas-event-list" data={ownEvents} keyExtractor={event => event.id} renderItem={renderOwnEvent} extraData={eventInk} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={5} updateCellsBatchingPeriod={32} removeClippedSubviews={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 6 }} style={{ flex: 1, minHeight: 0 }} /> : <HeroContentSkeleton ink={eventInk} testID="hero-events-skeleton" /> : null}
      </View> : null}
      </Animated.View>
      {!editing && !monthly ? <View accessibilityRole="tablist" style={{ position: 'absolute', left: 28, right: 28, bottom: 4, height: 44, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        {(monthly ? ['story'] as const : ['story', 'calendar', 'event'] as const).map(value => <Pressable key={value} testID={`hero-canvas-tab-${value}`} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => {
          void Haptics.selectionAsync();
          Keyboard.dismiss();
          setTab(value);
        }} style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: ink, fontSize: 15, textAlign: 'center', opacity: tab === value ? 1 : 0.5, textDecorationLine: tab === value ? 'underline' : 'none' }}>{value === 'story' ? (monthly ? (translateUiText("월간 기록")) : (translateUiText("나의 이야기"))) : value === 'calendar' ? (translateUiText("캘린더")) : (translateUiText("이벤트"))}</ThemedText></Pressable>)}
      </View> : null}
      {(editing || expanded) && returnAction ? <View pointerEvents="auto" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: headerHeight, backgroundColor: canvasPaper, zIndex: 30 }}>
        <AppWallpaperBackground />
        <View testID={editing ? 'hero-canvas-recording-return' : 'hero-canvas-expanded-return'} style={{ position: 'absolute', right: 20, top: insets.top + 10, zIndex: 30 }}>{returnAction}</View>
      </View> : null}
      {!editing && !archiveView ? <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 20, width: 76, height: 44, top: expansion.interpolate({ inputRange: [-1, 0, 1], outputRange: [hiddenTop - clipOffset, collapsedTop - clipOffset, expandedTop - clipOffset], extrapolate: 'clamp' }), zIndex: 31, elevation: 31 }}>
          <View testID="hero-canvas-clip-handle"  {...clipGesture.panHandlers} accessible accessibilityRole="button" accessibilityLabel={translateUiText("내용 영역 펼치기 또는 접기")} accessibilityHint={translateUiText("위로 끌면 펼쳐지고 아래로 끌면 접힙니다")} accessibilityState={{ expanded }} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => settlePanel(!expanded)} style={{ width: 76, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
            <Image testID="hero-canvas-blue-clip" source={bookmark?.source ?? proClip?.source ?? appliedClip} contentFit="contain" transition={0} cachePolicy="memory-disk" useAppleWebpCodec={false} accessible={false} pointerEvents="none" style={isBookmark ? { width: 26, height: 48 } : { width: 60, height: proClip || diaryClip === 'cherry-binder' ? 36 : 20 }} />
          </View>
      </Animated.View> : null}
      {editing && illustrationsOpen ? <View style={{ position: 'absolute', left: 0, right: 0, bottom: 54, height: 216, backgroundColor: dark ? '#323433' : '#F5F3F0' }}>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', justifyContent: 'center' }}>
          {(['mono', 'color'] as const).map(mode => <Pressable key={mode} testID={`hero-illustration-tab-${mode}`} accessibilityRole="tab" accessibilityState={{ selected: mode === illustrationMode }} onPress={() => setIllustrationMode(mode)} style={{ minHeight: 44, minWidth: 58, alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText style={{ color: dark ? '#F5F3F0' : '#30332D', fontSize: 15, opacity: mode === illustrationMode ? 1 : 0.6, textDecorationLine: mode === illustrationMode ? 'underline' : 'none' }}>{t(mode === 'mono' ? 'diary.icons.monochrome' : 'diary.icons.color')}</ThemedText>
          </Pressable>)}
        </View>
        <FlatList
        testID="hero-canvas-illustration-picker"
        data={noteIllustrations}
        numColumns={8}
        keyExtractor={id => id}
        keyboardShouldPersistTaps="always"
        initialNumToRender={40}
        maxToRenderPerBatch={40}
        windowSize={3}
        style={{ flex: 1 }}
        extraData={illustrationMode}
        contentContainerStyle={{ padding: 8 }}
        renderItem={({ item: baseId }) => {
          const id = illustrationMode === 'color' ? `color:${baseId}` : baseId;
          return <Pressable accessibilityRole="button" accessibilityLabel={`${translateUiText("이모티콘 추가")} ${routineIllustrationLabel(noteIllustrationLabels.get(baseId), locale) ?? baseId}`} onPress={() => { if (!selectIsPro(useSubscriptionStore.getState())) { router.push('/pro-preview'); return; }
            if (tab === 'event') {
              eventInput.current?.injectJavaScript('window.note.insert('+JSON.stringify({id})+');true;');
              rememberIllustration(id);
            } else {
              inlineNote.current?.insertIllustration(id);
            } }} style={{ width: '12.5%', height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={noteIllustrationSources[id]} contentFit="contain" style={{ width: 28, height: 28 }} />
        </Pressable>;
        }}
      /></View> : null}
      {editing && picker ? <Animated.ScrollView key={picker} keyboardShouldPersistTaps="always" style={{ position: 'absolute', left: 0, right: 0, bottom: 54, opacity: paletteProgress, transform: [{ translateY: paletteProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }], maxHeight: 188, backgroundColor: dark ? '#323433' : '#F5F3F0' }}>
        <PostItColorGrid texture="pigment" isDark={dark}
          label={picker === 'pen' ? (translateUiText("글자색")) : (translateUiText("배경색"))}
          clearLabel={translateUiText("기본색")}
          onClear={() => chooseColor()}
          choices={notePalette.map(color => ({
            id: color, color, label: color, labelKey: 'catalog.postItColorTitle',
            selected: palette[picker] === color, onSelect: () => chooseColor(color),
          }))}
        />
      </Animated.ScrollView> : null}
      {editing && <View style={{ position: 'absolute', left: 20, right: 20, bottom: 0, height: 52, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${ink}33`, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable testID="hero-canvas-dismiss-keyboard" accessibilityRole="button" accessibilityLabel={translateUiText("키보드 내리기")} onPress={() => { inlineNote.current?.blur(); Keyboard.dismiss(); setEditing(false); }} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <HanddrawnControl name="keyboard.chevron.compact.down" size={26} color={ink} />
        </Pressable>
        {(['pen', 'paper'] as const).map(kind => <Pressable key={kind} accessibilityRole="button" onPress={() => {
          setIllustrationsOpen(false);
          setPicker(current => current === kind ? null : kind);
        }} style={{ minHeight: 44, justifyContent: 'center' }}>
          <ThemedText style={{ color: ink, fontSize: 15 }}>{kind === 'pen' ? (translateUiText("글자색")) : (translateUiText("배경색"))}</ThemedText>
        </Pressable>)}
        <Pressable testID="hero-canvas-illustrations" accessibilityRole="button" accessibilityLabel={translateUiText("이모티콘 모음")} accessibilityState={{ expanded: illustrationsOpen }} onPress={() => { setPicker(null); setIllustrationsOpen(value => !value); }} style={{ width: 44, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={noteIllustrationSources[recentIllustration]} contentFit="contain" style={{ width: 28, height: 30 }} />
        </Pressable>
        <Pressable accessibilityRole="button" testID="hero-canvas-edit-done" accessibilityLabel={tab === 'event' ? translateUiText("이벤트 저장") : translateUiText("글쓰기 완료")} disabled={tab === 'event' && !showTime && !eventTitle.replace(/\uFFFC/g, '').trim()} onPress={() => { if (tab === 'event' && showTime) { localStorageClient.setJson(`${eventKey}:draft-time`, eventTime ?? '09:00'); setShowTime(false); eventInput.current?.injectJavaScript("window.note.focus();true;"); } else if (tab === 'event') { addEvent(); } else { inlineNote.current?.blur(); Keyboard.dismiss(); setEditing(false); } }} style={{ minWidth: 60, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText style={{ color: ink, fontSize: 17, opacity: tab === 'event' && !showTime && !eventTitle.replace(/\uFFFC/g, '').trim() ? 0.35 : 1 }}>{tab === 'event' ? (showTime ? (translateUiText("시간 저장")) : (translateUiText("저장"))) : (translateUiText("완료"))}</ThemedText>
        </Pressable>
      </View>}
    </View>
  </KeyboardAvoidingView>;
}
