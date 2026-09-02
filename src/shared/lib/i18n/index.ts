export {
  SUPPORTED_APP_LOCALES,
  type AppLocale,
  detectDeviceLanguageTag,
  resolveAppLocaleFromLanguageTag,
} from './model/locale';
export {
  getAppLocale,
  useAppLocaleStore,
} from './model/localeStore';
export { t, tIncompleteRoutineCountPart } from './model/translate';
export type { I18nKey, TParams } from './model/translate';
export { useTranslation } from './hooks/useTranslation';
export {
  formatDateKeyCompact,
  formatDateKeyDisplay,
  splitDateKeyCompact,
  formatHhmmClock,
  formatMealSlotLabel,
  formatDurationMinutes,
  formatMinuteOfDay,
  formatTimelineHeaderDate,
  formatWeekdayLabel,
  formatWeekdayShort,
  type DayMealSlot as LocaleDayMealSlot,
  type WeekdayIndex,
} from './lib/formatLocale';
