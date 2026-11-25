import { subscribeCalendarPlanner } from '../model/calendarPlannerUpdates';
import { isPremiumPaper } from '../model/premiumCalendarPapers';
import { isPhotoCalendar } from '../model/freePhotoCalendars';
import { CalendarWidgetRenderReadyContext } from '../model/calendarWidgetRenderReady';
import { largeWidgetArtwork } from '../model/largeWidgetArtwork';
import { useAppLocaleStore } from '@shared/lib/i18n';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useCalendarPhotosHidden } from '@shared/lib/calendarLayoutPreferences';
import { AppState, NativeModules, Platform, View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { CalendarPaper } from './HeroCalendarDesigns';
import { LargeWidgetCalendar } from './LargeWidgetCalendar';
import { useHeroCalendarCover, type HeroCalendarDesign } from '../model/heroCalendarDesign';
import type { ComicDiary } from '../lib/heroDiaryStorage';

type Props = {
  design: HeroCalendarDesign; month: Date; today: Date; diaries: ComicDiary[]; eventDates: string[];
};

export function HeroCalendarWidgetSync(props: Props) {
  return <WidgetCapture key={props.design} {...props} />;
}

function WidgetCapture({ design, month, today, diaries, eventDates }: Props) {
  const artwork = largeWidgetArtwork(design);
  const displayed = useRef(!artwork);
  const locale = useAppLocaleStore(state => state.locale);
  const hidePhotos = useCalendarPhotosHidden();
  const displayDiaries = useMemo(() => hidePhotos
    ? diaries.map(diary => ({ ...diary, scenes: diary.scenes.map(scene => ({ ...scene, artworkUri: undefined })) }))
    : diaries, [diaries, hidePhotos]);
  const target = useRef<View>(null);
  const scheduleCapture = useRef<(() => void) | undefined>(undefined);
  // Decoder notifications must not rerender images and trigger another onLoad.
  const imageReady = useCallback(() => scheduleCapture.current?.(), []);
  const backgroundReady = useCallback(() => {
    displayed.current = true;
    imageReady();
  }, [imageReady]);
  const cover = useHeroCalendarCover(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`);
  const native = NativeModules.PokitWidgetSync as { syncCalendarWidgetImage?: (uri: string, month: string) => Promise<void>; syncCalendarWidgetImageForFamily?: (uri: string, month: string, family: string) => Promise<void> } | undefined;
  const enabled = Platform.OS === 'ios' && !!(native?.syncCalendarWidgetImageForFamily || native?.syncCalendarWidgetImage);
  const eventKey = eventDates.join(',');
  const diaryKey = JSON.stringify(displayDiaries);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const todayKey = today.toDateString();
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let pending = false;
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      dirty = true;
      if (timer) clearTimeout(timer);
      timer = setTimeout(render, 400);
    };
    const render = async () => {
      if (cancelled || pending || !target.current || AppState.currentState === 'background') return;
      if (!displayed.current) return;
      pending = true;
      dirty = false;
      let uri: string | undefined;
      try {
        // Layer capture avoids drawViewHierarchy(afterScreenUpdates: true), which
        // forces visible screen updates while capturing the offscreen calendar.
        uri = await captureRef(target.current, { format: 'png', result: 'tmpfile', useRenderInContext: true });
        if (!cancelled) {
          if (native?.syncCalendarWidgetImageForFamily) await native.syncCalendarWidgetImageForFamily(uri, monthKey, 'large');
          else await native?.syncCalendarWidgetImage?.(uri, monthKey);
        }
      } catch {
        // Keep the last complete calendar when capture is unavailable.
      } finally {
        if (uri) releaseCapture(uri);
        pending = false;
        if (dirty && !cancelled) schedule();
      }
    };
    scheduleCapture.current = schedule;
    const unsubscribeNotes = subscribeCalendarPlanner(schedule);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') schedule();
    });
    schedule();
    return () => {
      cancelled = true;
      scheduleCapture.current = undefined;
      if (timer) clearTimeout(timer);
      subscription.remove();
      unsubscribeNotes();
    };
  }, [enabled, native, locale, monthKey, todayKey, diaryKey, eventKey, cover]);
  if (!enabled) return null;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: -2000, top: 0, width: 330 }}>
    <CalendarWidgetRenderReadyContext.Provider value={imageReady}>
        <View ref={target} collapsable={false} style={{ width: 330, height: 346, backgroundColor: '#FAFAF6', overflow: 'hidden' }}>
          {artwork
            ? <LargeWidgetCalendar artwork={artwork} design={design} month={month} today={today} diaries={displayDiaries} eventDates={eventDates} onBackgroundDisplay={backgroundReady} />
            : <CalendarPaper widgetSize="large" design={isPhotoCalendar(design) || isPremiumPaper(design) || design === 'clipboard' || design === 'photo' || design === 'grid' || design === 'weather' ? design : 'bold'} month={month} today={today} diaries={displayDiaries} eventDates={eventDates} layoutWidth={330} layoutHeight={346} />}
        </View>
    </CalendarWidgetRenderReadyContext.Provider>
  </View>;
}
