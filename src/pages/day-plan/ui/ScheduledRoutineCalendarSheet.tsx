import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getLocalDateKey,
  localDateToDateKey,
  syncTodayTabWithFixedRoutineApply,
  useScheduledRoutinePlanStore,
} from '@entities/day-plan';
import { RetroFlatColors } from '@shared/config/retroFlat';
import {
  formatDateKeyCompact,
  formatWeekdayLabel,
  useTranslation,
  type WeekdayIndex,
} from '@shared/lib/i18n';
import {
  BUILTIN_TUTORIAL_GROUP_KEY,
  isPokitWeekTourFlowId,
  listAllCustomFlowCatalogEntries,
  listCustomCatalogGroups,
} from '@shared/lib/storage';
import { BrutalConfirmButton } from '@shared/ui/brutal-confirm-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import {
  addMonths,
  buildCalendarMonthGrid,
  toMonthStart,
} from '../lib/buildCalendarMonthGrid';
import { buildAddablePriorityCatalogSections } from '../lib/priorityCatalog';

const CHECK_EASE = Easing.bezier(0.22, 1, 0.36, 1);
const CHECK_ANIM_MS = 280;

type RoutinePickRowProps = {
  categoryKey: string;
  label: string;
  icon: string;
  selected: boolean;
  isDark: boolean;
  ink: string;
  line: string;
  onToggle: () => void;
};

function ScheduledRoutinePickRow({
  categoryKey,
  label,
  icon,
  selected,
  isDark,
  ink,
  line,
  onToggle,
}: RoutinePickRowProps) {
  const progress = useSharedValue(selected ? 1 : 0);
  const iconColor = activeIconColorByCategory(categoryKey);
  const selectedBg = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(168, 218, 220, 0.34)';

  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, {
      duration: CHECK_ANIM_MS,
      easing: CHECK_EASE,
    });
  }, [progress, selected]);

  const bgAnimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));
  const checkAnimStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.55 + progress.value * 0.45 }],
  }));

  return (
    <View style={[styles.rowWrap, { borderBottomColor: line }]}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        style={styles.row}>
        <Reanimated.View
          pointerEvents="none"
          style={[styles.rowSelectedFill, { backgroundColor: selectedBg }, bgAnimStyle]}
        />
        <View style={styles.rowForeground}>
          <IconSymbol name={icon as never} size={18} color={iconColor} />
        </View>
        <ThemedText style={[styles.rowLabel, { color: ink }]} numberOfLines={2}>
          {label}
        </ThemedText>
        <Reanimated.View style={[styles.checkWrap, checkAnimStyle]}>
          <IconSymbol name="checkmark" size={16} color={RetroFlatColors.light.primary} />
        </Reanimated.View>
      </Pressable>
    </View>
  );
}

type Props = {
  visible: boolean;
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
};

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** 캘린더에서 날짜를 고른 뒤, 그날 미리 담을 루틴을 지정하는 시트 */
export function ScheduledRoutineCalendarSheet({
  visible,
  isDark,
  ink,
  muted,
  surface,
  line,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const assignmentsByDate = useScheduledRoutinePlanStore((s) => s.assignmentsByDate);
  const setKeysForDate = useScheduledRoutinePlanStore((s) => s.setKeysForDate);

  const [monthCursor, setMonthCursor] = useState(() => toMonthStart(new Date()));
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [draftKeys, setDraftKeys] = useState<string[]>([]);

  const customFlowEntries = useMemo(
    () => (visible ? listAllCustomFlowCatalogEntries() : []),
    [visible],
  );
  const customGroups = useMemo(
    () => (visible ? listCustomCatalogGroups() : []),
    [visible],
  );

  const sections = useMemo(
    () =>
      buildAddablePriorityCatalogSections({
        excludedKeys: new Set(),
        customFlowEntries,
        customGroups,
      })
        .filter((section) => section.groupKey !== BUILTIN_TUTORIAL_GROUP_KEY)
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !isPokitWeekTourFlowId(item.key)),
        }))
        .filter((section) => section.items.length > 0),
    [customFlowEntries, customGroups],
  );

  useEffect(() => {
    if (!visible) return;
    setMonthCursor(toMonthStart(new Date()));
    setSelectedDateKey(todayKey);
    setDraftKeys(
      useScheduledRoutinePlanStore.getState().getKeysForDate(todayKey),
    );
  }, [visible, todayKey]);

  const selectDate = useCallback(
    (dateKey: string) => {
      void Haptics.selectionAsync();
      setSelectedDateKey(dateKey);
      setDraftKeys(useScheduledRoutinePlanStore.getState().getKeysForDate(dateKey));
    },
    [],
  );

  const toggleKey = useCallback((key: string) => {
    void Haptics.selectionAsync();
    setDraftKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  }, []);

  const onSave = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setKeysForDate(selectedDateKey, draftKeys);
    if (selectedDateKey === getLocalDateKey()) {
      syncTodayTabWithFixedRoutineApply();
    }
  }, [draftKeys, selectedDateKey, setKeysForDate]);

  const weekdayLabels = useMemo(() => {
    const order: WeekdayIndex[] = [1, 2, 3, 4, 5, 6, 0];
    return order.map((index) => formatWeekdayLabel(index, locale));
  }, [locale]);

  const calendarDays = useMemo(() => buildCalendarMonthGrid(monthCursor), [monthCursor]);
  const monthTitle = t('dayPlan.monthTitle', {
    year: monthCursor.getFullYear(),
    month: monthCursor.getMonth() + 1,
  });
  const selectedLabel = formatDateKeyCompact(selectedDateKey, locale);
  const selectedCount = draftKeys.length;
  const draftSet = useMemo(() => new Set(draftKeys), [draftKeys]);
  const chipBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
  const selectedFill = RetroFlatColors.light.bgMint;
  const selectedInk = RetroFlatColors.light.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.root} accessibilityViewIsModal>
        <Pressable
          style={styles.dim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('dayPlan.close')}
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: surface,
              paddingBottom: Math.max(insets.bottom, 12) + 8,
            },
          ]}>
          <View
            style={[
              styles.grabber,
              { backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)' },
            ]}
          />
          <View style={styles.header}>
            <ThemedText style={[styles.title, { color: ink }]}>
              {t('dayPlan.scheduledRoutine.title')}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={onClose}
              hitSlop={10}>
              <IconSymbol name="xmark" size={20} color={muted} />
            </Pressable>
          </View>
          <ThemedText style={[styles.hint, { color: muted }]}>
            {t('dayPlan.scheduledRoutine.hint')}
          </ThemedText>

          <ScrollView
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
            nestedScrollEnabled>
            <View style={styles.monthHeader}>
              <Pressable
                style={[styles.monthNavBtn, { borderColor: line }]}
                onPress={() => setMonthCursor((prev) => addMonths(prev, -1))}
                accessibilityRole="button"
                accessibilityLabel={t('dayPlan.scheduledRoutine.prevMonthA11y')}>
                <ThemedText style={[styles.monthNavText, { color: ink }]}>‹</ThemedText>
              </Pressable>
              <ThemedText style={[styles.monthTitle, { color: ink }]} numberOfLines={1}>
                {monthTitle}
              </ThemedText>
              <Pressable
                style={[styles.monthNavBtn, { borderColor: line }]}
                onPress={() => setMonthCursor((prev) => addMonths(prev, 1))}
                accessibilityRole="button"
                accessibilityLabel={t('dayPlan.scheduledRoutine.nextMonthA11y')}>
                <ThemedText style={[styles.monthNavText, { color: ink }]}>›</ThemedText>
              </Pressable>
            </View>

            <View style={[styles.calendarFrame, { borderColor: line }]}>
              <View style={styles.todayRow}>
                <Pressable
                  onPress={() => {
                    setMonthCursor(toMonthStart(new Date()));
                    selectDate(todayKey);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t('dayPlan.jumpToToday')}
                  style={[styles.todayBtn, { borderColor: line, backgroundColor: chipBg }]}>
                  <ThemedText style={[styles.todayBtnText, { color: ink }]}>
                    {t('dayPlan.today')}
                  </ThemedText>
                </Pressable>
              </View>
              <View style={styles.weekHeader}>
                {weekdayLabels.map((label) => (
                  <ThemedText key={label} style={[styles.weekHeaderText, { color: muted }]}>
                    {label}
                  </ThemedText>
                ))}
              </View>
              <View style={styles.grid}>
                {calendarDays.map((day) => {
                  const dateKey = localDateToDateKey(day);
                  const inMonth = day.getMonth() === monthCursor.getMonth();
                  const isSelected = dateKey === selectedDateKey;
                  const isToday = isSameLocalDay(day, new Date());
                  const hasDot = Boolean(assignmentsByDate[dateKey]?.categoryKeys?.length);
                  return (
                    <Pressable
                      key={dateKey}
                      onPress={() => selectDate(dateKey)}
                      style={[
                        styles.dayCell,
                        isSelected && { backgroundColor: selectedFill },
                        !inMonth && styles.dayCellOut,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isSelected }}
                      accessibilityLabel={
                        hasDot
                          ? t('dayPlan.scheduledRoutine.dayWithRoutinesA11y', {
                              date: formatDateKeyCompact(dateKey, locale),
                            })
                          : formatDateKeyCompact(dateKey, locale)
                      }>
                      <ThemedText
                        style={[
                          styles.dayText,
                          { color: inMonth ? ink : muted },
                          isSelected && { color: selectedInk, fontWeight: '800' },
                          isToday && !isSelected && { fontWeight: '800' },
                        ]}>
                        {day.getDate()}
                      </ThemedText>
                      {hasDot ? (
                        <View
                          style={[
                            styles.dot,
                            {
                              backgroundColor: isSelected
                                ? selectedInk
                                : RetroFlatColors.light.bgMint,
                            },
                          ]}
                        />
                      ) : (
                        <View style={styles.dotSpacer} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <ThemedText style={[styles.selectedLabel, { color: ink }]}>
              {t('dayPlan.scheduledRoutine.selectedDate', { date: selectedLabel })}
              {selectedCount > 0
                ? ` · ${t('dayPlan.scheduledRoutine.selectedCount', { count: selectedCount })}`
                : ''}
            </ThemedText>

            {sections.length === 0 ? (
              <ThemedText style={[styles.empty, { color: muted }]}>
                {t('dayPlan.scheduledRoutine.emptyCatalog')}
              </ThemedText>
            ) : (
              sections.map((section) => (
                <View key={section.groupKey} style={styles.section}>
                  <ThemedText style={[styles.sectionTitle, { color: muted }]}>
                    {section.title}
                  </ThemedText>
                  {section.items.map((item) => (
                    <ScheduledRoutinePickRow
                      key={item.key}
                      categoryKey={item.key}
                      label={item.label}
                      icon={item.icon}
                      selected={draftSet.has(item.key)}
                      isDark={isDark}
                      ink={ink}
                      line={line}
                      onToggle={() => toggleKey(item.key)}
                    />
                  ))}
                </View>
              ))
            )}
          </ScrollView>

          <BrutalConfirmButton
            label={t('dayPlan.scheduledRoutine.save')}
            onPress={onSave}
            align="stretch"
            compact
            style={styles.saveBtn}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    height: '92%',
    maxHeight: '92%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 8,
    overflow: 'hidden',
  },
  bodyScroll: {
    flex: 1,
    minHeight: 0,
  },
  bodyScrollContent: {
    gap: 10,
    paddingBottom: 12,
    flexGrow: 1,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: -2,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthNavText: {
    fontSize: 22,
    fontWeight: '600',
    marginTop: -2,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  calendarFrame: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    padding: 10,
    gap: 6,
  },
  todayRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  todayBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  todayBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  weekHeader: {
    flexDirection: 'row',
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    paddingVertical: 2,
  },
  dayCellOut: {
    opacity: 0.45,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2,
    marginTop: 2,
  },
  dotSpacer: {
    width: 5,
    height: 5,
    marginTop: 2,
  },
  selectedLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  empty: {
    fontSize: 13,
    lineHeight: 18,
    paddingVertical: 12,
  },
  section: {
    gap: 0,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  rowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 0,
  },
  rowSelectedFill: {
    ...StyleSheet.absoluteFillObject,
  },
  rowForeground: {
    zIndex: 1,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.25,
    zIndex: 1,
  },
  checkWrap: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  saveBtn: {
    marginTop: 4,
  },
});
