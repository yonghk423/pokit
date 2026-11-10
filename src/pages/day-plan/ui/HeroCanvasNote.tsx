import { DIARY_CLIP_IMAGES, useHeroDiaryClip } from '../model/heroDiaryClip';
import { Image } from 'expo-image';
import { saveCanvasEvents } from '../model/heroCanvasEvents';
import { calendarDisplayTitle } from '@features/apple-calendar/calendarDisplayTitle';
import { calendarSourceLabel } from '@features/apple-calendar/calendarSourceLabel';
import { useDeviceEvents } from '@features/apple-calendar/useDeviceEvents';
import { eventsOnDay } from '@features/apple-calendar/calendarDates';
import { useAppleCalendar } from '@features/apple-calendar/appleCalendar';
import { parseLocalDateKeyToDate } from '@entities/day-plan/lib/localDateKey';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { ThemedText } from '@shared/ui/themed-text';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Animated, PanResponder, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { NativeHhmmWheelPicker } from '@shared/ui/native-hhmm-wheel-picker/NativeHhmmWheelPicker';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';

/** An independent canvas annotation; it never changes the photo layout bounds. */
export function HeroCanvasNote({ date, ink }: { date: string; ink: string }) {
  const { locale, t } = useTranslation();
  const diaryClip = useHeroDiaryClip();
  const insets = useSafeAreaInsets();
  const ko = locale === 'ko';
  const [tab, setTab] = useState<'story' | 'calendar' | 'event'>('story');
  const day = parseLocalDateKeyToDate(date)!;
  const linked = useDeviceEvents(day.getFullYear(), day.getMonth(), ko);
  const ids = useAppleCalendar(state => state.ids);
  const events = eventsOnDay(linked.events, day);
  const calendarTab = tab === 'calendar';
  const calendarColumns = [
    { id: 'google', title: ko ? 'Google 캘린더' : 'Google Calendar', events: events.filter(event => calendarSourceLabel(event.sourceName, event.sourceType, false) === 'Google Calendar') },
    { id: 'apple', title: ko ? 'Apple 캘린더' : 'Apple Calendar', events: events.filter(event => calendarSourceLabel(event.sourceName, event.sourceType, false).startsWith('Apple Calendar')) },
  ];
  const eventKey = `pokit:canvas-events:${date}`;
  const [ownEvents, setOwnEvents] = useState<{ id: string; title: string; time?: string }[]>(() => localStorageClient.getJson(eventKey) ?? []);
  const [eventTitle, setEventTitle] = useState('');
  const [eventTime, setEventTime] = useState<string | undefined>();
  const [showTime, setShowTime] = useState(false);
  useEffect(() => { setOwnEvents(localStorageClient.getJson(eventKey) ?? []); setEventTitle(''); setEventTime(undefined); setShowTime(false); }, [eventKey]);
  const addEvent = () => {
    const title = eventTitle.trim();
    if (!title) return;
    const next = [...ownEvents, { id: `${Date.now()}:${Math.random().toString(36).slice(2)}`, title, ...(eventTime ? { time: eventTime } : {}) }];
    saveCanvasEvents(date, next);
    setOwnEvents(next); setEventTitle(''); setEventTime(undefined); setShowTime(false); setEditing(false); Keyboard.dismiss();
  };
  const [editing, setEditing] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const dark = useColorScheme() === 'dark';
  const [expanded, setExpanded] = useState(() => localStorageClient.getJson<boolean>('pokit:canvas-panel-expanded') === true);
  const expansion = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  const currentExpansion = useRef(expanded ? 1 : 0);
  const dragStart = useRef(0);
  const dragDistance = useRef(0);
  const collapsedTop = Math.max(0, canvasHeight - 218);
  // The date occupies the first 44-point header row. Weather below it must
  // not push the expanded story panel down.
  const expandedTop = Math.min(collapsedTop, insets.top + 44 + 4);
  const travel = Math.max(1, collapsedTop - expandedTop);
  useEffect(() => {
    const listener = expansion.addListener(({ value }) => { currentExpansion.current = value; });
    return () => { expansion.removeListener(listener); expansion.stopAnimation(); };
  }, [expansion]);
  const settlePanel = useCallback((open: boolean) => {
    setExpanded(open);
    localStorageClient.setJson('pokit:canvas-panel-expanded', open);
    Animated.spring(expansion, { toValue: open ? 1 : 0, stiffness: 240, damping: 28, mass: 1, useNativeDriver: false }).start();
  }, [expansion]);
  const clipGesture = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => { dragDistance.current = 0; expansion.stopAnimation(value => { dragStart.current = value; }); },
    onPanResponderMove: (_, gesture) => {
      dragDistance.current = gesture.dy;
      currentExpansion.current = Math.max(0, Math.min(1, dragStart.current - gesture.dy / travel));
      expansion.setValue(currentExpansion.current);
    },
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dy) < 5 && Math.abs(gesture.dx) < 5) {
        settlePanel(dragStart.current < 0.5);
      } else {
        // A deliberate upward drag opens even before the midpoint. Ignore the
        // tiny reverse velocity that often occurs when lifting a finger.
        settlePanel(Math.abs(gesture.dy) >= 12 ? gesture.dy < 0 : dragStart.current >= 0.5);
      }
    },
    onPanResponderTerminate: () => settlePanel(Math.abs(dragDistance.current) >= 12 ? dragDistance.current < 0 : dragStart.current >= 0.5),
    onPanResponderTerminationRequest: () => false,
  }), [expansion, travel, settlePanel]);

  useEffect(() => {
    const hide = Keyboard.addListener('keyboardDidHide', () => { if (tab === 'story') setEditing(false); });
    return () => { hide.remove(); };
  }, [tab]);
  const storageKey = `pokit:canvas-note:${date}`;
  const [text, setText] = useState(() => localStorageClient.getItemRaw(storageKey) ?? '');
  return <KeyboardAvoidingView pointerEvents="box-none" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, { zIndex: editing ? 20 : 2 }]}>
    <View pointerEvents={editing ? 'auto' : 'box-none'} onLayout={({ nativeEvent: { layout } }) => setCanvasHeight(previous => previous === layout.height ? previous : layout.height)} style={{ flex: 1, backgroundColor: editing ? (dark ? '#262B28' : '#F7F6F4') : 'transparent' }}>
      <Animated.View testID="hero-canvas-reading-panel" pointerEvents="auto" style={{ position: 'absolute', left: 0, right: 0, bottom: editing ? 64 : 52, top: editing ? insets.top + 28 : expansion.interpolate({ inputRange: [0, 1], outputRange: [collapsedTop, expandedTop] }) }}>
        {!editing ? <>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dark ? '#262B28' : '#F7F6F4', opacity: expansion, borderTopLeftRadius: 16, borderTopRightRadius: 16 }]} />
          <View testID="hero-canvas-clip-handle" {...clipGesture.panHandlers} accessible accessibilityRole="button" accessibilityLabel={ko ? '내용 영역 펼치기 또는 접기' : 'Expand or collapse content'} accessibilityHint={ko ? '위로 끌면 펼쳐지고 아래로 끌면 접힙니다' : 'Drag up to expand, down to collapse'} accessibilityState={{ expanded }} accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={() => settlePanel(!expanded)} style={{ position: 'absolute', left: 20, top: 0, width: 76, height: 44, justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
            <Image testID="hero-canvas-blue-clip" source={DIARY_CLIP_IMAGES[diaryClip]} contentFit="contain" transition={0} cachePolicy="memory-disk" useAppleWebpCodec={false} accessible={false} pointerEvents="none" style={{ width: 60, height: 20 }} />
          </View>
        </> : null}
      <ThemedTextInput
        testID="hero-canvas-note"
        accessibilityLabel={t('comicDay.memo')}
        placeholder={t('comicDay.memoHint')}
        placeholderTextColor={`${ink}66`}
        value={text}
        multiline
        scrollEnabled
        onFocus={() => setEditing(true)}
        style={{ display: tab === 'story' ? 'flex' : 'none', position: 'absolute', left: 28, right: 28, top: editing ? 0 : 44, bottom: 0, padding: 0, color: ink, fontSize: 17, lineHeight: 25, textAlignVertical: 'top', backgroundColor: 'transparent' }}
        onChangeText={value => { setText(value); localStorageClient.setItemRaw(storageKey, value); }}
      />
      {!editing && calendarTab ? <ScrollView testID="hero-canvas-calendar-events" nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator style={{ position: 'absolute', left: 28, right: 28, top: 44, bottom: 0 }} contentContainerStyle={{ paddingTop: 6, paddingBottom: 24 }}>
        {ids.length ? <Pressable accessibilityRole="button" accessibilityLabel="캘린더 일정 새로고침" disabled={linked.loading} onPress={linked.refresh} style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingRight: 12 }}><ThemedText style={{ color: ink, fontSize: 13 }}>{linked.loading ? (ko ? '일정 확인 중…' : 'Checking events…') : (ko ? '일정 새로고침' : 'Refresh events')}</ThemedText></Pressable> : null}
        {linked.error ? <ThemedText style={{ color: ink, fontSize: 14 }}>{linked.error}</ThemedText> : !ids.length ? <ThemedText style={{ color: ink, fontSize: 14 }}>{ko ? '설정에서 캘린더를 연결해주세요.' : 'Connect a calendar in Settings.'}</ThemedText> : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {calendarColumns.map((column, columnIndex) => <View key={column.id} testID={`hero-canvas-calendar-${column.id}`} style={{ flex: 1, minWidth: 0, paddingLeft: columnIndex ? 12 : 0, paddingRight: columnIndex ? 0 : 12, borderLeftWidth: columnIndex ? StyleSheet.hairlineWidth : 0, borderLeftColor: `${ink}33` }}>
            <ThemedText accessibilityRole="header" style={{ color: ink, fontSize: 15, marginBottom: 8 }}>{column.title}</ThemedText>
            {ids.length > 0 && !linked.loading && !linked.error && !column.events.length ? <ThemedText style={{ color: ink, opacity: 0.6, fontSize: 13 }}>{ko ? '이날의 일정이 없어요.' : 'No events for this day.'}</ThemedText> : null}
            {column.events.map((event, index) => <View key={`${event.id}:${index}`} style={{ paddingVertical: 8, gap: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${ink}33` }}>
              {event.calendarTitle ? <ThemedText style={{ color: ink, opacity: 0.65, fontSize: 12 }}>{calendarDisplayTitle(event.calendarTitle, ko)}</ThemedText> : null}
              <ThemedText style={{ color: ink, opacity: 0.7, fontSize: 13 }}>{event.allDay ? (ko ? '종일' : 'All day') : new Date(event.startDate).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</ThemedText>
              <ThemedText style={{ color: ink, fontSize: 16, flexShrink: 1 }}>{event.title}</ThemedText>
            </View>)}
          </View>)}
        </View>
      </ScrollView> : null}
      {tab === 'event' ? <View testID="hero-canvas-own-events" style={{ position: 'absolute', left: 28, right: 28, top: editing ? 0 : 44, bottom: 0 }}>
        <ThemedTextInput testID="hero-event-title" accessibilityLabel={ko ? '이벤트 이름' : 'Event name'} placeholder={ko ? '이날의 이벤트를 남겨보세요' : 'Write an event for this day'} placeholderTextColor={`${ink}66`} value={eventTitle} onChangeText={setEventTitle} onFocus={() => { setEditing(true); setShowTime(false); }} multiline maxLength={120} style={{ color: ink, fontSize: 17, lineHeight: 25, padding: 0, minHeight: 48, maxHeight: 120, textAlignVertical: 'top' }} />
        {editing ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
            <Pressable testID="hero-event-time" accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setEventTime(value => value ?? '09:00'); setShowTime(value => !value); }} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: ink, fontSize: 17 }}>{eventTime ?? (ko ? '+ 시간 추가' : '+ Add time')}</ThemedText></Pressable>
            {eventTime ? <Pressable accessibilityRole="button" onPress={() => { setEventTime(undefined); setShowTime(false); }} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: ink, opacity: 0.6 }}>{ko ? '시간 없이' : 'No time'}</ThemedText></Pressable> : null}
          </View>
          {showTime ? <NativeHhmmWheelPicker valueHhmm={eventTime ?? '09:00'} onChangeHhmm={setEventTime} isDark={dark} ink={ink} accessibilityLabelPrefix={ko ? '이벤트 시간' : 'Event time'} /> : null}
        </ScrollView> : <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingVertical: 6 }}>
          {!ownEvents.length ? <ThemedText style={{ color: ink, opacity: 0.55, fontSize: 14 }}>{ko ? '기억하고 싶은 이벤트를 남겨보세요.' : 'Keep the events you want to remember.'}</ThemedText> : ownEvents.map(event => <View key={event.id} style={{ paddingVertical: 8, flexDirection: 'row', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${ink}33` }}>{event.time ? <ThemedText style={{ color: ink, fontSize: 15 }}>{event.time}</ThemedText> : null}<ThemedText style={{ flex: 1, color: ink, fontSize: 17 }}>{event.title}</ThemedText></View>)}
        </ScrollView>}
      </View> : null}
      </Animated.View>
      {!editing ? <View accessibilityRole="tablist" style={{ position: 'absolute', left: 28, right: 28, bottom: 4, height: 44, flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
        {(['story', 'calendar', 'event'] as const).map(value => <Pressable key={value} testID={`hero-canvas-tab-${value}`} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => { Keyboard.dismiss(); setTab(value); if (value === 'calendar') linked.refresh(); }} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: ink, fontSize: 15, opacity: tab === value ? 1 : 0.5, textDecorationLine: tab === value ? 'underline' : 'none' }}>{value === 'story' ? (ko ? '나의 이야기' : 'My story') : value === 'calendar' ? (ko ? '캘린더' : 'Calendar') : (ko ? '이벤트' : 'Events')}</ThemedText></Pressable>)}
      </View> : null}
      {editing && <View style={{ position: 'absolute', left: 20, right: 20, bottom: 0, height: 52, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${ink}33`, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable testID="hero-canvas-dismiss-keyboard" accessibilityRole="button" accessibilityLabel="키보드 내리기" onPress={() => { Keyboard.dismiss(); setEditing(false); }} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <HanddrawnControl name="keyboard.chevron.compact.down" size={26} color={ink} />
        </Pressable>
        <Pressable accessibilityRole="button" testID="hero-canvas-edit-done" accessibilityLabel={tab === 'event' ? '이벤트 저장' : '글쓰기 완료'} disabled={tab === 'event' && !eventTitle.trim()} onPress={() => { if (tab === 'event') { addEvent(); } else { Keyboard.dismiss(); setEditing(false); } }} style={{ minWidth: 60, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText style={{ color: ink, fontSize: 17, opacity: tab === 'event' && !eventTitle.trim() ? 0.35 : 1 }}>{tab === 'event' ? (ko ? '저장' : 'Save') : (ko ? '완료' : 'Done')}</ThemedText>
        </Pressable>
      </View>}
    </View>
  </KeyboardAvoidingView>;
}
