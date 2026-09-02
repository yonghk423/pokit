import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import {
  buildWeekCalendarRow,
  dateKeyFromDate,
  formatDateKeyDisplayKo,
  formatMonthTitleKo,
  formatStudyDdayLabel,
  getLocalDateKey,
  parseLocalDateKeyToDate,
  sortDdayEvents,
  toMonthStart,
  type WorkStudyDdayEvent,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from '../../lib/settingsPalette';

const PRIMARY = 'rgb(0, 0, 0)';
const WEEKDAY_HEADER_KEYS = ['goalDetail.weekday.mon', 'goalDetail.weekday.tue', 'goalDetail.weekday.wed', 'goalDetail.weekday.thu', 'goalDetail.weekday.fri', 'goalDetail.weekday.sat', 'goalDetail.weekday.sun'] as const;

type Props = {
  events: WorkStudyDdayEvent[];
  onChangeEvents: (next: WorkStudyDdayEvent[]) => void;
  palette: ReturnType<typeof goalDetailSettingsPalette>;
};

function makeDdayId() {
  return `dd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function shiftDateKey(dateKey: string, dayDelta: number): string {
  const base = parseLocalDateKeyToDate(dateKey) ?? new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayDelta, 12, 0, 0, 0);
  return dateKeyFromDate(next);
}

export function StudyDdaySection({ events, onChangeEvents, palette }: Props) {
  const { t } = useTranslation();
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [draftTitle, setDraftTitle] = useState('');

  const selectedDate = useMemo(
    () => parseLocalDateKeyToDate(selectedDateKey) ?? new Date(),
    [selectedDateKey],
  );
  const weekRow = useMemo(() => buildWeekCalendarRow(selectedDate), [selectedDate]);
  const monthTitle = useMemo(() => formatMonthTitleKo(toMonthStart(selectedDate)), [selectedDate]);
  const eventDateSet = useMemo(() => new Set(events.map((e) => e.dateKey)), [events]);
  const sortedEvents = useMemo(() => sortDdayEvents(events, todayKey), [events, todayKey]);

  const addEvent = () => {
    const title = draftTitle.trim();
    if (!title) return;
    onChangeEvents(
      sortDdayEvents([
        ...events,
        { id: makeDdayId(), title, dateKey: selectedDateKey },
      ]),
    );
    setDraftTitle('');
  };

  const removeEvent = (id: string) => {
    onChangeEvents(events.filter((e) => e.id !== id));
  };

  return (
    <View style={[styles.wrap, { borderColor: palette.outline }]}>
      <View style={styles.headerRow}>
        <IconSymbol name="calendar" size={16} color={PRIMARY} />
        <View style={styles.headerText}>
          <ThemedText style={[styles.title, { color: palette.onSurface }]}>{t('goalDetail.study.ddayTitle')}</ThemedText>
          <ThemedText style={[styles.hint, { color: palette.onVariant }]}>
            {t('goalDetail.study.ddayHint')}
          </ThemedText>
        </View>
      </View>

      <View style={styles.monthNav}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.study.prevWeek')}
          onPress={() => setSelectedDateKey((key) => shiftDateKey(key, -7))}
          hitSlop={8}
          style={styles.navBtn}>
          <IconSymbol name="chevron.left" size={14} color={palette.onSurface} />
        </Pressable>
        <ThemedText style={[styles.monthTitle, { color: palette.onSurface }]}>{monthTitle}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('goalDetail.study.nextWeek')}
          onPress={() => setSelectedDateKey((key) => shiftDateKey(key, 7))}
          hitSlop={8}
          style={styles.navBtn}>
          <IconSymbol name="chevron.right" size={14} color={palette.onSurface} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_HEADER_KEYS.map((dayKey) => (
          <ThemedText key={dayKey} style={[styles.weekdayLabel, { color: palette.onVariant }]}>
            {t(dayKey)}
          </ThemedText>
        ))}
      </View>

      <View style={styles.grid}>
        {weekRow.map((day) => {
          const dateKey = dateKeyFromDate(day);
          const inMonth = day.getMonth() === selectedDate.getMonth();
          const selected = dateKey === selectedDateKey;
          const hasEvent = eventDateSet.has(dateKey);
          const isToday = dateKey === todayKey;
          return (
            <Pressable
              key={dateKey}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={t('goalDetail.fasting.selectDateA11y', { date: formatDateKeyDisplayKo(dateKey) })}
              onPress={() => setSelectedDateKey(dateKey)}
              style={[
                styles.dayCell,
                selected && { backgroundColor: 'rgba(0,0,0,0.08)', borderColor: PRIMARY },
                !inMonth && styles.dayCellMuted,
              ]}>
              <ThemedText
                style={[
                  styles.dayLabel,
                  {
                    color: inMonth ? palette.onSurface : palette.outline,
                    fontWeight: isToday ? '900' : selected ? '800' : '600',
                  },
                ]}>
                {day.getDate()}
              </ThemedText>
              {hasEvent ? <View style={[styles.eventDot, { backgroundColor: PRIMARY }]} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.addBlock, { borderColor: palette.outlineVariant }]}>
        <ThemedText style={[styles.selectedDate, { color: palette.onVariant }]}>
          {formatDateKeyDisplayKo(selectedDateKey)} · {formatStudyDdayLabel(selectedDateKey, todayKey)}
        </ThemedText>
        <View style={styles.addRow}>
          <TextInput
            value={draftTitle}
            onChangeText={setDraftTitle}
            onSubmitEditing={addEvent}
            returnKeyType="done"
            placeholder={t('goalDetail.study.ddayPlaceholder')}
            placeholderTextColor={palette.outline}
            style={[styles.addInput, { color: palette.onSurface, borderColor: palette.outlineVariant }]}
          />
          <Pressable onPress={addEvent} style={styles.addBtn}>
            <IconSymbol name="plus" size={13} color="#fff" />
          </Pressable>
        </View>
      </View>

      {sortedEvents.length > 0 ? (
        <View style={styles.list}>
          {sortedEvents.map((event) => (
            <View
              key={event.id}
              style={[styles.eventRow, { borderBottomColor: palette.outlineVariant }]}>
              <View style={styles.eventMain}>
                <ThemedText style={[styles.ddayBadge, { color: palette.onSurface }]}>
                  {formatStudyDdayLabel(event.dateKey, todayKey)}
                </ThemedText>
                <View style={styles.eventTextCol}>
                  <ThemedText style={[styles.eventTitle, { color: palette.onSurface }]} numberOfLines={1}>
                    {event.title}
                  </ThemedText>
                  <ThemedText style={[styles.eventDate, { color: palette.onVariant }]}>
                    {formatDateKeyDisplayKo(event.dateKey)}
                  </ThemedText>
                </View>
              </View>
              <Pressable
                onPress={() => removeEvent(event.id)}
                hitSlop={8}
                accessibilityLabel={t('goalDetail.study.deleteDdayA11y')}
                style={styles.removeBtn}>
                <IconSymbol name="trash" size={13} color={palette.onVariant} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <ThemedText style={[styles.empty, { color: palette.onVariant }]}>
          {t('goalDetail.study.noDday')}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '800' },
  hint: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 13, fontWeight: '800' },
  weekdayRow: { flexDirection: 'row' },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
  },
  grid: { flexDirection: 'row' },
  dayCell: {
    flex: 1,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    gap: 1,
  },
  dayLabel: { fontSize: 12 },
  dayCellMuted: { opacity: 0.4 },
  eventDot: { width: 4, height: 4 },
  addBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    gap: 6,
  },
  selectedDate: { fontSize: 11, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  addInput: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  addBtn: {
    width: 30,
    height: 30,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: 0 },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  eventMain: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  ddayBadge: { fontSize: 12, fontWeight: '900', minWidth: 46 },
  eventTextCol: { flex: 1, gap: 1 },
  eventTitle: { fontSize: 14, fontWeight: '700' },
  eventDate: { fontSize: 11, fontWeight: '600' },
  removeBtn: { padding: 4 },
  empty: { fontSize: 11, fontWeight: '600', textAlign: 'center', paddingVertical: 4 },
});
