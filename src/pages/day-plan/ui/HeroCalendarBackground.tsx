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
import { useMemo, useState } from 'react';
import { useCalendarPhotosHidden } from '@shared/lib/calendarLayoutPreferences';
import { View } from 'react-native';
import { CalendarPaper } from './HeroCalendarDesigns';
import { isIllustrationCalendarDesign, CITY_CALENDAR_THEMES, useHeroCalendarDesign } from '../model/heroCalendarDesign';
import type { ComicDiary } from '../lib/heroDiaryStorage';

/** Measure the available canvas before painting, avoiding a provisional calendar size. */
export function HeroCalendarBackground({ date, month, diaries, onSelectDate, onPreviousMonth, onNextMonth, bottomInset = 0 }: { date: Date; month: Date; isDark: boolean; diaries: ComicDiary[]; onSelectDate: (date: string) => void; bottomInset?: number; onPreviousMonth?: () => void; onNextMonth?: () => void }) {
  const { locale } = useTranslation();
  const hidePhotos = useCalendarPhotosHidden();
  const displayDiaries = useMemo(() => hidePhotos
    ? diaries.map(diary => ({ ...diary, scenes: diary.scenes.map(scene => ({ ...scene, artworkUri: undefined })) }))
    : diaries, [diaries, hidePhotos]);
  const linked = useDeviceEvents(month.getFullYear(), month.getMonth(), locale === 'ko');
  const localEventDates = useCanvasEventDates(month.getFullYear(), month.getMonth());
  const eventDates = [...new Set([...localEventDates, ...Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)).filter(day => eventsOnDay(linked.events, day).length).map(getLocalDateKey)])];
  const insets = useSafeAreaInsets();
  const design = useHeroCalendarDesign();
  const freePhoto = freePhotoCalendar(design);
  const illustrated = isIllustrationCalendarDesign(design);
  const themeId = CITY_CALENDAR_THEMES.find(theme => theme.design === design)?.themeId ?? '01-rush-hour-commute';
  const paperDesign = isPremiumPaper(design) || design === 'clipboard' || design === 'bold' || design === 'grid' || design === 'photo' || design === 'weather' ? design : 'bold';
  const [paperSize, setPaperSize] = useState({ width: 0, height: 0 });
  const paperWidth = paperSize.width;
  // Stay in the shell's normal flow: its measured header is the upper boundary.
  return <View testID="hero-calendar-applied-design" style={{ flex: 1, marginTop: illustrated || freePhoto ? 0 : 8, marginBottom: illustrated ? 0 : -24, alignItems: 'stretch' }} onLayout={({ nativeEvent: { layout } }) => setPaperSize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height })}>
    <HeroCalendarWidgetSync design={design} month={month} today={date} diaries={displayDiaries} eventDates={eventDates} />
    {paperWidth > 0 && paperSize.height > 0 ? <View style={{ width: paperWidth, height: paperSize.height }}>{freePhoto ? <FreePhotoCalendarPaper eventDates={eventDates} background={false} design={design} width={paperWidth} height={paperSize.height} month={month} today={date} diaries={displayDiaries} onSelectDate={onSelectDate} onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} /> : illustrated ? <HeroIllustrationCalendar bottomInset={bottomInset} themeId={themeId} onMoveMonth={delta => { if (delta < 0) onPreviousMonth?.(); else onNextMonth?.(); }} topInset={insets.top} width={paperWidth} height={paperSize.height} month={month} today={date} diaries={displayDiaries} eventDates={eventDates} onSelectDate={onSelectDate} /> : <CalendarPaper design={paperDesign} month={month} today={date} diaries={displayDiaries} eventDates={eventDates} onSelectDate={onSelectDate} layoutWidth={paperWidth} layoutHeight={Math.max(1, paperSize.height - (paperDesign === 'mint-planner' || paperDesign === 'spiral-plan' ? 24 : isRaisedCalendar(paperDesign) ? bottomInset / 2 : paperDesign === 'photo' ? Math.min(bottomInset, 72) : bottomInset))} wallpaper onPreviousMonth={onPreviousMonth} onNextMonth={onNextMonth} />}</View> : null}
  </View>;
}
