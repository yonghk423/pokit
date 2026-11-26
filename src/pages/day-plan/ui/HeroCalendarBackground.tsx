import { CalendarPlansPanel, PlanAccentContext, PlanContext, readPlans } from './CalendarRangePlans';
import { freePhotoCalendar } from '../model/freePhotoCalendars';
import { FreePhotoCalendarPaper } from './FreePhotoCalendarPaper';
import { isPremiumPaper, isRaisedCalendar } from '../model/premiumCalendarPapers';
import { HeroCalendarWidgetSync } from './HeroCalendarWidgetSync';
import { useCanvasEventDates } from '../model/heroCanvasEvents';
import { useDeviceEvents } from '@features/apple-calendar/useDeviceEvents';
import { eventsOnDay } from '@features/apple-calendar/calendarDates';
import { useTranslation } from '@shared/lib/i18n';
import { getLocalDateKey } from '@entities/day-plan/lib/localDateKey';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeroIllustrationCalendar } from './HeroIllustrationCalendar';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { CalendarNotesHint } from './CalendarNotesHint';
import { HeroCalendarNote } from './HeroCalendarNote';
import { calendarNoteStyle } from '../model/calendarNoteStyle';
import { useCalendarPhotosHidden } from '@shared/lib/calendarLayoutPreferences';
import { Animated, Keyboard, type NativeScrollEvent, type NativeSyntheticEvent, Platform, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { CalendarPaper } from './HeroCalendarDesigns';
import { isIllustrationCalendarDesign, CITY_CALENDAR_THEMES, useHeroCalendarDesign } from '../model/heroCalendarDesign';
import type { ComicDiary } from '../lib/heroDiaryStorage';

const notesOpenedKey = 'pokit:calendar-notes-opened-v1';
const plansOpenedKey = 'pokit:calendar-plans-opened-v1';

function useCalendarOpeningHint(key: string, eligible: boolean) {
  const [show, setShow] = useState(() => !localStorageClient.getItemRaw(key));
  useEffect(() => {
    if (eligible) setShow(!localStorageClient.getItemRaw(key));
  }, [eligible, key]);
  const markOpened = useCallback(() => {
    if (!localStorageClient.getItemRaw(key)) localStorageClient.setItemRaw(key, 'opened');
    setShow(false);
  }, [key]);
  return [show, markOpened] as const;
}

/** Measure the available canvas before painting, avoiding a provisional calendar size. */
export function HeroCalendarBackground({ visible = true, focused = true, lastVisibleSize, date, month, diaries, onSelectDate, onPreviousMonth, onNextMonth, bottomInset = 0 }: { focused?: boolean; lastVisibleSize?: { current: { width: number; height: number } }; visible?: boolean; date: Date; month: Date; isDark: boolean; diaries: ComicDiary[]; onSelectDate: (date: string) => void; bottomInset?: number; onPreviousMonth?: () => void; onNextMonth?: () => void }) {
  const { locale } = useTranslation();
  const [plans,setPlans]=useState(readPlans);
  const [plansOpen,setPlansOpen]=useState(false);
  useEffect(()=>{if(visible && focused)setPlans(readPlans());else setPlansOpen(false)},[visible,focused]);
  const hidePhotos = useCalendarPhotosHidden();
  const displayDiaries = useMemo(() => hidePhotos
    ? diaries.map(diary => ({ ...diary, scenes: diary.scenes.map(scene => ({ ...scene, artworkUri: undefined })) }))
    : diaries, [diaries, hidePhotos]);
  const linked = useDeviceEvents(month.getFullYear(), month.getMonth(), locale === 'ko', true, true);
  const localEventDates = useCanvasEventDates(month.getFullYear(), month.getMonth());
  const eventDates = [...new Set([...localEventDates, ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)).filter(day => eventsOnDay(linked.events, day).length).map(getLocalDateKey)])];
  const insets = useSafeAreaInsets();
  const design = useHeroCalendarDesign();
  const freePhoto = freePhotoCalendar(design);
  const illustrated = isIllustrationCalendarDesign(design);
  const themeId = CITY_CALENDAR_THEMES.find(theme => theme.design === design)?.themeId ?? '01-rush-hour-commute';
  const paperDesign = isPremiumPaper(design) || design === 'clipboard' || design === 'bold' || design === 'grid' || design === 'photo' || design === 'weather' ? design : 'bold';
  const [paperSize, setPaperSize] = useState(() => lastVisibleSize?.current ?? { width: 0, height: 0 });
  const root = useRef<View>(null);
  const [rootTop, setRootTop] = useState(0);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', event => {
      setKeyboardHeight(event.endCoordinates.height);
      setKeyboardTop(event.endCoordinates.screenY);
      root.current?.measureInWindow((_x, y) => setRootTop(y));
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => { setKeyboardHeight(0); setKeyboardTop(null); });
    return () => { show.remove(); hide.remove(); };
  }, [visible]);
  const paperWidth = paperSize.width;
  const scroll = useRef<ScrollView>(null);
  const userDrag = useRef(false);
  useLayoutEffect(() => {
    if (visible) return;
    setKeyboardHeight(0);
    scroll.current?.scrollTo({ y: Math.round(paperSize.height * .52), animated: false });
  }, [visible]);
  const noteStyle = calendarNoteStyle(design);
  const noteHeight = keyboardHeight > 0
    ? Math.max(180, (keyboardTop === null ? paperSize.height - keyboardHeight : keyboardTop - rootTop) - insets.top - 12)
    : Math.max(260, paperSize.height * .52);
  // The entire original viewport precedes the note, so nothing peeks out before a drag.
  const calendarHeight = paperSize.height;
  const panelHeight = Math.round(calendarHeight * .52);
  const [scrollY] = useState(() => new Animated.Value(0));
  useLayoutEffect(() => {
    userDrag.current = false;
    scrollY.setValue(panelHeight);
    scroll.current?.scrollTo({ y: panelHeight, animated: false });
  }, [panelHeight, scrollY]);
  const expandedOffset = keyboardHeight > 0 ? calendarHeight - insets.top - 12 : noteHeight + bottomInset;
  const paperCenterProgress = useMemo(() => scrollY.interpolate({
    inputRange: [0, Math.max(1, panelHeight), Math.max(1, panelHeight) + Math.max(1, expandedOffset)],
    outputRange: [0, 1, 2],
    extrapolate: 'clamp',
  }), [scrollY, panelHeight, expandedOffset]);
  const [calendarCentered, setCalendarCentered] = useState(true);
  const hintEligible = visible && focused && paperWidth > 0 && calendarHeight > 0;
  const [showHint, markNotesOpened] = useCalendarOpeningHint(notesOpenedKey, hintEligible);
  const [showPlansHint, markPlansOpened] = useCalendarOpeningHint(plansOpenedKey, hintEligible);
  const hintVisible = hintEligible && showHint && keyboardHeight === 0;
  const plansHintVisible = hintEligible && calendarCentered && !showHint && showPlansHint && keyboardHeight === 0;
  const plansHintTop = Math.max(8, insets.top + 42 - rootTop);
  const hintSpace = hintVisible ? 44 : 0;
  const openNotes = useCallback(() => {
    userDrag.current = false;
    setCalendarCentered(false);
    markNotesOpened();
    scroll.current?.scrollTo({ y: panelHeight + expandedOffset, animated: true });
  }, [panelHeight, expandedOffset, markNotesOpened]);
  const openPlans = useCallback(() => {
    userDrag.current = false;
    markPlansOpened();
    scroll.current?.scrollTo({ y: 0, animated: true });
  }, [markPlansOpened]);
  useEffect(() => {
    if (!hintEligible) userDrag.current = false;
  }, [hintEligible]);
  useEffect(() => {
    if (!plansOpen && keyboardHeight > 0) scroll.current?.scrollTo({ y: panelHeight + expandedOffset, animated: true });
  }, [keyboardHeight, panelHeight, expandedOffset, plansOpen]);
  const onCalendarScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    scrollY.setValue(y);
    setCalendarCentered(Math.abs(y - panelHeight) <= 4);
    setPlansOpen(y < panelHeight - 8);
    if (!userDrag.current || !hintEligible || keyboardHeight > 0) return;
    if (y <= 4) {
      userDrag.current = false;
      markPlansOpened();
    } else if (y >= panelHeight + expandedOffset - 4) {
      userDrag.current = false;
      markNotesOpened();
    }
  }, [panelHeight, expandedOffset, scrollY, hintEligible, keyboardHeight, markNotesOpened, markPlansOpened]);
  const monthSwipe = useMemo(() => Gesture.Pan()
    .enabled(Boolean(onPreviousMonth || onNextMonth))
    .maxPointers(1)
    .activeOffsetX([-18, 18])
    .failOffsetY([-16, 16])
    .runOnJS(true)
    .onEnd(({ translationX, translationY }, success) => {
      if (!success || Math.abs(translationX) < 45 || Math.abs(translationX) < Math.abs(translationY) * 1.5) return;
      if (translationX < 0) onNextMonth?.();
      else onPreviousMonth?.();
    }), [onNextMonth, onPreviousMonth]);
  // Stay in the shell's normal flow: its measured header is the upper boundary.
  return <View ref={root} collapsable={false} testID="hero-calendar-applied-design" style={{ flex: 1, marginTop: illustrated || freePhoto ? 0 : 8, marginBottom: illustrated ? 0 : -24, alignItems: 'stretch' }}>
    {visible && <View testID="calendar-viewport-measure" collapsable={false} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onLayout={({ nativeEvent: { layout } }) => {
      if (layout.width <= 0 || layout.height <= 0) return;
      root.current?.measureInWindow((_x, y) => setRootTop(y));
      const size = { width: layout.width, height: layout.height };
      if (lastVisibleSize) lastVisibleSize.current = size;
      setPaperSize(previous => previous.width === size.width && previous.height === size.height ? previous : size);
    }} />}
    {visible ? <HeroCalendarWidgetSync design={design} month={month} today={date} diaries={displayDiaries} eventDates={eventDates} /> : null}
    <PlanAccentContext.Provider value={noteStyle.accent}><PlanContext.Provider value={plans}>{paperWidth > 0 && paperSize.height > 0 ? <ScrollView ref={scroll} testID="calendar-note-scroll" onScroll={onCalendarScroll} onScrollBeginDrag={event => { userDrag.current = Math.abs(event.nativeEvent.contentOffset.y - panelHeight) <= 4; }} scrollEventThrottle={16} style={{ flex: 1 }} showsVerticalScrollIndicator={false} snapToOffsets={keyboardHeight > 0 ? undefined : [0, panelHeight, panelHeight + expandedOffset]} decelerationRate="fast" disableIntervalMomentum bounces={false} directionalLockEnabled keyboardShouldPersistTaps="handled" scrollEnabled={visible && keyboardHeight === 0} keyboardDismissMode="none" automaticallyAdjustKeyboardInsets={false} contentInsetAdjustmentBehavior="never">
    <CalendarPlansPanel theme={noteStyle} plans={plans} onSave={setPlans} month={month} open={plansOpen} topInset={Math.max(0, insets.top + 42 - rootTop)} maxHeight={panelHeight}/>
    <GestureDetector gesture={monthSwipe}><View collapsable={false} style={{ width: paperWidth, height: calendarHeight, overflow: 'hidden' }}><View style={{ width: paperWidth, height: paperSize.height }}>{freePhoto ? <FreePhotoCalendarPaper eventDates={eventDates} background design={design} width={paperWidth} height={Math.max(1, paperSize.height - hintSpace)} month={month} today={date} diaries={displayDiaries} onSelectDate={onSelectDate} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} /> : illustrated ? <HeroIllustrationCalendar bottomInset={bottomInset + hintSpace} themeId={themeId} onMoveMonth={delta => { if (delta < 0) onPreviousMonth?.(); else onNextMonth?.(); }} topInset={insets.top} width={paperWidth} height={paperSize.height} month={month} today={date} diaries={displayDiaries} eventDates={eventDates} onSelectDate={onSelectDate} /> : <CalendarPaper viewportHeight={calendarHeight} paperCenterProgress={paperCenterProgress} design={paperDesign} month={month} today={date} diaries={displayDiaries} eventDates={eventDates} onSelectDate={onSelectDate} layoutWidth={paperWidth} layoutHeight={Math.max(1, paperSize.height - hintSpace - (paperDesign === 'mint-planner' || paperDesign === 'spiral-plan' ? 24 : isRaisedCalendar(paperDesign) ? bottomInset / 2 : paperDesign === 'photo' ? Math.min(bottomInset, 72) : bottomInset))} wallpaper onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} />}</View>{plansHintVisible && <CalendarNotesHint edge="top" inset={plansHintTop} ink={noteStyle.ink} paper={noteStyle.paper} onOpen={openPlans} />}{hintVisible && <CalendarNotesHint inset={bottomInset} ink={noteStyle.ink} paper={noteStyle.paper} onOpen={openNotes} />}</View></GestureDetector>
    <HeroCalendarNote design={design} height={noteHeight} keyboardVisible={keyboardHeight > 0} onFocus={openNotes} />
    <View pointerEvents="none" style={{ height: keyboardHeight > 0 ? keyboardHeight + 56 : bottomInset, backgroundColor: noteStyle.paper }} />
    </ScrollView> : null}</PlanContext.Provider></PlanAccentContext.Provider>
  </View>;
}
