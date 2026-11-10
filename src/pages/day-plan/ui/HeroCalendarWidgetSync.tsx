import { CalendarWidgetRenderReadyContext } from '../model/calendarWidgetRenderReady';
import { getLoadedIllustrationCalendarAssets } from '../lib/illustrationCalendarAssets';
import { useCallback, useEffect, useRef } from 'react';
import { AppState, NativeModules, Platform, View } from 'react-native';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { CalendarPaper } from './HeroCalendarDesigns';
import { HeroIllustrationCalendar } from './HeroIllustrationCalendar';
import { CITY_CALENDAR_THEMES, useHeroCalendarCover, type HeroCalendarDesign } from '../model/heroCalendarDesign';
import type { ComicDiary } from '../lib/heroDiaryStorage';

/** Reuse the app's calendar renderer, with a compact canvas instead of duplicating designs in Swift. */
export function HeroCalendarWidgetSync({ design, month, today, diaries, eventDates }: {
  design: HeroCalendarDesign; month: Date; today: Date; diaries: ComicDiary[]; eventDates: string[];
}) {
  const target = useRef<View>(null);
  const scheduleCapture = useRef<(() => void) | undefined>(undefined);
  // Decoder notifications must not rerender images and trigger another onLoad.
  const imageReady = useCallback(() => scheduleCapture.current?.(), []);
  const cover = useHeroCalendarCover(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`);
  const native = NativeModules.PokitWidgetSync as { syncCalendarWidgetImage?: (uri: string, month: string) => Promise<void> } | undefined;
  const enabled = Platform.OS === 'ios' && !!native?.syncCalendarWidgetImage;
  const theme = CITY_CALENDAR_THEMES.find(value => value.design === design);
  const eventKey = eventDates.join(',');
  const diaryKey = JSON.stringify(diaries);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
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
      if ((theme || design === 'illustration') && !getLoadedIllustrationCalendarAssets(theme?.themeId ?? '01-rush-hour-commute')) return;
      pending = true;
      dirty = false;
      let uri: string | undefined;
      try {
        // Layer capture avoids drawViewHierarchy(afterScreenUpdates: true), which
        // forces visible screen updates while capturing the offscreen calendar.
        uri = await captureRef(target, { format: 'png', result: 'tmpfile', useRenderInContext: true });
        if (!cancelled) await native?.syncCalendarWidgetImage?.(uri, monthKey);
      } catch {
        // Keep the last complete calendar when capture is unavailable.
      } finally {
        if (uri) releaseCapture(uri);
        pending = false;
        if (dirty && !cancelled) schedule();
      }
    };
    scheduleCapture.current = schedule;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') schedule();
    });
    schedule();
    return () => {
      cancelled = true;
      scheduleCapture.current = undefined;
      if (timer) clearTimeout(timer);
      subscription.remove();
    };
  }, [enabled, design, monthKey, today.getFullYear(), today.getMonth(), today.getDate(), diaryKey, eventKey, cover]);
  if (!enabled) return null;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: -2000, top: 0, width: 330, height: 330 }}>
    <CalendarWidgetRenderReadyContext.Provider value={imageReady}><View ref={target} collapsable={false} style={{ width: 330, height: 330, backgroundColor: '#FAFAF6', overflow: 'hidden' }}>
      {theme || design === 'illustration'
        ? <HeroIllustrationCalendar widget themeId={theme?.themeId ?? '01-rush-hour-commute'} width={330} height={330} month={month} today={today} diaries={diaries} eventDates={eventDates} onSelectDate={() => undefined} />
        : <CalendarPaper design={design === 'clipboard' || design === 'photo' || design === 'grid' ? design : 'bold'} month={month} today={today} diaries={diaries} eventDates={eventDates} layoutWidth={330} layoutHeight={330} />}
    </View></CalendarWidgetRenderReadyContext.Provider>
  </View>;
}
