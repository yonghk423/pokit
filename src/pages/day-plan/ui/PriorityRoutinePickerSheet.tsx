import { AppAlert as Alert } from '@shared/lib/app-alert';
import { AppModal as Modal } from '@shared/ui/app-modal';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  addDaysToLocalDateKey,
  computeSpineGapInsertSlot,
  getLocalDateKey,
  isSpineBlockScheduleWithinPriorityWindow,
  resolveCategoryCatalogIcon,
  resolveSpinePriorityWindow,
  type DayPlanBlock,
} from '@entities/day-plan';
import { PrimaryColor } from '@shared/config/theme';
import {
  formatDateKeyCompact,
  formatHhmmClock,
  formatMinuteOfDay,
  useTranslation,
} from '@shared/lib/i18n';
import {
  loadSpineDefaultBlockMinutes,
  saveSpineDefaultBlockMinutes,
  SPINE_GAP_BLOCK_MINUTE_OPTIONS,
} from '@shared/lib/storage';
import { RoutineWheelAddButton } from '@shared/ui/routine-wheel-add-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

const SELECT_IDLE = 'rgba(0,0,0,0)';
const SELECT_MINT_LIGHT = '#C8EBDD';
const SELECT_MINT_DARK = 'rgba(168,218,220,0.28)';
const SELECT_EASE = Easing.out(Easing.cubic);

/** Soft mint fill when a rhythm row is checked. */
function MintSelectRow({
  selected,
  isDark,
  onPress,
  accessibilityLabel,
  children,
}: {
  selected: boolean;
  isDark: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const progress = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: 240, easing: SELECT_EASE });
  }, [progress, selected]);
  const faceStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [SELECT_IDLE, isDark ? SELECT_MINT_DARK : SELECT_MINT_LIGHT],
    ),
  }));
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [pressed && { transform: [{ translateY: 1 }] }]}>
      <Animated.View style={[styles.pickRow, faceStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

import {
  flattenAddablePriorityCatalogItems,
  type AddablePriorityCatalogSection,
} from '../lib/priorityCatalog';

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

/** 담기·구간 연결·타임라인 갭 추가용 다중 선택 시트 (레거시 그룹 헤더 없이 평면 목록) */
export function PriorityRoutinePickerSheet({
  visible,
  sections,
  isDark,
  ink,
  muted,
  surface,
  line,
  confirmLabel,
  spineGapAdd = null,
  onClose,
  onConfirm,
  onCreateCustom,
}: Props) {
  const insets = useSafeAreaInsets();
  const { t, locale } = useTranslation();
  const sectionLine = isDark ? 'rgba(215,222,211,0.20)' : 'rgba(96,107,93,0.22)';
  const resolvedConfirmLabel = confirmLabel ?? t('dayPlan.confirmLink');
  const scrollRef = useRef<ScrollView>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [scheduleByKey, setScheduleByKey] = useState<Record<string, RoutinePickerSpineSchedule>>({});
  const [expandedTimeKey, setExpandedTimeKey] = useState<string | null>(null);
  const [defaultBlockMinutes, setDefaultBlockMinutes] = useState(() => loadSpineDefaultBlockMinutes());

  const spineTimeEnabled = spineGapAdd != null;
  /** 구 카테고리(건강 루틴·생산성 도구) 헤더 없이 이름순 평면 목록 */
  const flatItems = useMemo(
    () => flattenAddablePriorityCatalogItems(sections, locale),
    [locale, sections],
  );
  const baseDateKey = useMemo(() => getLocalDateKey(), []);
  const baseDateLabel = useMemo(() => formatDateKeyCompact(baseDateKey, locale), [baseDateKey, locale]);
  const nextDateLabel = useMemo(
    () => formatDateKeyCompact(addDaysToLocalDateKey(baseDateKey, 1), locale),
    [baseDateKey, locale],
  );

  const scrollTimePanelIntoView = useCallback(() => {
    // 키패드가 시간 입력을 가리지 않도록 아래로 여유 있게 스크롤
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

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
            t('catalog.checkTimeTitle'),
            t('dayPlan.blockExceedsEnd', { end: formatHhmmClock(spineGapAdd.priorityEnd, locale) }),
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
  }, [canConfirm, locale, onClose, onConfirm, scheduleByKey, selectedKeys, spineGapAdd, spineTimeEnabled, t]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 12 : 0}>
        <View style={[styles.sheet, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <PaperGrain opacity={0.35} />
        <View style={[styles.header, { borderBottomColor: sectionLine }]}>
          {onCreateCustom ? (
            <RoutineWheelAddButton
              icon="createCard"
              size={42}
              label={t('fixedRoutine.createNew')}
              invite
              onPress={onCreateCustom}
            />
          ) : (
            <View style={styles.createButtonSpacer} />
          )}
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>
        {spineGapAdd ? (
          <View style={[styles.defaultDurationSection, { borderBottomColor: line }]}>
            <ThemedText style={[styles.defaultDurationLabel, { color: muted }]}>{t('dayPlan.defaultGapLabel')}</ThemedText>
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
                    accessibilityLabel={t('dayPlan.defaultGapA11y', { count: min })}
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
                      {t('common.minutesUnit', { count: min })}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 24) }]}
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive">
          {flatItems.map((cat) => {
            const selected = selectedKeys.has(cat.key);
            const schedule = scheduleByKey[cat.key];
            const isTimeExpanded = expandedTimeKey === cat.key;
            const timeHighlighted = selected && schedule != null;

            return (
              <View key={cat.key} style={[styles.pickRowWrap, { borderBottomColor: line }]}>
                <MintSelectRow
                  selected={selected}
                  isDark={isDark}
                  accessibilityLabel={`${cat.label} ${selected ? t('common.selected') : t('common.select')}`}
                  onPress={() => toggleSelection(cat.key)}>
                  <IconSymbol
                    name={resolveCategoryCatalogIcon(cat.key) as 'drop.fill'}
                    size={18}
                    color={activeIconColorByCategory(cat.key, isDark)}
                  />
                  <ThemedText style={[styles.rowLabel, { color: ink }]}>{cat.label}</ThemedText>
                  {spineTimeEnabled && selected ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isTimeExpanded, selected: timeHighlighted }}
                      accessibilityLabel={
                        schedule
                          ? t('dayPlan.categoryTimeRangeA11y', {
                              label: cat.label,
                              start: formatMinuteOfDay(schedule.startMinutes, locale),
                              end: formatMinuteOfDay(schedule.endMinutes, locale),
                            })
                          : t('fixedRoutine.timePickA11y', { label: cat.label })
                      }
                      hitSlop={10}
                      onPress={(event) => {
                        event.stopPropagation();
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setExpandedTimeKey((current) => {
                          const next = current === cat.key ? null : cat.key;
                          if (next) {
                            requestAnimationFrame(() => scrollTimePanelIntoView());
                          }
                          return next;
                        });
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
                              : PrimaryColor.rgb
                        }
                      />
                    </Pressable>
                  ) : null}
                </MintSelectRow>
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
                      onRequestScrollIntoView={scrollTimePanelIntoView}
                      contentInsetLeft={28}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
          {flatItems.length === 0 ? (
            <ThemedText style={[styles.empty, { color: muted }]}>
              {t('fixedRoutine.modalEmpty')}
            </ThemedText>
          ) : null}
        </ScrollView>
        <View
          style={[
            styles.footer,
            {
              borderTopColor: sectionLine,
              paddingBottom: Math.max(insets.bottom, 12),
            },
          ]}>
          <RoutineWheelAddButton
            icon="confirmAdd"
            label={
              canConfirm
                ? t('dayPlan.confirmRoutineCountA11y', {
                    count: selectedCount,
                    action: resolvedConfirmLabel,
                  })
                : t('dayPlan.pickRoutineHint')
            }
            style={{ alignSelf: 'flex-end' }}
            disabled={!canConfirm}
            invite
            onPress={handleConfirm}
          />
        </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sheet: { flex: 1, overflow: 'hidden' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  createButtonSpacer: {
    width: 40,
    height: 40,
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
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  empty: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    paddingVertical: 8,
  },
});
