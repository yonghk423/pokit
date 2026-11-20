import { matchesStoreAccess, type StoreAccessFilter } from '../../src/pages/day-plan/model/storeAccessFilter';
import { useWallpaperStore } from '@shared/lib/wallpaper/wallpaperStore';
import { useSyncExternalStore } from 'react';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { resetDiaryItem } from '../../src/pages/day-plan/model/resetDiaryItem';
import { proDiaryCatalog } from '../../src/pages/day-plan/model/proDiaryCatalog';
import { DiaryThemeGallery } from '../../src/pages/day-plan/ui/DiaryThemeGallery';
import { categoryNames, type ThemeSlot, useDiaryTheme } from '../../src/pages/day-plan/model/diaryTheme';
import { PhotoWallStorePreview } from '../../src/pages/day-plan/ui/PhotoWallStorePreview';
import { installDiaryItem, diaryImages, storeDownloadErrorMessage } from '../../src/pages/day-plan/lib/calendarStoreDownload';
import { selectCanTestProStoreItems, useSubscriptionStore } from '@features/subscriptions';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { ILLUSTRATION_CALENDAR_CATEGORIES, type IllustrationCalendarCategoryId } from '../../src/pages/day-plan/model/illustrationCalendarCategories';
import { applyHeroPhotoWall, useHeroPhotoWall } from '../../src/pages/day-plan/model/heroPhotoWall';
import { Image as ExpoImage } from 'expo-image';
import { useStoreArtwork } from '../../src/pages/day-plan/lib/storeArtwork';
import { CityCalendarPackCover } from '../../src/pages/day-plan/ui/CityCalendarPackCover';
import { DIARY_CLIPS, applyHeroDiaryClip, useHeroDiaryClip } from '../../src/pages/day-plan/model/heroDiaryClip';
import { isProTrashBinStyle, applyHeroTrashBinStyle, HERO_TRASH_BIN_ITEMS, HERO_TRASH_BIN_PREVIEWS, useHeroTrashBinStyle } from '../../src/pages/day-plan/model/heroTrashBinStyle';
import { isProCameraStyle, applyHeroCameraStyle, HERO_CAMERA_STORE_ITEMS, useHeroCameraStyle } from '../../src/pages/day-plan/model/heroCameraStyle';
import { HeroBlueClipPreview } from '../../src/pages/day-plan/ui/HeroBlueClipPreview';
import { CameraStoreIcon } from '../../src/pages/day-plan/ui/CameraStoreIcon';
import { useCanvasEventDates } from '../../src/pages/day-plan/model/heroCanvasEvents';
import { useDeviceEvents } from '@features/apple-calendar/useDeviceEvents';
import { eventsOnDay } from '@features/apple-calendar/calendarDates';
import { HeroTrashIcon } from '../../src/pages/day-plan/ui/HeroTrashIcon';
import { AppAlert } from '@shared/lib/app-alert';
import { illustrationCalendarBackgroundUri } from '../../src/pages/day-plan/lib/illustrationCalendarAssets';
import { getCalendarPackDownload, subscribeCalendarPackDownloads, isCityCalendarPackReady, downloadCityCalendarPack, removeCityCalendarPack, calendarPackThemes, isProCalendarPack, type CalendarPackId } from '../../src/pages/day-plan/lib/cityCalendarPack';
import { applyHeroCalendarDesign, CITY_CALENDAR_THEMES, EVERYDAY_CINEMA_THEMES, useHeroCalendarDesign } from '../../src/pages/day-plan/model/heroCalendarDesign';
import { SettingsTopBarButton } from '../../src/pages/day-plan/ui/SettingsTopBarButton';
import { palette } from '../../src/pages/day-plan/lib/dayPlanPalette';
import { HeroIllustrationCalendar } from '../../src/pages/day-plan/ui/HeroIllustrationCalendar';
import { loadIllustrationCalendarAssets, isIllustrationCalendarInstalled } from '../../src/pages/day-plan/lib/illustrationCalendarAssets';
import { memo, useRef, useMemo, useCallback, useContext, useLayoutEffect, useState, useEffect } from 'react';
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
import { usePremiumPackPaywall } from '../../src/pages/day-plan/ui/usePremiumPackPaywall';

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


function CalendarPackStore({ pack, width, month, dark }: {
  pack: CalendarPackId; width: number; month: Date; dark: boolean;
}) {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const openPack = () => router.push({ pathname: '/calendar-pack', params: { pack } });
  const downloadState = useSyncExternalStore(subscribeCalendarPackDownloads, () => getCalendarPackDownload(pack));
  const progress = downloadState.status === 'downloading' ? downloadState.count : null;
  const failed = downloadState.status === 'error';
  const [deleting, setDeleting] = useState(false);
  const themes = calendarPackThemes(pack);
  const title = pack === 'season-spring' ? translateUiText('봄') : pack === 'season-summer' ? translateUiText('여름') : pack === 'season-autumn' ? translateUiText('가을') : pack === 'season-winter' ? translateUiText("겨울") : pack === 'city' ? translateUiText("시티 애니메이션") : pack === 'warm-sepia' ? 'Warm Sepia Open Panel' : pack === 'citypop-retro' ? translateUiText("시티팝 레트로") : pack === 'textured-watercolor' ? translateUiText("텍스처 수채화") : 'Everyday Cinema';
  const ink = dark ? '#E8E5DF' : '#242321';
  const proPack = (pack.startsWith('season-') || FEATURE_FLAGS.proIllustrationPacks) && isProCalendarPack(pack);
  const isPro = useSubscriptionStore(selectCanTestProStoreItems);
  const paywall = usePremiumPackPaywall();
  useEffect(() => { let active = true; void isCityCalendarPackReady(pack).then(value => { if (active) setReady(value); }).catch(() => undefined); return () => { active = false; }; }, [pack, downloadState.status]);
  const unlockPack = async () => {
    if (!proPack || isPro) return true;
    const result = await paywall.present();
    return (result === 'purchased' || result === 'restored') && selectCanTestProStoreItems(useSubscriptionStore.getState());
  };
  const download = async () => {
    if (progress !== null || deleting) return;
    if (!(await unlockPack())) return;
    if (ready) { openPack(); return; }
    try { await downloadCityCalendarPack(() => {}, pack); setReady(true); }
    catch { /* The shared download state retains the failure across tab changes. */ }
  };
  const remove = async () => {
    setDeleting(true);
    try { await removeCityCalendarPack(pack); setReady(false); }
    catch { AppAlert.alert(translateUiText("삭제 실패"), translateUiText("다시 시도해주세요.")); }
    finally { setDeleting(false); }
  };
  return <View testID={`calendar-pack-${pack}`} style={{ width, gap: 12 }}>
      <Pressable disabled={!ready || deleting} onPress={() => void download()} accessibilityLabel={translateUiText("{title} 캘린더 열기", { title })}><CityCalendarPackCover width={width} month={month} pack={pack} /></Pressable>
      <View style={{ minHeight: 28, justifyContent: 'center', paddingHorizontal: 30 }}>
        <ThemedText numberOfLines={2} style={{ color: ink, fontSize: 12, textAlign: 'center' }}>{title}</ThemedText>
        <ThemedText style={{ position: 'absolute', right: 0, color: proPack ? '#278B77' : ink, fontSize: 11 }}>{proPack ? 'Pro' : translateUiText("무료")}</ThemedText>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable disabled={progress !== null || deleting} onPress={() => void download()} style={({ pressed }) => [raisedPackAction(pressed), { flex: 1, minWidth: 0, paddingHorizontal: 4 }]}><ThemedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: '#000', fontSize: 12, textAlign: 'center' }}>{progress !== null ? translateUiText("다운로드 중 {count}/{total}", { count: progress, total: themes.length }) : ready ? translateUiText("다운로드 완료 {count}/{total}", { count: themes.length, total: themes.length }) : failed ? translateUiText("다운로드 다시 시도") : proPack && !isPro ? translateUiText("Pro 구독 후 다운로드") : translateUiText("캘린더 {count}종 다운로드", { count: themes.length })}</ThemedText></Pressable>
        {ready && <Pressable disabled={deleting || progress !== null} accessibilityLabel={translateUiText("{title} 다운로드 삭제", { title })} onPress={() => AppAlert.alert(translateUiText("캘린더를 삭제할까요?"), translateUiText("{title} 다운로드만 삭제합니다.", { title }), [{ text: translateUiText("취소"), style: 'cancel' }, { text: translateUiText("삭제"), style: 'destructive', onPress: () => void remove() }])} style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', opacity: pressed ? 0.65 : 1 })}><HeroTrashIcon size={26} color="#000" /></Pressable>}
      </View>
      {paywall.modal}
  </View>;
}

function CalendarContent({ view, setView }: { view: CalendarView; setView: (value: CalendarView) => void }) {
  const { artwork: storeArtwork, failed: storeArtworkFailed, retry: retryStoreArtwork } = useStoreArtwork();
  const selectedDesign = useHeroCalendarDesign();
  const themedClip = useDiaryTheme('clip');
  const themedWall = useDiaryTheme('photoWall');
  const selectedClip = useHeroDiaryClip();
  const isPro = useSubscriptionStore(selectCanTestProStoreItems);
  const themedTrash = useDiaryTheme('trash');
  const themedCamera = useDiaryTheme('camera');
  const selectedTrashBinStyle = useHeroTrashBinStyle();
  const selectedCameraStyle = useHeroCameraStyle();
  const photoWall = useHeroPhotoWall();
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const installLock = useRef(false);
  async function chooseItem(id: string, pro: boolean, apply: () => void) {
    if (installLock.current) return;
    tapHaptic('select');
    if (pro && !isPro) { router.push('/pro-preview'); return; }
    installLock.current = true;
    try {
      if (pro && !diaryImages(id)) {
        setLoadingItem(id); await installDiaryItem(id); }
      apply();
    } catch (error) { AppAlert.alert(translateUiText("다운로드 실패"), storeDownloadErrorMessage(error, locale === 'ko')); }
    finally { installLock.current = false; setLoadingItem(null); }
  }
  function itemStatus(id: string) {
    if (loadingItem === id) return translateUiText("다운로드 중");
    return diaryImages(id) ? 'Pro' : translateUiText("Pro · 다운로드");
  }
  const [moreDiaryCategories, setMoreDiaryCategories] = useState(false);
  const diaryCategoryScroll = useRef({ height: 170, content: 0, offset: 0 });
  const updateCategoryHint = () => { const { height, content, offset } = diaryCategoryScroll.current; setMoreDiaryCategories(offset <= 2 && content - height > 4); };
  const [accessFilter, setAccessFilter] = useState<StoreAccessFilter>('all');
  const [diaryCategory, setDiaryCategory] = useState<ThemeSlot | 'wall' | 'background'>('clip');
  const wallpaper = useWallpaperStore(state => state.wallpaper);
  const setWallpaper = useWallpaperStore(state => state.setWallpaper);
  const [illustrationCategory, setIllustrationCategory] = useState<IllustrationCalendarCategoryId>('character');
  const illustrationPacks = ILLUSTRATION_CALENDAR_CATEGORIES.find(category => category.id === illustrationCategory)?.packs ?? [];
  const windowSize = useWindowDimensions();
  const [diaryGalleryWidth, setDiaryGalleryWidth] = useState<number | null>(null);
  const diaryItemWidth = Math.max(1, Math.floor(((diaryGalleryWidth ?? windowSize.width) - 40 - 24) / 3));
  // Match the source artwork (853 × 1844), using one scale for both axes.
  const previewWidth = Math.max(1, Math.min(200, windowSize.width - 48, windowSize.height * 0.55 * 853 / 1844));
  const [illustrationGalleryWidth, setIllustrationGalleryWidth] = useState<number | null>(null);
  const calendarThemeWidth = Math.max(1, ((illustrationGalleryWidth ?? windowSize.width) - 32) / 2);
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

  const [illustrationCanvas, setIllustrationCanvas] = useState({ width: 0, height: 0 });
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
      ['diary', translateUiText("다이어리")],
    ] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: view === key }} onPress={() => { tapHaptic('select'); setView(key); }} style={({ pressed }) => ({ minHeight: 40, minWidth: 0, paddingHorizontal: 14, flexShrink: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: view === key || pressed ? '#FFFFFF' : 'transparent', borderWidth: 1, borderColor: view === key || pressed ? '#FFFFFF' : 'transparent', borderBottomColor: view === key || pressed ? '#DCDCDC' : 'transparent', shadowColor: '#000000', shadowOffset: { width: pressed ? 2 : 5, height: pressed ? 3 : 7 }, shadowOpacity: view === key ? (pressed ? 0.10 : 0.18) : 0, shadowRadius: pressed ? 3 : 7, elevation: view === key ? (pressed ? 2 : 6) : 0 })}>
      <ThemedText numberOfLines={1} style={{ color: '#000000', fontSize: 13 }}>{label}</ThemedText>
    </Pressable>)}
  </View>;
  const renderLegacyItems = (paidItems: boolean) => !matchesStoreAccess(accessFilter, paidItems) ? null : (diaryCategory === 'clip' ? DIARY_CLIPS.filter(item => item.pro === paidItems).map(({ id: clip, name, english, pro }) => <Pressable key={clip} testID={`diary-item-${clip}-clip`} accessibilityRole="button" accessibilityState={{ selected: !themedClip && selectedClip === clip }} onPress={() => { if (!themedClip && selectedClip === clip) { tapHaptic('select'); resetDiaryItem('clip'); } else void chooseItem('clip-' + clip, pro, () => applyHeroDiaryClip(clip)); }} style={{ width: diaryItemWidth, padding: 8, gap: 6 }}>
            <HeroBlueClipPreview dark={isDark} clip={clip} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <ThemedText numberOfLines={1} adjustsFontSizeToFit style={{ color: ink, fontSize: 14, flexShrink: 1 }}>{locale === 'en' ? english : translateUiText(name)}</ThemedText>
            </View>
            <ThemedText style={{ color: !themedClip && selectedClip === clip ? '#278B77' : ink, opacity: !themedClip && selectedClip === clip ? 1 : 0.6, textAlign: 'center', fontSize: 13 }}>{!themedClip && selectedClip === clip && (!pro || !!diaryImages('clip-' + clip)) ? (translateUiText("적용 중")) : pro ? itemStatus('clip-' + clip) : (translateUiText("무료"))}</ThemedText>
          </Pressable>) : diaryCategory === 'trash' ? HERO_TRASH_BIN_ITEMS.filter(item => isProTrashBinStyle(item.id) === paidItems).map(item => {
            const style = item.id;
            const selected = !themedTrash && selectedTrashBinStyle === style;
            const pro = isProTrashBinStyle(style);
            const status = selected ? (translateUiText("적용 중")) : pro ? itemStatus('trash-' + style) : (translateUiText("선택하기"));
            const title = locale === 'en' ? item.en : translateUiText(item.ko);
            const previewSize = style === 'mesh'
              ? { width: 40, height: 48 }
              : style === 'ivory'
                ? { width: 48, height: 52, transform: [{ scaleX: 1.26 }, { scaleY: 1.11 }] }
                : style === 'sage'
                  ? { width: 44, height: 48, transform: [{ scaleX: 1.04 }, { scaleY: 0.89 }] }
                  : { width: 44, height: 54 };
            return <Pressable key={style} testID={`diary-item-${style}-trash`} accessibilityRole="button" accessibilityLabel={`${title}, ${status}`} accessibilityState={{ selected }} onPress={() => { if (selected) { tapHaptic('select'); resetDiaryItem('trash'); } else void chooseItem('trash-' + style, pro, () => applyHeroTrashBinStyle(style)); }} style={{ width: Math.max(1, Math.floor(((diaryGalleryWidth ?? windowSize.width) - 24 - 16) / 3)), minHeight: 124, padding: 7, gap: 6, alignItems: 'center', borderRadius: 12, backgroundColor: selected ? '#F8F8FA' : 'transparent' }}>
              <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 0 }}>
                {(['empty', 'filled'] as const).map(state => <View key={state} style={{ width: previewSize.width, flexShrink: 1, alignItems: 'center' }}>
                  <ExpoImage source={HERO_TRASH_BIN_PREVIEWS[style][state]} contentFit="contain" transition={0} style={previewSize} />
                </View>)}
              </View>
              <ThemedText numberOfLines={2} style={{ color: ink, fontSize: 13, textAlign: 'center' }}>{title}</ThemedText>
              <ThemedText style={{ color: selected ? '#278B77' : ink, opacity: selected ? 1 : 0.6, textAlign: 'center', fontSize: 12 }}>{status}</ThemedText>
            </Pressable>;
          }) : diaryCategory === 'camera' ? HERO_CAMERA_STORE_ITEMS.filter(item => isProCameraStyle(item.id) === paidItems).map(camera => {
            const selected = !themedCamera && selectedCameraStyle === camera.id;
            const pro = isProCameraStyle(camera.id);
            const status = selected ? (translateUiText("적용 중")) : pro ? itemStatus('camera-' + camera.id) : (translateUiText("무료"));
            const name = locale === 'en' ? camera.name.en : translateUiText(camera.name.ko);
            return <Pressable key={camera.id} testID={`diary-item-${camera.id}-camera`} accessibilityRole="button" accessibilityLabel={`${name}, ${status}`} accessibilityState={{ selected }} onPress={() => { if (selected) { tapHaptic('select'); resetDiaryItem('camera'); } else void chooseItem('camera-' + camera.id, pro, () => applyHeroCameraStyle(camera.id)); }} style={{ width: diaryItemWidth, minHeight: 108, padding: 7, gap: 5, alignItems: 'center', borderRadius: 12, backgroundColor: selected ? '#F8F8FA' : 'transparent' }}>
              <View style={{ width: '100%', height: 56, justifyContent: 'center', alignItems: 'center' }}><CameraStoreIcon camera={camera.id} /></View>
              <ThemedText numberOfLines={2} style={{ color: ink, fontSize: 12, lineHeight: 16, height: 32, textAlign: 'center' }}>{name}</ThemedText>
              <ThemedText style={{ color: selected ? '#278B77' : ink, opacity: selected ? 1 : 0.6, textAlign: 'center', fontSize: 13, lineHeight: 20 }}>{status}</ThemedText>
            </Pressable>;
          }) : null);
  return <View style={{ flex: 1, minHeight: 0 }}>
    {view !== 'illustrationDiary' ? <>{selector}
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 8 }}>
        {(['all', 'free', 'pro'] as const).map(filter => <Pressable key={filter} testID={`store-access-${filter}`} accessibilityRole="tab" accessibilityState={{ selected: accessFilter === filter }} onPress={() => { tapHaptic('select'); setAccessFilter(filter); }} style={({ pressed }) => ({ minHeight: 40, minWidth: 70, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: accessFilter === filter || pressed ? '#FFFFFF' : '#EEEEEE', borderWidth: 1, borderTopColor: '#FFFFFF', borderLeftColor: '#FFFFFF', borderRightColor: '#E2E2E2', borderBottomColor: '#DCDCDC', shadowColor: '#000000', shadowOffset: { width: pressed ? 2 : 5, height: pressed ? 3 : 7 }, shadowOpacity: pressed ? 0.10 : 0.18, shadowRadius: pressed ? 3 : 7, elevation: pressed ? 2 : 6 })}>
          <ThemedText style={{ fontSize: 13, color: '#242321', opacity: accessFilter === filter ? 1 : 0.55 }}>{filter === 'all' ? (locale === 'ko' ? '전체' : 'All') : filter === 'free' ? translateUiText('무료') : 'Pro'}</ThemedText>
        </Pressable>)}
      </View>
    </> : null}
    {!storeArtwork ? <Pressable disabled={!storeArtworkFailed} onPress={retryStoreArtwork} accessibilityLabel={storeArtworkFailed ? translateUiText("이미지 다시 불러오기") : translateUiText("상품 준비 중")} style={{ margin: 24, height: 320, borderRadius: 20, backgroundColor: '#E6E5E1', justifyContent: 'center', alignItems: 'center' }}>{storeArtworkFailed ? <ThemedText>{translateUiText("이미지 다시 불러오기")}</ThemedText> : null}</Pressable> : view === 'diary'
      ? <View style={{ flex: 1, minHeight: 0 }}>
        <View style={{ flexShrink: 0 }}>
        <ScrollView onLayout={event => { diaryCategoryScroll.current.height = event.nativeEvent.layout.height; updateCategoryHint(); }} onContentSizeChange={(_, height) => { diaryCategoryScroll.current.content = height; updateCategoryHint(); }} onScroll={event => { diaryCategoryScroll.current.offset = event.nativeEvent.contentOffset.y; updateCategoryHint(); }} scrollEventThrottle={32} testID="diary-category-grid" nestedScrollEnabled showsVerticalScrollIndicator style={{ height: 170, flexGrow: 0, flexShrink: 0, marginHorizontal: 12, borderRadius: 18 }} contentContainerStyle={{ padding: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
          {([['clip', categoryNames.clip], ['trash', categoryNames.trash], ['camera', categoryNames.camera], ['wall', ['벽장식', 'Wall decor']], ['background', ['배경', 'Backgrounds']], ...Object.entries(categoryNames).filter(([key]) => !['clip','trash','camera','photoWall'].includes(key) && proDiaryCatalog.some(item => item.category === key))] as [ThemeSlot | 'wall' | 'background', string[]][]).map(([category, labels]) => <Pressable key={category} testID={`diary-category-${category}`} accessibilityRole="tab" accessibilityLabel={locale === 'en' ? labels[1] : translateUiText(labels[0])} accessibilityState={{ selected: diaryCategory === category }} onPress={() => { tapHaptic('select'); setDiaryCategory(category); }} style={{ width: '33.33%', height: 42, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: diaryCategory === category ? '#F8F8FA' : '#F0EFEC', boxShadow: diaryCategory === category ? '-3px -3px 8px rgba(255,255,255,0.95), 3px 3px 8px rgba(126,127,145,0.22)' : '-2px -2px 5px rgba(255,255,255,0.75), 2px 2px 5px rgba(126,127,145,0.13)' }}>
            <ThemedText style={{ color: ink, fontSize: 14, textAlign: 'center', opacity: diaryCategory === category ? 1 : 0.55 }}>{locale === 'en' ? labels[1] : translateUiText(labels[0])}</ThemedText>
          </Pressable>)}
          </View>
        </ScrollView>
        {moreDiaryCategories ? <View pointerEvents="none" style={{ position: 'absolute', right: 2, bottom: 10 }}><ThemedText accessibilityLabel={locale === 'en' ? 'More categories below' : '아래에 카테고리 더 있음'} style={{ color: ink, opacity: 0.55, fontSize: 16 }}>↓</ThemedText></View> : null}
        </View>
        <ScrollView key={diaryCategory} testID="diary-items-gallery" onLayout={event => setDiaryGalleryWidth(event.nativeEvent.layout.width)} contentContainerStyle={diaryCategory === 'trash'
          ? { paddingHorizontal: 12, paddingVertical: 20, paddingBottom: 120, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', columnGap: 8, rowGap: 20 }
          : { padding: 20, paddingBottom: 120, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', alignItems: 'flex-start', gap: 12 }}>
          {renderLegacyItems(false)}
          {diaryCategory === 'background' && matchesStoreAccess(accessFilter, false) ? (['default'] as const).map(id => <Pressable key={id} testID={`diary-background-${id}`} accessibilityRole="button" accessibilityState={{ selected: wallpaper === id }} onPress={() => { tapHaptic('select'); setWallpaper(id); }} style={{ width: diaryItemWidth, padding: 8, gap: 8 }}>
            <View style={{ height: 100, borderRadius: 6, backgroundColor: '#F7F6F4', shadowColor: '#51463B', shadowOpacity: 0.16, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 3 }}>
              <View style={{ flex: 1, borderRadius: 6, overflow: 'hidden', borderWidth: 0.7, borderColor: '#D8D1C8' }} />
            </View>
            <ThemedText style={{ textAlign: 'center', color: ink, fontSize: 13 }}>{locale === 'ko' ? '기본 배경' : 'Default'}</ThemedText>
            <ThemedText style={{ textAlign: 'center', color: wallpaper === id ? '#278B77' : ink, fontSize: 13 }}>{wallpaper === id ? translateUiText('적용 중') : translateUiText('무료')}</ThemedText>
          </Pressable>) : null}
          {diaryCategory !== 'wall' ? null : <View testID="diary-wall-decor-category" style={{ width: '100%', gap: 16 }}>
            <View testID="wall-photo-wall-gallery" style={{ gap: 16 }}>
              <ThemedText accessibilityRole="header" style={{ color: ink, fontSize: 16 }}>{translateUiText("포토월")}</ThemedText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }}>
              {(['none', 'aligned', 'black'] as const).filter(() => matchesStoreAccess(accessFilter, false)).map(style => {
                const selected = !themedWall && photoWall === style;
                const name = style === 'aligned' ? (locale === 'ko' ? '정렬 배치' : 'Aligned Layout') : style === 'none' ? (translateUiText("자유 배치")) : (locale === 'ko' ? '체리 리본 포토월' : 'Cherry Ribbon Photo Wall');
                return <Pressable key={style} testID={style === 'none' ? 'diary-item-no-photo-wall' : style === 'aligned' ? 'diary-item-aligned-photo-wall' : 'diary-item-black-photo-wall'} accessibilityRole="button" accessibilityLabel={name} accessibilityState={{ selected }} onPress={() => { tapHaptic('select'); if (selected) resetDiaryItem('photoWall'); else applyHeroPhotoWall(style); }} style={{ width: diaryItemWidth, padding: 7, gap: 5, borderRadius: 12, backgroundColor: selected ? '#F8F8FA' : 'transparent' }}>
                  <View style={{ height: 58, width: '100%', alignItems: 'center' }}><View style={{ width: 58, height: 58 }}><PhotoWallStorePreview variant={style} square /></View></View>
                  <ThemedText numberOfLines={2} style={{ color: ink, textAlign: 'center', fontSize: 12, lineHeight: 16, minHeight: 32 }}>{name}</ThemedText>
                  <ThemedText style={{ color: selected ? '#278B77' : ink, opacity: selected ? 1 : 0.6, textAlign: 'center', fontSize: 13 }}>{selected ? (translateUiText("적용 중")) : (translateUiText("무료"))}</ThemedText>
                </Pressable>;
              })}
              <DiaryThemeGallery accessFilter={accessFilter} itemWidth={diaryItemWidth} choose={chooseItem} status={itemStatus} category="photoWall" ko={locale === 'ko'} ink={ink} />
            </View>
            </View>
          </View>}
          {diaryCategory !== 'wall' && diaryCategory !== 'background' && <DiaryThemeGallery accessFilter={accessFilter} itemWidth={diaryCategory === 'trash' ? Math.max(1, Math.floor(((diaryGalleryWidth ?? windowSize.width) - 24 - 16) / 3)) : diaryItemWidth} choose={chooseItem} status={itemStatus} category={diaryCategory} ko={locale === 'ko'} ink={ink} />}
          {renderLegacyItems(true)}
        </ScrollView>
      </View>
      : view === 'calendar'
      ? <View style={{ flex: 1, minHeight: 0 }}><HeroCalendarDesigns accessFilter={accessFilter} today={today} month={month} diaries={diaries} onSelectDate={openDate} /></View>
      : view === 'illustrationGallery'
      ? <View style={{ flex: 1, minHeight: 0 }}>
        <View testID="illustration-calendar-categories" accessibilityRole="tablist" style={{ alignSelf: 'center', flexDirection: 'row', gap: 12, paddingVertical: 12 }}>
          {ILLUSTRATION_CALENDAR_CATEGORIES.map(category => {
            const selected = illustrationCategory === category.id;
            const label = t(category.labelKey);
            return <Pressable key={category.id} testID={`illustration-category-${category.id}`} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} onPress={() => { tapHaptic('select'); setIllustrationCategory(category.id); }} style={{ minWidth: 74, minHeight: 42, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: selected ? '#F8F8FA' : 'transparent', boxShadow: selected ? '-3px -3px 8px rgba(255,255,255,0.95), 3px 3px 8px rgba(126,127,145,0.22)' : 'none' }}>
              <ThemedText style={{ color: ink, fontSize: 14, opacity: selected ? 1 : 0.55 }}>{label}</ThemedText>
            </Pressable>;
          })}
        </View>
        <ScrollView key={illustrationCategory} testID="illustration-calendar-gallery" onLayout={({ nativeEvent: { layout } }) => setIllustrationGalleryWidth(previous => previous === layout.width ? previous : layout.width)} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', columnGap: 8, rowGap: 20 }}>
          {illustrationGalleryWidth !== null && illustrationPacks.filter(pack => matchesStoreAccess(accessFilter, (pack.startsWith('season-') || FEATURE_FLAGS.proIllustrationPacks) && isProCalendarPack(pack))).map(pack => <CalendarPackStore key={pack} pack={pack} width={calendarThemeWidth} month={month} dark={isDark} />)}
        </ScrollView>
      </View>
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
