import { HeroCameraPrintAnimation, heroCameraBottom } from './HeroCameraPrintAnimation';
import { HeroCanvasNote } from './HeroCanvasNote';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setCalendarBackdropVisible } from '../model/heroCalendarDesign';
import { HeroAppliedCalendarIcon } from './HeroAppliedCalendarIcon';
import { HeroCalendarBackground } from './HeroCalendarBackground';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { useWallpaperStore } from '@shared/lib/wallpaper/wallpaperStore';
import { DIARY_DATE_FONT_SIZE } from '@shared/lib/ui-font';
import { HeroCharacterPickerActionContext } from '../model/heroCharacterPickerAction';
import { getLocalDateKey } from '@entities/day-plan';
import { useTodayDate } from '@shared/lib/time/useTodayDate';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Keyboard, Text, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AnnouncementHomeOverlay,
  useAnnouncementHomeNudge,
} from '@features/announcement-home-nudge';

import { DayPlanHeaderCenterActionsContext, DayPlanShellBackgroundContext, DayPlanWeatherActionsContext, useDayPlanHeaderActions } from '../model/dayPlanHeaderActions';
import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';
import { IndependentComicPlanner, type ComicDiaryHandle } from './IndependentHeroPlanner';

/** 하단 탭 — 오늘의 주인공(만화 일기) 전용 화면 */
export function ComicDayPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const [printingUri, setPrintingUri] = useState<string | null>(null);
  const finishPrinting = useCallback(() => setPrintingUri(null), []);
  const [overviewOpen, setOverviewOpen] = useState(true);
  const { generationJob, historyCreate, historyEntry, diaryDate, calendarWidget } = useLocalSearchParams<{ generationJob?: string; historyCreate?: string; historyEntry?: string; diaryDate?: string; calendarWidget?: string }>();
  const isDark = useColorScheme() === 'dark';
  const today = useTodayDate();
  const todayKey = getLocalDateKey(today);
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const selectedDate = chosenDate ?? todayKey;
  const [calendarMonth, setCalendarMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
  const [calendarVisible, setCalendarVisible] = useState(true);
  useLayoutEffect(() => { setCalendarBackdropVisible(calendarVisible); }, [calendarVisible]);
  const [photoActive, setPhotoActive] = useState(false);
  const [headerCharacterList, setHeaderCharacterList] = useState<ReactNode>(null);
  const plannerRef = useRef<ComicDiaryHandle>(null);
  useFocusEffect(useCallback(() => {
    // Preserve an in-progress photo edit; open the calendar after it is dismissed.
    if (calendarWidget !== '1' || photoActive) return;
    Keyboard.dismiss();
    setCalendarVisible(true);
    router.setParams({ calendarWidget: undefined });
  }, [calendarWidget, photoActive, router]));
  const selectCalendarDate = useCallback((date: string) => {
    setChosenDate(date);
    setCalendarVisible(false);
  }, []);
  const characterPicker = useContext(HeroCharacterPickerActionContext);
  useFocusEffect(useCallback(() => {
    if (!historyCreate) return;
    plannerRef.current?.openNewDiary();
    router.setParams({ historyCreate: undefined });
  }, [historyCreate, router]));
  useFocusEffect(useCallback(() => {
    if (!diaryDate || !/^\d{4}-\d{2}-\d{2}$/.test(diaryDate)) return;
    selectCalendarDate(diaryDate);
    const [year, month] = diaryDate.split('-').map(Number);
    setCalendarMonth(new Date(year, month - 1, 1, 12));
    router.setParams({ diaryDate: undefined });
  }, [diaryDate, router, selectCalendarDate]));
  const registerPhoto = characterPicker?.registerPhoto;
  // Other tabs queue the camera intent before navigating. Consume it only
  // after the main screen has focus and its planner ref is mounted again.
  useFocusEffect(useCallback(() => {
    registerPhoto?.(() => plannerRef.current?.openPhotoEntry());
    return () => registerPhoto?.(null);
  }, [registerPhoto]));
  const registerHome = characterPicker?.register;
  useFocusEffect(useCallback(() => {
    registerHome?.(() => plannerRef.current?.openSceneEntry(true));
    return () => registerHome?.(null);
  }, [registerHome]));
  const setPhotoTabActive = characterPicker?.setPhotoActive;
  useLayoutEffect(() => { setPhotoTabActive?.(photoActive); return () => setPhotoTabActive?.(false); }, [photoActive, setPhotoTabActive]);
  const announcementHome = useAnnouncementHomeNudge();
  const registerHeaderActions = useDayPlanHeaderActions();
  const registerCenterActions = useContext(DayPlanHeaderCenterActionsContext);
  const registerWeatherActions = useContext(DayPlanWeatherActionsContext);
  const setShellBackground = useContext(DayPlanShellBackgroundContext);
  const { registerComicDiaryLight, tabBarHeight } = useDayPlanTabBridge();

  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const ink = tone.text;
  const muted = tone.textMuted;
  const hasWallpaper = useWallpaperStore(state => !!state.wallpaper);
  const surface = hasWallpaper ? 'transparent' : isDark ? tone.bg : 'transparent';

  useLayoutEffect(() => {
    setShellBackground?.(calendarVisible ? '#FAFAF6' : isDark ? null : '#F7F6F4');
    registerComicDiaryLight(!isDark);
    return () => {
      setShellBackground?.(null);
      registerComicDiaryLight(false);
    };
  }, [calendarVisible, isDark, setShellBackground, registerComicDiaryLight]);

  const movePhotoDate = useCallback((delta: number) => {
    Keyboard.dismiss();
    tapHaptic('select');
    const [year, month, day] = selectedDate.split('-').map(Number);
    const next = new Date(year, month - 1, day + delta, 12);
    setChosenDate(getLocalDateKey(next));
    setCalendarMonth(new Date(next.getFullYear(), next.getMonth(), 1, 12));
    setOverviewOpen(true);
  }, [selectedDate]);

  // Calendar designs own their month heading. Only the open photo list uses day navigation.
  const todayButton = useMemo(() => calendarVisible || photoActive ? null : <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <Pressable testID="comic-previous-day" accessibilityRole="button" accessibilityLabel="이전 날짜" onPress={() => movePhotoDate(-1)} style={styles.monthArrow}><Text style={{ color: ink, fontSize: 28 }}>‹</Text></Pressable>
    <View testID="comic-date-navigation" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: ink, fontSize: DIARY_DATE_FONT_SIZE, lineHeight: 36 }}>{selectedDate.replace(/-/g, '.')}</Text></View>
    <Pressable testID="comic-next-day" accessibilityRole="button" accessibilityLabel="다음 날짜" onPress={() => movePhotoDate(1)} style={styles.monthArrow}><Text style={{ color: ink, fontSize: 28 }}>›</Text></Pressable>
  </View>, [ink, selectedDate, calendarVisible, photoActive, movePhotoDate]);
  useLayoutEffect(() => { registerCenterActions?.(todayButton); return () => registerCenterActions?.(null); }, [registerCenterActions, todayButton, calendarVisible]);
  const leadingActions = useMemo(() => <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    {!photoActive && !calendarVisible ? <Pressable testID="comic-return-calendar" accessibilityRole="button" accessibilityLabel={t('comicCalendar.open')} accessibilityHint={t('comicCalendar.returnHint')} onPress={() => { tapHaptic('select'); Keyboard.dismiss(); setCalendarBackdropVisible(true); setCalendarVisible(true); }} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -8 }] }}>
      <HeroAppliedCalendarIcon month={calendarMonth} today={today} />
    </Pressable> : null}
  </View>, [photoActive, calendarVisible, t, ink, calendarMonth, todayKey]);
  useLayoutEffect(() => { registerWeatherActions?.(leadingActions); return () => registerWeatherActions?.(null); }, [registerWeatherActions, leadingActions]);
  useEffect(() => { setOverviewOpen(true); }, [todayKey, photoActive]);
  const header = useMemo(() => (
    <View style={styles.header}>
      {!registerCenterActions ? <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { top: 0, bottom: undefined, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 1 }]}>{todayButton}</View> : null}
      <View style={styles.headerMainRow}>
        <View style={styles.diaryTitleHit} />
        {!registerWeatherActions ? leadingActions : <View style={{ width: 42, height: 44 }} />}
      </View>
      {headerCharacterList ? <View style={styles.entryRow}>{headerCharacterList}</View> : null}
    </View>
  ), [headerCharacterList, registerCenterActions, todayButton, registerWeatherActions, leadingActions]);
  useLayoutEffect(() => {
    registerHeaderActions?.(header);
  }, [registerHeaderActions, header]);
  useLayoutEffect(() => () => registerHeaderActions?.(null), [registerHeaderActions]);

  return (
    <View style={[styles.root, { backgroundColor: surface }]}>
      <AnnouncementHomeOverlay
        announcement={announcementHome.notice}
        onDismiss={announcementHome.dismiss}
        onUpdatePress={() => { void announcementHome.openStore(); }}
      />
      {!registerHeaderActions ? header : null}
      <IndependentComicPlanner
        ref={plannerRef}
        pendingPrintUri={printingUri}
        homeCalendar={calendarVisible ? diaries => <HeroCalendarBackground bottomInset={Math.max(tabBarHeight, 56 + Math.max(insets.bottom, 34) + 8) + 12} date={today} month={calendarMonth} isDark={isDark} diaries={diaries} onSelectDate={selectCalendarDate} onPreviousMonth={() => setCalendarMonth(value => new Date(value.getFullYear(), value.getMonth() - 1, 1, 12))} onNextMonth={() => setCalendarMonth(value => new Date(value.getFullYear(), value.getMonth() + 1, 1, 12))} /> : undefined}
        overviewOpen={overviewOpen}
        onOverviewChange={setOverviewOpen}
        onDiarySaved={uri => { setCalendarVisible(false); setOverviewOpen(true); setPrintingUri(uri); }}
        onPhotoEntryChange={setPhotoActive}
        onHeaderCharacterListChange={setHeaderCharacterList}
        onOpenBag={() => router.push('/day-plan')}
        entryActionsInHeader
        hideCharacterHeading
        key={`${todayKey}:${generationJob ?? ''}:${historyEntry ?? ''}`}
        date={selectedDate}
        ink={ink}
        muted={muted}
        isDark={isDark}
      />
      {printingUri && !calendarVisible ? <HeroCameraPrintAnimation key={printingUri} uri={printingUri} bottom={heroCameraBottom(insets.bottom)} dark={isDark} onComplete={finishPrinting} /> : null}
      {!calendarVisible && !photoActive && overviewOpen ? <HeroCanvasNote key={selectedDate} date={selectedDate} ink={ink} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  monthArrow: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1, minHeight: 0 },
  header: { minHeight: 44 },
  headerMainRow: { height: 44, flexDirection: 'row', alignItems: 'center' },
  diaryTitleHit: { minHeight: 44, flex: 1, minWidth: 0, justifyContent: 'center' },
  entryRow: { height: 26, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
});
