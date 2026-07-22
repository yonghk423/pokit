import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addDaysToLocalDateKey,
  computeSpineGapInsertSlot,
  formatHhmmClockKo,
  formatMinuteOfDayKo,
  getLocalDateKey,
  isSpineBlockScheduleWithinPriorityWindow,
  resolveCategoryCatalogIcon,
  resolveSpinePriorityWindow,
  type DayPlanBlock,
} from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import {
  loadSpineDefaultBlockMinutes,
  saveSpineDefaultBlockMinutes,
  SPINE_GAP_BLOCK_MINUTE_OPTIONS,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import { type AddablePriorityCatalogSection } from '../lib/priorityCatalog';

import { CatalogRowSpineTimePanel } from './CatalogRowSpineTimePanel';

export type RoutinePickerSpineSchedule = {
  startMinutes: number;
  endMinutes: number;
  endsNextCalendarDay: boolean;
};

export type RoutinePickerConfirmItem = {
  key: string;
  schedule?: RoutinePickerSpineSchedule;
};

export type SpineGapAddConfig = {
  fromMinutes: number;
  toMinutes: number;
  priorityStart: string;
  priorityEnd: string;
  planBlocks: readonly DayPlanBlock[];
  nowMinutes: number;
};

type Props = {
  visible: boolean;
  title: string;
  sections: AddablePriorityCatalogSection[];
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  confirmLabel?: string;
  spineGapAdd?: SpineGapAddConfig | null;
  onClose: () => void;
  onConfirm: (items: RoutinePickerConfirmItem[]) => void;
  onCreateCustom?: () => void;
};

function buildPendingSpineBlocks(
  scheduleByKey: Record<string, RoutinePickerSpineSchedule>,
  excludeKey?: string,
): DayPlanBlock[] {
  return Object.entries(scheduleByKey)
    .filter(([key]) => key !== excludeKey)
    .map(([key, schedule], index) => ({
      id: `picker-pending-${key}`,
      title: '',
      category: '',
      categoryKey: key,
      startMinutes: schedule.startMinutes,
      endMinutes: schedule.endMinutes,
      ...(schedule.endsNextCalendarDay ? { endsNextCalendarDay: true as const } : {}),
      order: 10_000 + index,
      blockOrigin: 'spineTimeline' as const,
    }));
}

function resolveGapSlotForKey(
  config: SpineGapAddConfig,
  scheduleByKey: Record<string, RoutinePickerSpineSchedule>,
  key: string,
  defaultDurationMin: number,
): RoutinePickerSpineSchedule | null {
  const pendingBlocks = buildPendingSpineBlocks(scheduleByKey, key);
  const slot = computeSpineGapInsertSlot(
    config.fromMinutes,
    config.toMinutes,
    [...config.planBlocks, ...pendingBlocks],
    config.nowMinutes,
    defaultDurationMin,
    1,
    config.priorityStart,
    config.priorityEnd,
  );
  if (!slot) return null;
  return { startMinutes: slot.startMinutes, endMinutes: slot.endMinutes, endsNextCalendarDay: false };
}

function buildSchedulesForSelectedKeys(
  config: SpineGapAddConfig,
  keys: string[],
  defaultDurationMin: number,
): Record<string, RoutinePickerSpineSchedule> {
  const schedules: Record<string, RoutinePickerSpineSchedule> = {};
  for (const key of keys) {
    const slot = resolveGapSlotForKey(config, schedules, key, defaultDurationMin);
    if (slot) schedules[key] = slot;
  }
  return schedules;
}

function formatDateKeyCompactLabel(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const month = Number(m[2]);
  const day = Number(m[3]);
  return `${month}월 ${day}일`;
}

/** 루틴 탭과 동일한 그룹 구조 — 담기·구간 연결·타임라인 갭 추가용 다중 선택 시트 */
export function PriorityRoutinePickerSheet({
  visible,
  title,
  sections,
  isDark,
  ink,
  muted,
  surface,
  line,
  confirmLabel = '연결',
  spineGapAdd = null,
  onClose,
  onConfirm,
  onCreateCustom,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [scheduleByKey, setScheduleByKey] = useState<Record<string, RoutinePickerSpineSchedule>>({});
  const [expandedTimeKey, setExpandedTimeKey] = useState<string | null>(null);
  const [defaultBlockMinutes, setDefaultBlockMinutes] = useState(() => loadSpineDefaultBlockMinutes());

  const spineTimeEnabled = spineGapAdd != null;
  const baseDateKey = useMemo(() => getLocalDateKey(), []);
  const baseDateLabel = useMemo(() => formatDateKeyCompactLabel(baseDateKey), [baseDateKey]);
  const nextDateLabel = useMemo(
    () => formatDateKeyCompactLabel(addDaysToLocalDateKey(baseDateKey, 1)),
    [baseDateKey],
  );

  useEffect(() => {
    if (!visible) return;
    setSelectedKeys(new Set());
    setScheduleByKey({});
    setExpandedTimeKey(null);
    setDefaultBlockMinutes(loadSpineDefaultBlockMinutes());
  }, [visible]);

  const selectedCount = selectedKeys.size;
  const settingsBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)';
  const settingsBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';

  const toggleSelection = useCallback(
    (key: string) => {
      void Haptics.selectionAsync();
      const isSelected = selectedKeys.has(key);
      if (isSelected) {
        setSelectedKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        setScheduleByKey((schedules) => {
          const { [key]: _removed, ...rest } = schedules;
          return rest;
        });
        setExpandedTimeKey((current) => (current === key ? null : current));
        return;
      }

      setSelectedKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      if (spineGapAdd) {
        setScheduleByKey((schedules) => {
          const slot = resolveGapSlotForKey(spineGapAdd, schedules, key, defaultBlockMinutes);
          if (!slot) return schedules;
          return { ...schedules, [key]: slot };
        });
        setExpandedTimeKey(key);
      }
      return;
    },
    [defaultBlockMinutes, selectedKeys, spineGapAdd],
  );

  const handleDefaultBlockMinutesChange = useCallback(
    (minutes: number) => {
      void Haptics.selectionAsync();
      const saved = saveSpineDefaultBlockMinutes(minutes);
      setDefaultBlockMinutes(saved);
      if (!spineGapAdd || selectedKeys.size === 0) return;
      const keys = [...selectedKeys];
      setScheduleByKey(buildSchedulesForSelectedKeys(spineGapAdd, keys, saved));
    },
    [selectedKeys, spineGapAdd],
  );

  const handleScheduleChange = useCallback(
    (key: string, startMinutes: number, endMinutes: number, endsNextCalendarDay: boolean) => {
      let end = endMinutes;
      if (!endsNextCalendarDay && end <= startMinutes) {
        end = Math.min(24 * 60, startMinutes + defaultBlockMinutes);
      }
      setScheduleByKey((prev) => ({
        ...prev,
        [key]: { startMinutes, endMinutes: end, endsNextCalendarDay },
      }));
    },
    [defaultBlockMinutes],
  );

  const canConfirm = useMemo(() => {
    if (selectedCount === 0) return false;
    if (!spineTimeEnabled) return true;
    return [...selectedKeys].every((key) => scheduleByKey[key] != null);
  }, [scheduleByKey, selectedCount, selectedKeys, spineTimeEnabled]);

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;

    if (spineGapAdd && spineTimeEnabled) {
      const window = resolveSpinePriorityWindow(spineGapAdd.priorityStart, spineGapAdd.priorityEnd);
      for (const key of selectedKeys) {
        const schedule = scheduleByKey[key];
        if (!schedule) continue;
        if (
          !window ||
          !isSpineBlockScheduleWithinPriorityWindow(
            {
              startMinutes: schedule.startMinutes,
              endMinutes: schedule.endMinutes,
              endsNextCalendarDay: schedule.endsNextCalendarDay,
            },
            window,
          )
        ) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            '시간을 확인해 주세요',
            `루틴 종료 시간(${formatHhmmClockKo(spineGapAdd.priorityEnd)})을 넘는 일정은 저장할 수 없어요. 하루 시작~마무리 안으로 맞춰 주세요.`,
          );
          return;
        }
      }
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const items: RoutinePickerConfirmItem[] = [...selectedKeys].map((key) => ({
      key,
      schedule: spineTimeEnabled ? scheduleByKey[key] : undefined,
    }));
    onConfirm(items);
    onClose();
  }, [canConfirm, onClose, onConfirm, scheduleByKey, selectedKeys, spineGapAdd, spineTimeEnabled]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          <ThemedText style={[styles.title, { color: ink }]}>{title}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>
        {spineGapAdd ? (
          <View style={[styles.defaultDurationSection, { borderBottomColor: line }]}>
            <ThemedText style={[styles.defaultDurationLabel, { color: muted }]}>기본 간격</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.defaultDurationRow}>
              {SPINE_GAP_BLOCK_MINUTE_OPTIONS.map((min) => {
                const active = min === defaultBlockMinutes;
                return (
                  <Pressable
                    key={min}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`기본 간격 ${min}분`}
                    onPress={() => handleDefaultBlockMinutesChange(min)}
                    style={[
                      styles.defaultDurationChip,
                      {
                        borderColor: active ? ink : line,
                        backgroundColor: active ? ink : isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.defaultDurationChipText,
                        { color: active ? (isDark ? '#09090b' : '#fff') : ink },
                      ]}>
                      {min}분
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {onCreateCustom ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="새로운 루틴 만들기"
              onPress={() => {
                onClose();
                onCreateCustom();
              }}
              style={({ pressed }) => [styles.createRow, pressed && { opacity: 0.72 }]}>
              <IconSymbol name="plus.circle.fill" size={20} color={ink} />
              <ThemedText style={[styles.rowLabel, { color: ink }]}>새로운 루틴 만들기</ThemedText>
            </Pressable>
          ) : null}
          {sections.map((section) => (
            <View key={section.groupKey}>
              <ThemedText style={[styles.sectionTitle, { color: muted }]}>{section.title}</ThemedText>
              {section.items.map((cat) => {
                const selected = selectedKeys.has(cat.key);
                const schedule = scheduleByKey[cat.key];
                const isTimeExpanded = expandedTimeKey === cat.key;
                const timeHighlighted = selected && schedule != null;

                return (
                  <View key={cat.key} style={[styles.pickRowWrap, { borderBottomColor: line }]}>
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${cat.label} ${selected ? '선택됨' : '선택'}`}
                      onPress={() => toggleSelection(cat.key)}
                      style={({ pressed }) => [
                        styles.pickRow,
                        {
                          backgroundColor: selected
                            ? isDark
                              ? 'rgba(255,255,255,0.08)'
                              : 'rgba(0,0,0,0.04)'
                            : 'transparent',
                        },
                        pressed && { opacity: 0.72 },
                      ]}>
                      <IconSymbol
                        name={resolveCategoryCatalogIcon(cat.key) as 'drop.fill'}
                        size={18}
                        color={activeIconColorByCategory(cat.key)}
                      />
                      <ThemedText style={[styles.rowLabel, { color: ink }]}>{cat.label}</ThemedText>
                      {spineTimeEnabled && selected ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ expanded: isTimeExpanded, selected: timeHighlighted }}
                          accessibilityLabel={
                            schedule
                              ? `${cat.label} 시간 ${formatMinuteOfDayKo(schedule.startMinutes)}~${formatMinuteOfDayKo(schedule.endMinutes)}`
                              : `${cat.label} 시간 선택`
                          }
                          hitSlop={10}
                          onPress={(event) => {
                            event.stopPropagation();
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setExpandedTimeKey((current) => (current === cat.key ? null : cat.key));
                          }}
                          style={[
                            styles.timeBtn,
                            {
                              borderColor: isTimeExpanded || timeHighlighted ? ink : settingsBorder,
                              backgroundColor:
                                isTimeExpanded || timeHighlighted
                                  ? isDark
                                    ? 'rgba(255,255,255,0.14)'
                                    : 'rgba(0,0,0,0.06)'
                                  : settingsBg,
                            },
                          ]}>
                          <IconSymbol
                            name="clock.fill"
                            size={15}
                            color={
                              isTimeExpanded || timeHighlighted
                                ? ink
                                : isDark
                                  ? '#FAFAFA'
                                  : PrimaryColor
                            }
                          />
                        </Pressable>
                      ) : null}
                    </Pressable>
                    {spineTimeEnabled && selected && isTimeExpanded && schedule && spineGapAdd ? (
                      <View
                        style={[
                          styles.timePanel,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
                          },
                        ]}>
                        <CatalogRowSpineTimePanel
                          startMinutes={schedule.startMinutes}
                          endMinutes={schedule.endMinutes}
                          endsNextCalendarDay={schedule.endsNextCalendarDay}
                          startDateLabel={baseDateLabel}
                          endDateLabelToday={baseDateLabel}
                          endDateLabelNextDay={nextDateLabel}
                          ink={ink}
                          muted={muted}
                          line={line}
                          isDark={isDark}
                          priorityStart={spineGapAdd.priorityStart}
                          priorityEnd={spineGapAdd.priorityEnd}
                          onScheduleChange={(startMinutes, endMinutes, endsNextCalendarDay) =>
                            handleScheduleChange(cat.key, startMinutes, endMinutes, endsNextCalendarDay)
                          }
                          contentInsetLeft={28}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          ))}
          {sections.length === 0 ? (
            <ThemedText style={[styles.empty, { color: muted }]}>
              연결할 수 있는 루틴이 없어요. 위에서 새로운 루틴을 만들어 보세요.
            </ThemedText>
          ) : null}
        </ScrollView>
        <View
          style={[
            styles.footer,
            {
              borderTopColor: line,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: surface,
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={canConfirm ? `${selectedCount}개 루틴 ${confirmLabel}` : '루틴을 선택해 주세요'}
            disabled={!canConfirm}
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              {
                backgroundColor: canConfirm ? ink : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                opacity: pressed && canConfirm ? 0.9 : 1,
              },
            ]}>
            <ThemedText
              style={[
                styles.confirmLabel,
                { color: canConfirm ? (isDark ? '#09090b' : '#fff') : muted },
              ]}>
              {canConfirm ? `${selectedCount}개 ${confirmLabel}` : '루틴을 선택해 주세요'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12, paddingHorizontal: 20, gap: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  defaultDurationSection: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  defaultDurationLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.15,
    marginTop: 4,
  },
  defaultDurationRow: {
    gap: 8,
    paddingBottom: 2,
  },
  defaultDurationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  defaultDurationChipText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  pickRowWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  timeBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  timePanel: {
    paddingBottom: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 0,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  empty: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    paddingVertical: 8,
  },
});
