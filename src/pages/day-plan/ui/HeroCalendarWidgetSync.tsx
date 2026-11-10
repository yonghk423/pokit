import { CalendarWidgetRenderReadyContext } from '../model/calendarWidgetRenderReady';
import { getLoadedIllustrationCalendarAssets } from '../lib/illustrationCalendarAssets';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [revision, setRevision] = useState(0);
  const imageReady = useCallback(() => setRevision(value => value + 1), []);
  const cover = useHeroCalendarCover(`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`);
  const native = NativeModules.PokitWidgetSync as { syncCalendarWidgetImage?: (uri: string, month: string) => Promise<void> } | undefined;
  const enabled = Platform.OS === 'ios' && !!native?.syncCalendarWidgetImage;
  const theme = CITY_CALENDAR_THEMES.find(value => value.design === design);
  const eventKey = eventDates.join(',');
  const diaryKey = JSON.stringify(diaries);
  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') setRevision(value => value + 1); });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let pending = false;
    // Refresh after layout and again after asynchronous photo/texture decoding.
    const timers = [400, 1600, 3500].map(delay => setTimeout(async () => {
      if (cancelled || pending || !target.current || AppState.currentState === 'background') return;
      if ((theme || design === 'illustration') && !getLoadedIllustrationCalendarAssets(theme?.themeId ?? '01-rush-hour-commute')) return;
      pending = true;
      let uri: string | undefined;
      try {
        uri = await captureRef(target, { format: 'png', result: 'tmpfile', width: 330, height: 360 });
        if (!cancelled) await native?.syncCalendarWidgetImage?.(uri, monthKey);
      } catch {
        // A failed render keeps the last complete calendar in the widget.
      } finally {
        if (uri) releaseCapture(uri);
        pending = false;
      }
    }, delay));
    return () => { cancelled = true; timers.forEach(clearTimeout); };
  }, [enabled, design, monthKey, today.getFullYear(), today.getMonth(), today.getDate(), diaryKey, eventKey, cover, revision]);
  if (!enabled) return null;
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: -2000, top: 0, width: 330, height: 360 }}>
    <CalendarWidgetRenderReadyContext.Provider value={imageReady}><View ref={target} collapsable={false} style={{ width: 330, height: 360, backgroundColor: '#FAFAF6', overflow: 'hidden' }}>
      {theme || design === 'illustration'
        ? <HeroIllustrationCalendar themeId={theme?.themeId ?? '01-rush-hour-commute'} width={330} height={360} month={month} today={today} diaries={diaries} eventDates={eventDates} onSelectDate={() => undefined} />
        : <CalendarPaper design={design === 'clipboard' || design === 'photo' || design === 'grid' ? design : 'bold'} month={month} today={today} diaries={diaries} eventDates={eventDates} layoutWidth={330} layoutHeight={360} />}
    </View></CalendarWidgetRenderReadyContext.Provider>
  </View>;
}
