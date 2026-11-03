import { HeroCharacterPickerActionContext } from '../model/heroCharacterPickerAction';
import Svg, { Path } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HeroCalendarIcon } from './HeroDiaryCalendar';
import { parseLocalDateKeyToDate } from '@entities/day-plan/lib/localDateKey';
import { getLocalDateKey } from '@entities/day-plan';
import { useTodayDate } from '@shared/lib/time/useTodayDate';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { ThemedText } from '@shared/ui/themed-text';
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  AnnouncementHomeOverlay,
  useAnnouncementHomeNudge,
} from '@features/announcement-home-nudge';

import { DayPlanHeaderCenterActionsContext, DayPlanShellBackgroundContext, DayPlanWeatherActionsContext, useDayPlanHeaderActions } from '../model/dayPlanHeaderActions';
import { useDayPlanTabBridge } from '../model/dayPlanTabBridge';
import { ComicDiaryMenuButton } from './HeroDiaryMenuButton';
import { IndependentComicPlanner, type ComicDiaryHandle } from './IndependentHeroPlanner';

/** 하단 탭 — 오늘의 주인공(만화 일기) 전용 화면 */
export function ComicDayPage() {
  const router = useRouter();
  const { generationJob } = useLocalSearchParams<{ generationJob?: string }>();
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const todayKey = getLocalDateKey(useTodayDate());
  const [displayedDate, setDisplayedDate] = useState<string | null>(null);
  const [photoActive, setPhotoActive] = useState(false);
  const [headerCharacterList, setHeaderCharacterList] = useState<ReactNode>(null);
  const plannerRef = useRef<ComicDiaryHandle>(null);
  const characterPicker = useContext(HeroCharacterPickerActionContext);
  useEffect(() => {
    characterPicker?.register(() => photoActive ? plannerRef.current?.openSceneEntry() : plannerRef.current?.openCharacterPicker());
    characterPicker?.registerPhoto(() => plannerRef.current?.openPhotoEntry());
    return () => { characterPicker?.register(null); characterPicker?.registerPhoto(null); };
  }, [characterPicker, photoActive]);
  const setPhotoTabActive = characterPicker?.setPhotoActive;
  useLayoutEffect(() => { setPhotoTabActive?.(photoActive); return () => setPhotoTabActive?.(false); }, [photoActive, setPhotoTabActive]);
  const announcementHome = useAnnouncementHomeNudge();
  const registerHeaderActions = useDayPlanHeaderActions();
  const registerCenterActions = useContext(DayPlanHeaderCenterActionsContext);
  const registerWeatherActions = useContext(DayPlanWeatherActionsContext);
  const setShellBackground = useContext(DayPlanShellBackgroundContext);
  const { registerComicDiaryLight } = useDayPlanTabBridge();

  const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  const ink = tone.text;
  const muted = tone.textMuted;
  const surface = isDark ? tone.bg : '#F7F6F4';

  useEffect(() => {
    setShellBackground?.(isDark ? null : '#F7F6F4');
    registerComicDiaryLight(!isDark);
    return () => {
      setShellBackground?.(null);
      registerComicDiaryLight(false);
    };
  }, [isDark, setShellBackground, registerComicDiaryLight]);

  const selectedDate = displayedDate && displayedDate !== todayKey ? parseLocalDateKeyToDate(displayedDate) : null;
  const historyLabel = selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(displayedDate?.slice(0, 4) !== todayKey.slice(0, 4) ? { year: 'numeric' } : {}) });
  const todayButton = useMemo(() => <View testID="comic-date-navigation" style={{ minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
    {historyLabel ? <View accessible={false} style={{ width: 64 }} /> : null}
    {historyLabel ? <ThemedText testID="comic-selected-date" style={{ color: ink, fontSize: 13, lineHeight: 20 }}>{historyLabel}</ThemedText> : null}
    <Pressable testID="comic-today-open" accessibilityRole="button" accessibilityLabel="Today" onPress={() => { tapHaptic(); plannerRef.current?.openToday(); }} style={({ pressed }) => ({ width: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.55 : 1 })}>
      {historyLabel ? <Svg pointerEvents="none" width={64} height={30} viewBox="0 0 64 30" style={{ position: 'absolute', top: 7 }} accessible={false}><Path d="M16 1.5q16-.5 32 0c20-.2 20 27 0 27q-16 .5-32 0c-20 0-20-27 0-27Z" fill="none" stroke={ink} strokeWidth={1.05} strokeLinecap="round" /><Path d="M5 23q4 5.5 12 5.5h30q8 0 12-5" fill="none" stroke={ink} strokeWidth={0.7} strokeLinecap="round" /></Svg> : null}
      <ThemedText style={{ color: ink, fontSize: 13, lineHeight: 20, opacity: 1 }}>Today</ThemedText></Pressable>
  </View>, [ink, historyLabel]);
  useLayoutEffect(() => { registerCenterActions?.(todayButton); return () => registerCenterActions?.(null); }, [registerCenterActions, todayButton]);
  const calendarLabel = t('comicCalendar.open');
  const calendarButton = useMemo(() => <Pressable testID="comic-calendar-open" accessibilityRole="button" accessibilityLabel={calendarLabel} hitSlop={6} onPress={() => { tapHaptic(); plannerRef.current?.openCalendar(); }} style={{ width: 32, minHeight: 28, alignItems: 'center', justifyContent: 'center' }}><HeroCalendarIcon ink={ink} size={23} /></Pressable>, [calendarLabel, ink]);
  useLayoutEffect(() => { registerWeatherActions?.(calendarButton); return () => registerWeatherActions?.(null); }, [registerWeatherActions, calendarButton]);
  const header = useMemo(() => (
    <View style={styles.header}>
      {!registerCenterActions ? <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { top: 0, bottom: undefined, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 1 }]}>{todayButton}</View> : null}
      <View style={styles.headerMainRow}>
        <ComicDiaryMenuButton onPress={() => plannerRef.current?.openLibrary()} />
        <View style={styles.diaryTitleHit} />
        {!registerWeatherActions ? calendarButton : null}
      </View>
      {headerCharacterList ? <View style={styles.entryRow}>{headerCharacterList}</View> : null}
    </View>
  ), [headerCharacterList, registerWeatherActions, calendarButton, registerCenterActions, todayButton]);
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
        onDateChange={setDisplayedDate}
        onPhotoEntryChange={setPhotoActive}
        onHeaderCharacterListChange={setHeaderCharacterList}
        onOpenBag={() => router.push('/day-plan')}
        entryActionsInHeader
        hideCharacterHeading
        key={`${todayKey}:${generationJob ?? ''}`}
        date={todayKey}
        ink={ink}
        muted={muted}
        isDark={isDark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  header: { minHeight: 70, flex: 1, justifyContent: 'center' },
  headerMainRow: { height: 44, flexDirection: 'row', alignItems: 'center' },
  diaryTitleHit: { minHeight: 44, flex: 1, minWidth: 0, justifyContent: 'center' },
  entryRow: { height: 26, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
});
