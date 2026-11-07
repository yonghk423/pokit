import { HeroPolaroidOverviewIcon } from './HeroPolaroidOverviewIcon';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { useWallpaperStore } from '@shared/lib/wallpaper/wallpaperStore';
import { DIARY_DATE_FONT_SIZE } from '@shared/lib/ui-font';
import { HeroCharacterPickerActionContext } from '../model/heroCharacterPickerAction';
import { getLocalDateKey } from '@entities/day-plan';
import { useTodayDate } from '@shared/lib/time/useTodayDate';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { RetroFlatColors } from '@shared/config/retroFlat';
import { ThemedText } from '@shared/ui/themed-text';
import { useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
  const router = useRouter();
  const { t } = useTranslation();
  const [overviewOpen, setOverviewOpen] = useState(false);
  const { generationJob, historyCreate, historyEntry } = useLocalSearchParams<{ generationJob?: string; historyCreate?: string; historyEntry?: string }>();
  const isDark = useColorScheme() === 'dark';
  const todayKey = getLocalDateKey(useTodayDate());
  const [photoActive, setPhotoActive] = useState(false);
  const [headerCharacterList, setHeaderCharacterList] = useState<ReactNode>(null);
  const plannerRef = useRef<ComicDiaryHandle>(null);
  const characterPicker = useContext(HeroCharacterPickerActionContext);
  useFocusEffect(useCallback(() => {
    if (!historyCreate) return;
    plannerRef.current?.openNewDiary();
    router.setParams({ historyCreate: undefined });
  }, [historyCreate, router]));
  const registerPhoto = characterPicker?.registerPhoto;
  // Other tabs queue the camera intent before navigating. Consume it only
  // after the main screen has focus and its planner ref is mounted again.
  useFocusEffect(useCallback(() => {
    registerPhoto?.(() => plannerRef.current?.openPhotoEntry());
    return () => registerPhoto?.(null);
  }, [registerPhoto]));
  const registerHome = characterPicker?.register;
  useFocusEffect(useCallback(() => {
    registerHome?.((restoreOnly = false) => restoreOnly || photoActive ? plannerRef.current?.openSceneEntry(restoreOnly) : plannerRef.current?.openCharacterPicker());
    return () => registerHome?.(null);
  }, [registerHome, photoActive]));
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
  const hasWallpaper = useWallpaperStore(state => state.wallpaper !== 'default');
  const surface = hasWallpaper ? 'transparent' : isDark ? tone.bg : 'transparent';

  useEffect(() => {
    setShellBackground?.(isDark ? null : '#F7F6F4');
    registerComicDiaryLight(!isDark);
    return () => {
      setShellBackground?.(null);
      registerComicDiaryLight(false);
    };
  }, [isDark, setShellBackground, registerComicDiaryLight]);

  const todayButton = useMemo(() => <View testID="comic-date-navigation" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: ink, fontSize: DIARY_DATE_FONT_SIZE, lineHeight: 26 }}>{todayKey.replace(/-/g, '.')}</ThemedText></View>, [ink, todayKey]);
  useLayoutEffect(() => { registerCenterActions?.(todayButton); return () => registerCenterActions?.(null); }, [registerCenterActions, todayButton]);
  const overviewButton = useMemo(() => photoActive ? null : <Pressable testID="comic-header-toggle-overview" accessibilityRole="button" accessibilityLabel={t(overviewOpen ? 'comicDay.showCards' : 'comicDay.boardView')} accessibilityState={{ expanded: overviewOpen }} onPress={() => { tapHaptic('select'); setOverviewOpen(value => !value); }} style={({ pressed }) => ({ width: 40, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
    <HeroPolaroidOverviewIcon ink={ink} expanded={overviewOpen} />
  </Pressable>, [photoActive, overviewOpen, t, ink]);
  useLayoutEffect(() => { registerWeatherActions?.(overviewButton); return () => registerWeatherActions?.(null); }, [registerWeatherActions, overviewButton]);
  useEffect(() => { setOverviewOpen(false); }, [todayKey, photoActive]);
  const header = useMemo(() => (
    <View style={styles.header}>
      {!registerCenterActions ? <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { top: 0, bottom: undefined, height: 44, alignItems: 'center', justifyContent: 'center', zIndex: 1 }]}>{todayButton}</View> : null}
      <View style={styles.headerMainRow}>
        <View style={{ width: 42, height: 44 }} />
        <View style={styles.diaryTitleHit} />
      </View>
      {headerCharacterList ? <View style={styles.entryRow}>{headerCharacterList}</View> : null}
    </View>
  ), [headerCharacterList, registerCenterActions, todayButton]);
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
        overviewOpen={overviewOpen}
        onOverviewChange={setOverviewOpen}
        onPhotoEntryChange={setPhotoActive}
        onHeaderCharacterListChange={setHeaderCharacterList}
        onOpenBag={() => router.push('/day-plan')}
        entryActionsInHeader
        hideCharacterHeading
        key={`${todayKey}:${generationJob ?? ''}:${historyEntry ?? ''}`}
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
  header: { minHeight: 44 },
  headerMainRow: { height: 44, flexDirection: 'row', alignItems: 'center' },
  diaryTitleHit: { minHeight: 44, flex: 1, minWidth: 0, justifyContent: 'center' },
  entryRow: { height: 26, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
});
