import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatDateKeyDisplay, type AppLocale } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';

const EXTRA_ROUTINE_FACE = [
  '#F4D35E',
  '#F0B8C6',
  '#B7D0F5',
  '#C8E6C9',
  '#FFCC80',
  '#D1C4E9',
  '#FFAB91',
  '#E6EE9C',
  '#B2DFDB',
] as const;

const LOCALE_TAG: Record<AppLocale, string> = {
  ko: 'ko-KR',
  ja: 'ja-JP',
  en: 'en-US',
};

type DatedPiece = {
  puzzleIndex: number;
  dateKey: string;
};

export type PuzzleDayRoutine = {
  key: string;
  label: string;
  count: number;
};

type Props = {
  pieces: DatedPiece[];
  locale: AppLocale;
  ink: string;
  muted: string;
  mint: string;
  /** 날짜 → 그날 연결된 루틴 완료 */
  routinesByDate: Record<string, PuzzleDayRoutine[]>;
  routineLine: (routine: PuzzleDayRoutine) => string;
  emptyDayLabel: string;
  pieceLabel: (pieceNumber: number, dateLabel: string) => string;
};

type MonthBlock = {
  key: string;
  title: string;
  cells: (number | null)[];
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function weekdayLabels(locale: AppLocale): string[] {
  const fmt = new Intl.DateTimeFormat(LOCALE_TAG[locale], { weekday: 'narrow' });
  return Array.from({ length: 7 }, (_, index) =>
    fmt.format(new Date(2024, 0, 7 + index)),
  );
}

function monthTitle(year: number, month: number, locale: AppLocale): string {
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    year: 'numeric',
    month: 'long',
  }).format(new Date(year, month - 1, 1));
}

function buildMonths(dateKeys: string[], locale: AppLocale): MonthBlock[] {
  const unique = [...new Set(dateKeys)].sort();
  if (unique.length === 0) return [];
  const first = unique[0];
  const last = unique[unique.length - 1];
  const startYear = Number(first.slice(0, 4));
  const startMonth = Number(first.slice(5, 7));
  const endYear = Number(last.slice(0, 4));
  const endMonth = Number(last.slice(5, 7));

  const months: MonthBlock[] = [];
  let year = startYear;
  let month = startMonth;
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells: (number | null)[] = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);
    months.push({
      key: `${year}-${pad2(month)}`,
      title: monthTitle(year, month, locale),
      cells,
    });
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
}

/** 조각이 열린 날을 월 달력으로 모은다. 줄 목록 대신 높이가 달에 맞춰 고정된다. */
function routineFace(index: number, mint: string): string {
  if (index <= 0) return mint;
  return EXTRA_ROUTINE_FACE[(index - 1) % EXTRA_ROUTINE_FACE.length];
}

export function PuzzleOpenedDaysCalendar({
  pieces,
  locale,
  ink,
  muted,
  mint,
  routinesByDate,
  routineLine,
  emptyDayLabel,
  pieceLabel,
}: Props) {
  const weekdays = useMemo(() => weekdayLabels(locale), [locale]);
  const byDate = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const piece of pieces) {
      const list = map.get(piece.dateKey) ?? [];
      list.push(piece.puzzleIndex + 1);
      map.set(piece.dateKey, list);
    }
    return map;
  }, [pieces]);
  const months = useMemo(
    () => buildMonths(pieces.map((piece) => piece.dateKey), locale),
    [locale, pieces],
  );
  const rangeLabel = useMemo(() => {
    const keys = [...byDate.keys()].sort();
    if (keys.length === 0) return null;
    const start = formatDateKeyDisplay(keys[0], locale);
    const end = formatDateKeyDisplay(keys[keys.length - 1], locale);
    return start === end ? start : `${start} – ${end}`;
  }, [byDate, locale]);
  const routineOrder = useMemo(() => {
    const order: string[] = [];
    for (const rows of Object.values(routinesByDate)) {
      for (const row of rows) {
        if (!order.includes(row.key)) order.push(row.key);
      }
    }
    return order;
  }, [routinesByDate]);
  const routineTotals = useMemo(
    () =>
      routineOrder.map((key) => {
        let count = 0;
        let label = key;
        for (const rows of Object.values(routinesByDate)) {
          const found = rows.find((row) => row.key === key);
          if (!found) continue;
          count += found.count;
          label = found.label;
        }
        return { key, label, count };
      }),
    [routineOrder, routinesByDate],
  );
  const maxBands = useMemo(() => {
    let max = 1;
    for (const rows of Object.values(routinesByDate)) {
      if (rows.length > max) max = rows.length;
    }
    return max;
  }, [routinesByDate]);
  const faceHeight = Math.max(34, maxBands * 7);
  const pieceDates = useMemo(() => [...byDate.keys()].sort(), [byDate]);
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const selectedDate =
    pickedDate && (byDate.has(pickedDate) || routinesByDate[pickedDate])
      ? pickedDate
      : pieceDates[pieceDates.length - 1] ?? null;
  const selectedRoutines = selectedDate ? routinesByDate[selectedDate] ?? [] : [];

  if (months.length === 0) return null;

  return (
    <View style={styles.root}>
      {rangeLabel ? (
        <ThemedText style={[styles.range, { color: muted }]}>{rangeLabel}</ThemedText>
      ) : null}
      {routineTotals.length > 0 ? (
        <View style={styles.legend}>
          {routineTotals.map((routine, index) => (
            <View key={routine.key} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: routineFace(index, mint) }]} />
              <ThemedText style={[styles.legendText, { color: ink }]}>
                {routineLine(routine)}
              </ThemedText>
            </View>
          ))}
        </View>
      ) : null}
      {months.map((month) => (
        <View key={month.key} style={styles.month}>
          <ThemedText style={[styles.monthTitle, { color: ink }]}>{month.title}</ThemedText>
          <View style={styles.weekRow}>
            {weekdays.map((label, index) => (
              <ThemedText key={`${month.key}-w-${index}`} style={[styles.weekday, { color: muted }]}>
                {label}
              </ThemedText>
            ))}
          </View>
          {Array.from({ length: month.cells.length / 7 }, (_, row) => (
            <View key={`${month.key}-r-${row}`} style={styles.weekRow}>
              {month.cells.slice(row * 7, row * 7 + 7).map((day, column) => {
                if (day == null) {
                  return <View key={`${month.key}-e-${row}-${column}`} style={styles.cell} />;
                }
                const dateKey = `${month.key}-${pad2(day)}`;
                const pieceNumbers = byDate.get(dateKey);
                const dayRoutines = routinesByDate[dateKey] ?? [];
                const marked = (pieceNumbers != null && pieceNumbers.length > 0) || dayRoutines.length > 0;
                const dayCount = dayRoutines.reduce((sum, row) => sum + row.count, 0);
                const onlyRoutine = dayRoutines.length === 1 ? dayRoutines[0] : undefined;
                const soleRoutine = onlyRoutine ? routineOrder.indexOf(onlyRoutine.key) : -1;
                const face =
                  marked && soleRoutine >= 0 ? routineFace(soleRoutine, mint) : 'transparent';
                const bands = dayRoutines.map((routine) => ({
                  key: routine.key,
                  count: routine.count,
                  color: routineFace(Math.max(0, routineOrder.indexOf(routine.key)), mint),
                }));
                const selected = dateKey === selectedDate;
                const dateLabel = formatDateKeyDisplay(dateKey, locale);
                return (
                  <View key={dateKey} style={styles.cell}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={
                        marked
                          ? [
                              pieceNumbers
                                ?.map((n) => pieceLabel(n, dateLabel))
                                .join(', '),
                              ...dayRoutines.map((row) => routineLine(row)),
                            ]
                              .filter(Boolean)
                              .join(', ')
                          : undefined
                      }
                      onPress={() => {
                        if (!marked) return;
                        void Haptics.selectionAsync();
                        setPickedDate(dateKey);
                      }}
                      style={[
                        styles.dayFace,
                        { height: faceHeight },
                        bands.length <= 1 && { backgroundColor: face },
                        selected && marked && { borderColor: ink, borderWidth: 1.5 },
                      ]}>
                      {bands.length > 1 ? (
                        <View style={styles.bandRow}>
                          {bands.map((band) => (
                            <View
                              key={band.key}
                              style={[styles.band, { flex: band.count, backgroundColor: band.color }]}
                            />
                          ))}
                        </View>
                      ) : null}
                      <ThemedText
                        style={[
                          styles.dayText,
                          { color: marked ? '#1A1A1A' : muted, fontWeight: marked ? '800' : '600' },
                        ]}>
                        {day}
                      </ThemedText>
                      {marked && dayCount > 0 ? (
                        <ThemedText style={styles.dayCount}>{dayCount}</ThemedText>
                      ) : null}
                    </Pressable>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      ))}
      {selectedDate ? (
        <View style={styles.detail}>
          <ThemedText style={[styles.detailDate, { color: ink }]}>
            {formatDateKeyDisplay(selectedDate, locale)}
          </ThemedText>
          {selectedRoutines.length > 0 ? (
            selectedRoutines.map((routine) => (
              <ThemedText key={routine.key} style={[styles.detailLine, { color: ink }]}>
                {routineLine(routine)}
              </ThemedText>
            ))
          ) : (
            <ThemedText style={[styles.detailLine, { color: muted }]}>{emptyDayLabel}</ThemedText>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  range: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 10, height: 10 },
  legendText: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  detail: { gap: 2 },
  detailDate: { fontSize: 14, fontWeight: '800' },
  detailLine: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  month: { gap: 4 },
  monthTitle: { fontSize: 13, fontWeight: '800' },
  weekRow: { flexDirection: 'row' },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  dayFace: {
    width: 32,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bandRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
    gap: 1,
  },
  band: { width: '100%' },
  dayText: { fontSize: 12, lineHeight: 14 },
  dayCount: { fontSize: 9, lineHeight: 11, fontWeight: '800', color: '#1A1A1A' },
});
