import { Image as ExpoImage } from 'expo-image';
import { useStoreArtwork } from '../../src/pages/day-plan/lib/storeArtwork';
import { CityCalendarPackCover } from '../../src/pages/day-plan/ui/CityCalendarPackCover';
import { applyHeroDiaryClip, useHeroDiaryClip } from '../../src/pages/day-plan/model/heroDiaryClip';
import { HeroBlueClipPreview } from '../../src/pages/day-plan/ui/HeroBlueClipPreview';
import { useCanvasEventDates } from '../../src/pages/day-plan/model/heroCanvasEvents';
import { useDeviceEvents } from '@features/apple-calendar/useDeviceEvents';
import { eventsOnDay } from '@features/apple-calendar/calendarDates';
import { HeroTrashIcon } from '../../src/pages/day-plan/ui/HeroTrashIcon';
import { AppAlert } from '@shared/lib/app-alert';
import { illustrationCalendarBackgroundUri } from '../../src/pages/day-plan/lib/illustrationCalendarAssets';
import { isCityCalendarPackReady, downloadCityCalendarPack, removeCityCalendarPack } from '../../src/pages/day-plan/lib/cityCalendarPack';
import { applyHeroCalendarDesign, CITY_CALENDAR_THEMES, useHeroCalendarDesign } from '../../src/pages/day-plan/model/heroCalendarDesign';
import { SettingsTopBarButton } from '../../src/pages/day-plan/ui/SettingsTopBarButton';
import { palette } from '../../src/pages/day-plan/lib/dayPlanPalette';
import { HeroIllustrationCalendar } from '../../src/pages/day-plan/ui/HeroIllustrationCalendar';
import { loadIllustrationCalendarAssets, isIllustrationCalendarInstalled } from '../../src/pages/day-plan/lib/illustrationCalendarAssets';
import { memo, useMemo, useCallback, useContext, useLayoutEffect, useState, useEffect } from 'react';
import { Image, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter, useLocalSearchParams } from 'expo-router';
import { NativeTabContent } from '@shared/ui/native-tab-content';
import { ThemedText } from '@shared/ui/themed-text';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useTodayDate } from '@shared/lib/time/useTodayDate';
import { useTranslation } from '@shared/lib/i18n';
import { getLocalDateKey } from '@entities/day-plan';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { DayPlanTabScreenShell } from '@pages/day-plan';
import { DayPlanHeaderCenterActionsContext } from '../../src/pages/day-plan/model/dayPlanHeaderActions';
import { HeroCalendarDesigns } from '../../src/pages/day-plan/ui/HeroCalendarDesigns';
import { loadComicDiaryLibrary, type ComicDiary } from '../../src/pages/day-plan/lib/heroDiaryStorage';

import { setIllustrationCalendarMode } from '../../src/pages/day-plan/model/illustrationCalendarMode';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDayPlanTabBridge } from '../../src/pages/day-plan/model/dayPlanTabBridge';
import { scheduleIdleTask } from '@shared/lib/scheduleIdleTask';

type CalendarView = 'diary' | 'calendar' | 'illustrationGallery' | 'illustrationDiary';

const PREVIEW_DIARIES: ComicDiary[] = [];
const ignorePreviewDate = () => {};
const raisedPackAction = (pressed: boolean) => ({
  minHeight: 48,
  paddingVertical: 12,
  paddingHorizontal: 12,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: '#FFFFFF',
  borderRadius: 24,
  borderWidth: 1,
  borderTopColor: '#FFFFFF',
  borderLeftColor: '#FFFFFF',
  borderRightColor: '#E5E5E5',
  borderBottomColor: '#D8D8D8',
  shadowColor: '#000000',
  shadowOffset: { width: pressed ? 2 : 5, height: pressed ? 3 : 7 },
  shadowOpacity: pressed ? 0.10 : 0.18,
  shadowRadius: pressed ? 3 : 7,
  elevation: pressed ? 2 : 6,
});

type CityTheme = typeof CITY_CALENDAR_THEMES[number];
const IllustrationThemeCard = memo(function IllustrationThemeCard({ theme, width, height, dark, selected, error, onApply }: {
  theme: CityTheme; width: number; height: number; dark: boolean; selected: boolean; error: boolean; onApply: (theme: CityTheme) => void;
}) {
  const [previewReady, setPreviewReady] = useState(false);
  const today = useTodayDate();
  const month = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1, 12), [today]);
  const previewScale = width / 390;
  const canvasHeight = height / previewScale;
  const ink = dark ? '#E8E5DF' : '#242321';
  const apply = useCallback(() => onApply(theme), [onApply, theme]);
  return <Pressable testID={`illustration-theme-${theme.themeId}`} accessibilityRole="button" accessibilityLabel={`${theme.title} 캘린더 적용`} accessibilityState={{ selected }} onPress={apply} style={{ width }}>
    <View style={{ width, height }}><ExpoImage source={{ uri: illustrationCalendarBackgroundUri(theme.themeId) }} contentFit="cover" cachePolicy="memory" transition={0} allowDownscaling onDisplay={() => setPreviewReady(true)} style={{ width, height, borderRadius: 14, shadowColor: '#27231E', shadowOpacity: 0.25, shadowRadius: 9, shadowOffset: { width: 0, height: 7 } }} />{!previewReady ? <View pointerEvents="none" style={{ position: 'absolute', width, height, borderRadius: 14, backgroundColor: '#E6E5E1' }} /> : null}</View>
    <View style={{ padding: 8, minHeight: 68, gap: 2 }}>
      <ThemedText numberOfLines={2} style={{ color: ink, fontSize: 12, lineHeight: 16 }}>{theme.title}</ThemedText>
      <ThemedText accessible={selected} accessibilityElementsHidden={!selected} importantForAccessibility={selected ? 'auto' : 'no-hide-descendants'} style={{ minHeight: 16, color: '#278B77', fontSize: 11, lineHeight: 16, textAlign: 'center', opacity: selected ? 1 : 0 }}>적용 중</ThemedText>
      {error ? <ThemedText accessibilityLiveRegion="polite" style={{ color: ink, fontSize: 12 }}>적용하지 못했어요. 사진을 눌러 다시 시도해주세요.</ThemedText> : null}
    </View>
  </Pressable>;
});

function CalendarContent({ view, setView }: { view: CalendarView; setView: (value: CalendarView) => void }) {
  const { artwork: storeArtwork, failed: storeArtworkFailed, retry: retryStoreArtwork } = useStoreArtwork();
  const selectedDesign = useHeroCalendarDesign();
  const selectedClip = useHeroDiaryClip();
  const [diaryCategory, setDiaryCategory] = useState<'clip' | 'trash' | 'camera'>('clip');
  const windowSize = useWindowDimensions();
  // Match the source artwork (853 × 1844), using one scale for both axes.
  const previewWidth = Math.max(1, Math.min(200, windowSize.width - 48, windowSize.height * 0.55 * 853 / 1844));
  const calendarThemeWidth = Math.max(1, (windowSize.width - 40) / 3);
  const calendarThemeHeight = calendarThemeWidth * 1844 / 853;
  const insets = useSafeAreaInsets();
  const { tabBarHeight } = useDayPlanTabBridge();
  const calendarBottomInset = Math.max(tabBarHeight, 56 + Math.max(insets.bottom, 34) + 8) + 12;
  const router = useRouter();
  const { t, locale } = useTranslation();
  const today = useTodayDate();
  const todayKey = getLocalDateKey(today);
  const isDark = useColorScheme() === 'dark';
  const ink = isDark ? '#E8E5DF' : '#242321';
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1, 12));
  const linkedEvents = useDeviceEvents(month.getFullYear(), month.getMonth(), locale === 'ko');
  const localEventDates = useCanvasEventDates(month.getFullYear(), month.getMonth());
  const eventDates = [...new Set([...localEventDates, ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index + 1)).filter(day => eventsOnDay(linkedEvents.events, day).length).map(getLocalDateKey)])];

  const [packOpen, setPackOpen] = useState(false);
  useFocusEffect(useCallback(() => { setPackOpen(false); }, []));
  const [packReady, setPackReady] = useState(false);
  const [packProgress, setPackProgress] = useState<number | null>(null);
  const [packError, setPackError] = useState(false);
  const [deletingPack, setDeletingPack] = useState(false);
  const removePack = async () => {
    if (deletingPack) return;
    setDeletingPack(true); setPackOpen(false);
    try {
      await removeCityCalendarPack();
      setPackReady(false); setPackError(false); setPackProgress(null);
    } catch { AppAlert.alert('삭제 실패', '달력 파일을 삭제하지 못했어요. 다시 시도해주세요.'); }
    finally { setDeletingPack(false); }
  };
  useEffect(() => {
    let active = true;
    isCityCalendarPackReady()
      .then(ready => { if (active) setPackReady(ready); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const downloadPack = async () => {
    if (packProgress !== null) return;
    setPackOpen(false); setPackReady(false); setPackProgress(0); setPackError(false);
    try {
      await downloadCityCalendarPack(setPackProgress);
      setPackReady(true);
    } catch { setPackError(true); }
    finally { setPackProgress(null); }
  };
  const [illustrationCanvas, setIllustrationCanvas] = useState({ width: 0, height: 0 });
  const [themeError, setThemeError] = useState<string | null>(null);
  const applyTheme = useCallback((theme: CityTheme) => {
    tapHaptic('select');
    // The pack is already installed. Verify its local files without a download state.
    void loadIllustrationCalendarAssets(theme.themeId).then(() => {
      setThemeError(null);
      applyHeroCalendarDesign(theme.design);
    }).catch(() => setThemeError(theme.themeId));
  }, []);
  const [diaries, setDiaries] = useState<ComicDiary[]>(() => loadComicDiaryLibrary(todayKey, number => t('comicDiary.defaultTitle', { number })).diaries);
  const registerCenter = useContext(DayPlanHeaderCenterActionsContext);
  useFocusEffect(useCallback(() => {
    // Keep the prepared calendar visible during the native tab transition.
    let task: ReturnType<typeof scheduleIdleTask> | undefined;
    const timer = setTimeout(() => { task = scheduleIdleTask(() => {
      const next = loadComicDiaryLibrary(todayKey, number => t('comicDiary.defaultTitle', { number })).diaries;
      setDiaries(previous => previous.length === next.length && previous.every((diary, index) => diary.id === next[index]?.id && diary.updatedAt === next[index]?.updatedAt && diary.scenes.length === next[index]?.scenes.length) ? previous : next);
    });
    }, 200);
    return () => { clearTimeout(timer); task?.cancel(); };
  }, [todayKey, t]));
  useLayoutEffect(() => {
    registerCenter?.(null);
    return () => registerCenter?.(null);
  }, [registerCenter]);
  const openDate = (diaryDate: string) => router.navigate({ pathname: '/(tabs)', params: { diaryDate } });
  const selector = <View accessibilityRole="tablist" style={{ alignSelf: 'center', flexDirection: 'row', borderRadius: 20, padding: 4, gap: 3, backgroundColor: '#EEEEEE', borderWidth: 1, borderTopColor: '#FFFFFF', borderLeftColor: '#FFFFFF', borderRightColor: '#E2E2E2', borderBottomColor: '#DCDCDC', shadowColor: '#000000', shadowOffset: { width: 5, height: 7 }, shadowOpacity: 0.18, shadowRadius: 7, elevation: 6, marginTop: -6, marginBottom: 10 }}>
    {([
      ['calendar', t('comicCalendar.viewCalendar')],
      ['illustrationGallery', t('comicCalendar.viewIllustrationDiary')],
      ['diary', locale === 'ko' ? '다이어리' : 'Diary'],
    ] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: view === key }} onPress={() => { tapHaptic('select'); setPackOpen(false); setView(key); }} style={({ pressed }) => ({ minHeight: 40, minWidth: 0, paddingHorizontal: 14, flexShrink: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: view === key || pressed ? '#FFFFFF' : 'transparent', borderWidth: 1, borderColor: view === key || pressed ? '#FFFFFF' : 'transparent', borderBottomColor: view === key || pressed ? '#DCDCDC' : 'transparent', shadowColor: '#000000', shadowOffset: { width: pressed ? 2 : 5, height: pressed ? 3 : 7 }, shadowOpacity: view === key ? (pressed ? 0.10 : 0.18) : 0, shadowRadius: pressed ? 3 : 7, elevation: view === key ? (pressed ? 2 : 6) : 0 })}>
      <ThemedText numberOfLines={1} style={{ color: '#000000', fontSize: 13 }}>{label}</ThemedText>
    </Pressable>)}
  </View>;
  return <View style={{ flex: 1, minHeight: 0 }}>
    {view !== 'illustrationDiary' ? selector : null}
    {!storeArtwork ? <Pressable disabled={!storeArtworkFailed} onPress={retryStoreArtwork} accessibilityLabel={storeArtworkFailed ? '이미지 다시 불러오기' : '상품 준비 중'} style={{ margin: 24, height: 320, borderRadius: 20, backgroundColor: '#E6E5E1', justifyContent: 'center', alignItems: 'center' }}>{storeArtworkFailed ? <ThemedText>이미지 다시 불러오기</ThemedText> : null}</Pressable> : view === 'diary'
      ? <View style={{ flex: 1, minHeight: 0 }}>
        <View accessibilityRole="tablist" style={{ alignSelf: 'center', flexDirection: 'row', gap: 12, paddingVertical: 12 }}>
          {([['clip', locale === 'ko' ? '집게' : 'Clips'], ['trash', locale === 'ko' ? '휴지통' : 'Trash cans'], ['camera', locale === 'ko' ? '카메라' : 'Cameras']] as const).map(([category, label]) => <Pressable key={category} testID={`diary-category-${category}`} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: diaryCategory === category }} onPress={() => { tapHaptic('select'); setDiaryCategory(category); }} style={{ minWidth: 74, minHeight: 42, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: diaryCategory === category ? '#F8F8FA' : 'transparent', boxShadow: diaryCategory === category ? '-3px -3px 8px rgba(255,255,255,0.95), 3px 3px 8px rgba(126,127,145,0.22)' : 'none' }}>
            <ThemedText style={{ color: ink, fontSize: 14, opacity: diaryCategory === category ? 1 : 0.55 }}>{label}</ThemedText>
          </Pressable>)}
        </View>
        <ScrollView key={diaryCategory} testID="diary-items-gallery" contentContainerStyle={{ padding: 20, paddingBottom: 120, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 12 }}>
          {diaryCategory === 'clip' ? (['blue', 'black'] as const).map(clip => <Pressable key={clip} testID={`diary-item-${clip}-clip`} accessibilityRole="button" accessibilityState={{ selected: selectedClip === clip, disabled: selectedClip === clip }} disabled={selectedClip === clip} onPress={() => { tapHaptic('select'); applyHeroDiaryClip(clip); }} style={{ width: (windowSize.width - 64) / 3, padding: 8, gap: 6 }}>
            <HeroBlueClipPreview dark={isDark} clip={clip} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ThemedText numberOfLines={1} adjustsFontSizeToFit style={{ color: ink, fontSize: 14, flexShrink: 1 }}>{clip === 'blue' ? (locale === 'ko' ? '파란 집게' : 'Blue Clip') : (locale === 'ko' ? '검은 집게' : 'Black Clip')}</ThemedText>
            </View>
            <ThemedText style={{ color: selectedClip === clip ? '#278B77' : ink, opacity: selectedClip === clip ? 1 : 0.6, textAlign: 'center', fontSize: 13 }}>{selectedClip === clip ? (locale === 'ko' ? '적용 중' : 'Applied') : (locale === 'ko' ? '무료' : 'Free')}</ThemedText>
          </Pressable>) : diaryCategory === 'trash' ? <View testID="diary-item-mesh-trash" accessible accessibilityLabel={locale === 'ko' ? '메쉬 휴지통, 적용 중' : 'Mesh wastebasket, applied'} style={{ width: (windowSize.width - 64) / 3, padding: 8, gap: 6, alignItems: 'center' }}>
            <View style={{ width: '100%', height: 56, overflow: 'visible', justifyContent: 'center', alignItems: 'center' }}><ExpoImage source={storeArtwork.trash} contentFit="contain" transition={0} style={{ width: 40, height: 48 }} /></View>
            <ThemedText numberOfLines={2} style={{ color: ink, fontSize: 14, textAlign: 'center' }}>{locale === 'ko' ? '메쉬 휴지통' : 'Mesh wastebasket'}</ThemedText>
            <ThemedText style={{ color: '#278B77', textAlign: 'center', fontSize: 13 }}>{locale === 'ko' ? '적용 중' : 'Applied'}</ThemedText>
          </View> : <View testID="diary-item-classic-camera" accessible accessibilityLabel={locale === 'ko' ? '인스탁스 미니 에보, 적용 중' : 'instax mini Evo, applied'} style={{ width: (windowSize.width - 64) / 3, padding: 8, gap: 6, alignItems: 'center' }}>
            <View style={{ width: '100%', height: 56, justifyContent: 'center', alignItems: 'center' }}><ExpoImage source={storeArtwork.camera} contentFit="contain" transition={0} style={{ width: '80%', height: 48 }} /></View>
            <ThemedText numberOfLines={2} style={{ color: ink, fontSize: 14, textAlign: 'center' }}>{locale === 'ko' ? '인스탁스 미니 에보' : 'instax mini Evo'}</ThemedText>
            <ThemedText style={{ color: '#278B77', textAlign: 'center', fontSize: 13 }}>{locale === 'ko' ? '적용 중' : 'Applied'}</ThemedText>
          </View>}
        </ScrollView>
      </View>
      : view === 'calendar'
      ? <View style={{ flex: 1, minHeight: 0 }}><HeroCalendarDesigns today={today} month={month} diaries={diaries} onSelectDate={openDate} /></View>
      : view === 'illustrationGallery'
      ? <ScrollView testID="illustration-calendar-gallery" contentContainerStyle={packReady && packOpen
        ? { paddingHorizontal: 12, paddingVertical: 16, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'flex-start', columnGap: 8, rowGap: 12 }
        : { paddingHorizontal: 12, paddingVertical: 20, alignItems: 'center', gap: 20 }}>
          {!(packReady && packOpen) ? <View style={{ width: previewWidth }}>
            <Pressable disabled={!packReady || deletingPack} onPress={() => { tapHaptic('select'); setPackOpen(true); }} accessibilityRole="button" accessibilityLabel="시티 애니메이션 캘린더 열기" style={{ borderRadius: 14, backgroundColor: '#FFFFFF', shadowColor: '#27231E', shadowOpacity: 0.25, shadowRadius: 9, shadowOffset: { width: 0, height: 7 }, elevation: 6 }}>
              <CityCalendarPackCover width={previewWidth} month={month} />
            </Pressable>
            <View style={{ paddingVertical: 16, gap: 10 }}>
              <View style={{ marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <ThemedText style={{ color: ink, flexShrink: 1 }}>시티 애니메이션</ThemedText>
                <ThemedText style={{ color: ink, opacity: 0.65, fontSize: 13 }}>{locale === 'ko' ? '무료' : 'Free'}</ThemedText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable disabled={packProgress !== null || deletingPack} onPress={() => { if (packReady) setPackOpen(true); else void downloadPack(); }} accessibilityRole="button" style={({ pressed }) => [raisedPackAction(pressed), { flex: 1, minWidth: 0, paddingHorizontal: 8 }]}>
                <ThemedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ color: '#000000', fontSize: 13, lineHeight: 24, textAlign: 'center', flexShrink: 1 }}>{packProgress !== null ? `다운로드 중 ${packProgress}/${CITY_CALENDAR_THEMES.length}` : packReady ? `다운로드 완료 ${CITY_CALENDAR_THEMES.length}/${CITY_CALENDAR_THEMES.length}` : packError ? '다운로드 다시 시도' : `캘린더 ${CITY_CALENDAR_THEMES.length}종 다운로드`}</ThemedText>
              </Pressable>
              {packReady && <Pressable testID="delete-city-calendar-pack" accessibilityRole="button" accessibilityLabel="다운로드한 캘린더 삭제" disabled={deletingPack} onPress={() => {
                AppAlert.alert('캘린더를 삭제할까요?', '다운로드한 시티 애니메이션 캘린더를 삭제합니다. 나중에 다시 다운로드할 수 있어요.', [
                  { text: '취소', style: 'cancel' },
                  { text: '삭제', style: 'destructive', onPress: () => { void removePack(); } },
                ]);
              }} style={({ pressed }) => [raisedPackAction(pressed), { width: 48, height: 48, paddingHorizontal: 0, paddingVertical: 0, opacity: deletingPack ? 0.4 : 1 }]}><HeroTrashIcon size={26} color="#000000" /></Pressable>}
              </View>
              {packProgress !== null && <ThemedText accessibilityLiveRegion="polite" style={{ color: ink, fontSize: 12, textAlign: 'center' }}>다운로드가 완료될 때까지 앱을 종료하지 마세요.</ThemedText>}
            </View>
          </View> : <Pressable onPress={() => setPackOpen(false)} style={{ width: '100%', minHeight: 36, justifyContent: 'center' }}><ThemedText style={{ color: ink }}>‹ 일러스트 + 캘린더 목록으로</ThemedText></Pressable>}
          {packReady && packOpen && CITY_CALENDAR_THEMES.map(theme => <IllustrationThemeCard key={theme.design} theme={theme} width={calendarThemeWidth} height={calendarThemeHeight} dark={isDark} selected={selectedDesign === theme.design} error={themeError === theme.themeId} onApply={applyTheme} />)}
        </ScrollView>
      : <View testID="illustration-diary-calendar" style={{ flex: 1, minHeight: 0, backgroundColor: '#F7F6F4' }} onLayout={({ nativeEvent: { layout } }) => setIllustrationCanvas(old => old.width === layout.width && old.height === layout.height ? old : { width: layout.width, height: layout.height })}>
        {illustrationCanvas.width > 0 && illustrationCanvas.height > 0 ? <HeroIllustrationCalendar eventDates={eventDates} month={month} today={today} diaries={diaries} width={illustrationCanvas.width} height={illustrationCanvas.height} topInset={insets.top} bottomInset={calendarBottomInset} onSelectDate={openDate} onMoveMonth={delta => setMonth(value => new Date(value.getFullYear(), value.getMonth() + delta, 1, 12))} onNavigate={tab => router.navigate(tab === 'index' ? '/(tabs)' : '/(tabs)/history')} onChangeMode={() => setView('illustrationGallery')} /> : null}
        <View style={{ position: 'absolute', top: insets.top + 8, left: 20, zIndex: 30 }}><SettingsTopBarButton c={palette(isDark)} /></View>
      </View>}
  </View>;
}

export default function CalendarTabScreen() {
  const params = useLocalSearchParams<{ view?: string }>();
  const [view, setView] = useState<CalendarView>('calendar');
  useEffect(() => { if (params.view === 'illustrationDiary') setView('illustrationGallery'); }, [params.view]);
  useEffect(() => { setIllustrationCalendarMode(view === 'illustrationDiary'); return () => setIllustrationCalendarMode(false); }, [view]);
  const content = <CalendarContent view={view} setView={setView} />;
  return view === 'illustrationDiary' ? content : <NativeTabContent chromeColor="transparent"><DayPlanTabScreenShell tabName="calendar">{content}</DayPlanTabScreenShell></NativeTabContent>;
}
