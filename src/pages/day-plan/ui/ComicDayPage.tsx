import { HeroEntryActions } from './HeroEntryActions';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HeroCalendarIcon } from './HeroDiaryCalendar';
import { getLocalDateKey } from '@entities/day-plan';
import { useTodayDate } from '@shared/lib/time/useTodayDate';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTranslation } from '@shared/lib/i18n';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { ThemedText } from '@shared/ui/themed-text';
import { useContext, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
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
  const plannerRef = useRef<ComicDiaryHandle>(null);
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

  const todayButton = useMemo(() => <Pressable testID="comic-today-open" accessibilityRole="button" accessibilityLabel="Today" onPress={() => { tapHaptic(); plannerRef.current?.openToday(); }} style={{ minWidth: 64, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: ink, fontSize: 13, lineHeight: 20 }}>Today</ThemedText></Pressable>, [ink]);
  useLayoutEffect(() => { registerCenterActions?.(todayButton); return () => registerCenterActions?.(null); }, [registerCenterActions, todayButton]);
  const calendarLabel = t('comicCalendar.open');
  const calendarButton = useMemo(() => <Pressable testID="comic-calendar-open" accessibilityRole="button" accessibilityLabel={calendarLabel} hitSlop={6} onPress={() => { tapHaptic(); plannerRef.current?.openCalendar(); }} style={{ width: 32, minHeight: 28, alignItems: 'center', justifyContent: 'center' }}><HeroCalendarIcon ink={ink} size={23} /></Pressable>, [calendarLabel, ink]);
  useLayoutEffect(() => { registerWeatherActions?.(calendarButton); return () => registerWeatherActions?.(null); }, [registerWeatherActions, calendarButton]);
  const header = useMemo(() => (
    <View style={styles.header}>
      {!registerCenterActions ? <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', zIndex: 1 }]}>{todayButton}</View> : null}
      <View style={styles.headerMainRow}>
        <ComicDiaryMenuButton onPress={() => plannerRef.current?.openLibrary()} />
        <View style={styles.diaryTitleHit} />
        {!registerWeatherActions ? calendarButton : null}
      </View>
      <View style={styles.entryRow}><HeroEntryActions compact ink={ink} onPhoto={() => plannerRef.current?.openPhotoEntry()} onScenes={() => plannerRef.current?.openSceneEntry()} /></View>
    </View>
  ), [ink, registerWeatherActions, calendarButton, registerCenterActions, todayButton]);
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
  entryRow: { height: 26, flexDirection: 'row', alignItems: 'center' },
});
