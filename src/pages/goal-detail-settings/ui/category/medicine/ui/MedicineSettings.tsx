import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import {
  addCategoryToTodayRoutine,
  formatHhmmClockKo,
  formatMinutesToHHmm,
  isCategoryOnTodayPlan,
  parseHHmmToMinutes,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { useLocalNotificationsStore } from '@entities/local-notifications';
import { syncMedicineReminderNotifications } from '@features/day-plan-notifications';
import { RetroFlatColors, SOLID_SHADOW_OFFSET } from '@shared/config/retroFlat';
import { useTranslation } from '@shared/lib/i18n';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { OutlinedSwitch } from '@shared/ui/outlined-switch';
import { useUiSurfacePresentation } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { CatalogRowSpineTimePanel } from '@widgets/daily-rhythm-time-field';

import { useGoalDetailSettingsPalette } from '../../lib/settingsPalette';
import { SettingsProgressBand } from '../../lib/SettingsProgressBand';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import {
  getInitialMedicineDataConfig,
  normalizeMedicineDetailConfig,
  type MedicineDetailDataConfig,
} from './medicineConfig';

const PRIMARY = 'rgb(0, 0, 0)';

const SLOT_GRID: {
  key: 'morning' | 'lunch' | 'dinner';
  labelKey: 'mealSlot.morning' | 'mealSlot.lunch' | 'mealSlot.dinner';
  cardSubKey: 'goalDetail.medicine.morningSub' | 'goalDetail.medicine.lunchSub' | 'goalDetail.medicine.dinnerSub';
  icon: React.ComponentProps<typeof IconSymbol>['name'];
}[] = [
  { key: 'morning', labelKey: 'mealSlot.morning', cardSubKey: 'goalDetail.medicine.morningSub', icon: 'sun.max.fill' },
  { key: 'lunch', labelKey: 'mealSlot.lunch', cardSubKey: 'goalDetail.medicine.lunchSub', icon: 'sun.max' },
  { key: 'dinner', labelKey: 'mealSlot.dinner', cardSubKey: 'goalDetail.medicine.dinnerSub', icon: 'moon.fill' },
];

const SLOT_APPEAR = FadeIn.duration(240).easing(Easing.out(Easing.cubic));
const SLOT_DISAPPEAR = FadeOut.duration(180).easing(Easing.in(Easing.cubic));
const SLOT_LAYOUT = LinearTransition.duration(280).easing(Easing.out(Easing.cubic));

function slotOn(cfg: MedicineDetailDataConfig, key: 'morning' | 'lunch' | 'dinner'): boolean {
  if (key === 'morning') return cfg.morningOn;
  if (key === 'lunch') return cfg.lunchOn;
  return cfg.dinnerOn;
}

function setSlot(
  cfg: MedicineDetailDataConfig,
  key: 'morning' | 'lunch' | 'dinner',
  on: boolean,
): MedicineDetailDataConfig {
  const next = {
    ...cfg,
    morningOn: key === 'morning' ? on : cfg.morningOn,
    lunchOn: key === 'lunch' ? on : cfg.lunchOn,
    dinnerOn: key === 'dinner' ? on : cfg.dinnerOn,
    ...(on
      ? {
          morningNotify: key === 'morning' ? false : cfg.morningNotify,
          lunchNotify: key === 'lunch' ? false : cfg.lunchNotify,
          dinnerNotify: key === 'dinner' ? false : cfg.dinnerNotify,
        }
      : {}),
  };
  const enabled = [next.morningOn, next.lunchOn, next.dinnerOn].filter(Boolean).length;
  next.dosesPerDay = Math.max(0, Math.min(12, enabled));
  next.takenCount = Math.min(next.takenCount, next.dosesPerDay);
  return normalizeMedicineDetailConfig(next);
}

function timeField(
  cfg: MedicineDetailDataConfig,
  key: 'morning' | 'lunch' | 'dinner',
): string {
  if (key === 'morning') return cfg.morningTime;
  if (key === 'lunch') return cfg.lunchTime;
  return cfg.dinnerTime;
}

function slotTimeNextDay(
  cfg: MedicineDetailDataConfig,
  key: 'morning' | 'lunch' | 'dinner',
): boolean {
  if (key === 'morning') return cfg.morningTimeNextDay;
  if (key === 'lunch') return cfg.lunchTimeNextDay;
  return cfg.dinnerTimeNextDay;
}

function withTime(
  cfg: MedicineDetailDataConfig,
  key: 'morning' | 'lunch' | 'dinner',
  time: string,
  nextDay = false,
): MedicineDetailDataConfig {
  const n = { ...cfg };
  if (key === 'morning') {
    n.morningTime = time;
    n.morningTimeNextDay = nextDay;
  } else if (key === 'lunch') {
    n.lunchTime = time;
    n.lunchTimeNextDay = nextDay;
  } else {
    n.dinnerTime = time;
    n.dinnerTimeNextDay = nextDay;
  }
  return normalizeMedicineDetailConfig(n);
}

function slotNotify(cfg: MedicineDetailDataConfig, key: 'morning' | 'lunch' | 'dinner'): boolean {
  if (key === 'morning') return cfg.morningNotify;
  if (key === 'lunch') return cfg.lunchNotify;
  return cfg.dinnerNotify;
}

function setSlotNotify(
  cfg: MedicineDetailDataConfig,
  key: 'morning' | 'lunch' | 'dinner',
  on: boolean,
): MedicineDetailDataConfig {
  return normalizeMedicineDetailConfig({
    ...cfg,
    morningNotify: key === 'morning' ? on : cfg.morningNotify,
    lunchNotify: key === 'lunch' ? on : cfg.lunchNotify,
    dinnerNotify: key === 'dinner' ? on : cfg.dinnerNotify,
  });
}

export function MedicineSettings({
  rhythmTitle,
  categoryKey = 'medicine',
  dataConfig,
  onChangeDataConfig,
  allowRename = true,
  renameLockedReason = null,
  embedded = false,
  intakeMode = false,
  hideTitleField = false,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
  embedded?: boolean;
  /** 건강을 위한 섭취 — 약·영양제 등 포괄 문구 */
  intakeMode?: boolean;
  hideTitleField?: boolean;
}) {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const c = useGoalDetailSettingsPalette(isDark);
  const isNote = useUiSurfacePresentation() === 'note';
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  const priorityStart = useDayPlanDraftStore((s) => s.priorityStart);
  const priorityEnd = useDayPlanDraftStore((s) => s.priorityEnd);
  const [draft, setDraft] = useState<MedicineDetailDataConfig>(() =>
    normalizeMedicineDetailConfig(dataConfig ?? getInitialMedicineDataConfig()),
  );
  /** 부모 `dataConfig`와 동일한 JSON이면 재적용·재전송 생략 (두 effect 간 간섭 방지) */
  const lastSyncedJsonRef = useRef<string | null>(null);

  useEffect(() => {
    const incoming = normalizeMedicineDetailConfig(dataConfig ?? getInitialMedicineDataConfig());
    const s = JSON.stringify(incoming);
    if (lastSyncedJsonRef.current === s) return;
    lastSyncedJsonRef.current = s;
    setDraft(incoming);
  }, [dataConfig]);

  useEffect(() => {
    const payload = normalizeMedicineDetailConfig(draft);
    const s = JSON.stringify(payload);
    if (lastSyncedJsonRef.current === s) return;
    lastSyncedJsonRef.current = s;
    onChangeDataConfig(payload);
  }, [draft, onChangeDataConfig]);

  const routineWindowLine = useMemo(
    () => `${formatHhmmClockKo(priorityStart)} – ${formatHhmmClockKo(priorityEnd)}`,
    [priorityEnd, priorityStart],
  );

  const enabledSlots = useMemo(
    () => SLOT_GRID.filter((slot) => slotOn(draft, slot.key)),
    [draft],
  );

  const doseProgressRatio =
    draft.dosesPerDay > 0 ? Math.min(1, draft.takenCount / draft.dosesPerDay) : 0;

  const nextSlotLabel =
    draft.takenCount < draft.dosesPerDay
      ? (enabledSlots[draft.takenCount] ? t(enabledSlots[draft.takenCount].labelKey) : '—')
      : intakeMode
        ? t('goalDetail.medicine.intakeTodayDone')
        : t('goalDetail.medicine.doseTodayDone');

  const copy = intakeMode
    ? {
        progressTitle: t('goalDetail.medicine.intakeProgressTitle'),
        progressDone: t('goalDetail.medicine.intakeProgressDone'),
        progressEmpty: t('goalDetail.medicine.intakeProgressEmpty'),
        actionDone: t('goalDetail.medicine.intakeActionDone'),
        actionReset: t('goalDetail.medicine.intakeReset'),
        doseCountLabel: t('goalDetail.medicine.intakeCount'),
        itemNameLabel: t('goalDetail.medicine.itemName'),
        itemNamePlaceholder: t('goalDetail.medicine.itemPlaceholder'),
        slotSectionLabel: t('goalDetail.medicine.intakeSlots'),
        slotToggleA11y: (label: string, on: boolean) =>
          t('goalDetail.medicine.intakeToggleA11y', {
            label,
            state: on ? t('goalDetail.medicine.toggleOn') : t('goalDetail.medicine.toggleOff'),
          }),
        slotTimeLabel: (label: string) => t('goalDetail.medicine.intakeTime', { label }),
        slotNotifyLabel: (label: string) => t('goalDetail.medicine.intakeNotify', { label }),
        itemIcon: 'pills.fill' as const,
      }
    : {
        progressTitle: t('goalDetail.medicine.doseProgressTitle'),
        progressDone: t('goalDetail.medicine.doseProgressDone'),
        progressEmpty: t('goalDetail.medicine.doseProgressEmpty'),
        actionDone: t('goalDetail.medicine.doseActionDone'),
        actionReset: t('goalDetail.medicine.doseReset'),
        doseCountLabel: t('goalDetail.medicine.doseCount'),
        itemNameLabel: t('goalDetail.medicine.medName'),
        itemNamePlaceholder: t('goalDetail.medicine.medPlaceholder'),
        slotSectionLabel: t('goalDetail.medicine.doseSlots'),
        slotToggleA11y: (label: string, on: boolean) =>
          t('goalDetail.medicine.doseToggleA11y', {
            label,
            state: on ? t('goalDetail.medicine.toggleOn') : t('goalDetail.medicine.toggleOff'),
          }),
        slotTimeLabel: (label: string) => t('goalDetail.medicine.doseTime', { label }),
        slotNotifyLabel: (label: string) => t('goalDetail.medicine.doseNotify', { label }),
        itemIcon: 'pills.fill' as const,
      };

  const toggleSlotTaken = (slotKey: 'morning' | 'lunch' | 'dinner') => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft((prev) => {
      const slots = SLOT_GRID.filter((slot) => slotOn(prev, slot.key));
      const index = slots.findIndex((slot) => slot.key === slotKey);
      if (index < 0) return prev;
      const nextTaken = index < prev.takenCount ? index : index + 1;
      return normalizeMedicineDetailConfig({ ...prev, takenCount: nextTaken });
    });
  };

  const handleSlotEnabledChange = (slotKey: 'morning' | 'lunch' | 'dinner', enabled: boolean) => {
    void Haptics.selectionAsync();
    setDraft((prev) => setSlot(prev, slotKey, enabled));
  };

  const reminderOverlayRaw = (medicine: unknown) =>
    intakeMode ? { templateKey: 'healthIntake' as const, medicine } : medicine;

  const promptAddToTodayRoutine = (overlayRaw: unknown) => {
    const key = categoryKey.trim();
    if (!key || isCategoryOnTodayPlan(key)) return;
    Alert.alert(
      t('goalDetail.medicine.addToTodayTitle'),
      t('goalDetail.medicine.addToTodayMessage'),
      [
        { text: t('common.later'), style: 'cancel' },
        {
          text: t('goalDetail.medicine.addToTodayAction'),
          onPress: () => {
            addCategoryToTodayRoutine(key);
            void syncMedicineReminderNotifications({ categoryKey: key, raw: overlayRaw });
          },
        },
      ],
    );
  };

  const handleSlotNotifyChange = (slotKey: 'morning' | 'lunch' | 'dinner', enabled: boolean) => {
    const next = setSlotNotify(draft, slotKey, enabled);
    setDraft(next);
    const key = categoryKey.trim();
    const overlayRaw = reminderOverlayRaw(next);
    void (async () => {
      if (enabled) {
        const permitted = await useLocalNotificationsStore.getState().ensurePermission();
        if (!permitted) {
          setDraft((prev) => setSlotNotify(prev, slotKey, false));
          Alert.alert(t('alert.permission.title'), t('alert.permission.message'));
          return;
        }
        if (key && !isCategoryOnTodayPlan(key)) {
          promptAddToTodayRoutine(overlayRaw);
        }
      }
      await syncMedicineReminderNotifications(
        key ? { categoryKey: key, raw: overlayRaw } : undefined,
      );
    })();
  };

  return (
    <Animated.View layout={SLOT_LAYOUT} style={[styles.shell, embedded && styles.shellEmbedded]}>
      {!embedded && !hideTitleField ? (
        <RoutineTitleField
          value={draft.displayName}
          onChangeValue={(displayName) => setDraft((prev) => ({ ...prev, displayName }))}
          fallback={titleFallback}
          allowRename={allowRename}
          renameLockedReason={renameLockedReason}
          palette={c}
        />
      ) : null}

      {!embedded ? (
        <RoutineSummaryField
          value={draft.summary}
          onChangeValue={(summary) => setDraft((prev) => ({ ...prev, summary }))}
          palette={c}
        />
      ) : null}

      <View style={[styles.slotRowWrap, isNote && styles.rowNote]}>
        <View style={styles.slotColumn}>
          <ThemedText style={[styles.rowTitle, { color: c.onSurface }]}>{copy.slotSectionLabel}</ThemedText>
          <View style={styles.slotRow}>
            {SLOT_GRID.map((slot) => {
              const on = slotOn(draft, slot.key);
              const tone = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
              const bg = on ? tone.bgMint : isDark ? tone.surfaceAlt : '#FFFFFF';
              const borderCol = tone.border;
              const fg = on ? (isDark ? tone.text : tone.tertiary) : tone.text;
              const shadowInk = isDark ? tone.solidShadow : '#000000';
              return (
                <View key={slot.key} style={styles.slotChipShell}>
                  <View
                    pointerEvents="none"
                    style={[styles.slotChipShadow, { backgroundColor: shadowInk }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={copy.slotToggleA11y(t(slot.labelKey), on)}
                    android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
                    onPress={() => handleSlotEnabledChange(slot.key, !on)}
                    style={[
                      styles.slotChip,
                      { backgroundColor: bg, borderColor: borderCol },
                    ]}>
                    <ThemedText style={[styles.slotChipText, { color: fg }]}>
                      {t(slot.labelKey)}
                    </ThemedText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <SettingsProgressBand
        title={copy.progressTitle}
        valueLine={t('goalDetail.medicine.doseValue', { taken: draft.takenCount, total: draft.dosesPerDay })}
        subLine={
          draft.dosesPerDay > 0
            ? draft.takenCount >= draft.dosesPerDay
              ? copy.progressDone
              : t('goalDetail.medicine.nextSlot', { label: nextSlotLabel, percent: Math.round(doseProgressRatio * 100) })
            : copy.progressEmpty
        }
        ratio={doseProgressRatio}
        palette={c}
      />

      {enabledSlots.length > 0 ? (
        <Animated.View
          entering={SLOT_APPEAR}
          exiting={SLOT_DISAPPEAR}
          layout={SLOT_LAYOUT}
          style={styles.slotStatusShell}>
          <View
            pointerEvents="none"
            style={[
              styles.slotStatusShadow,
              { backgroundColor: isDark ? RetroFlatColors.dark.solidShadow : '#000000' },
            ]}
          />
        <View style={[styles.slotStatusWrap, { borderColor: '#000000', backgroundColor: c.surfaceLowest }]}>
          {enabledSlots.map((slot, index) => {
            const isDone = index < draft.takenCount;
            const isCurrent = index === draft.takenCount;
            const statusLabel = isDone ? t('goalDetail.medicine.statusDone') : isCurrent ? t('goalDetail.medicine.statusNext') : t('goalDetail.medicine.statusScheduled');
            const slotTitle = t(slot.labelKey);
            return (
              <Animated.View
                key={slot.key}
                entering={SLOT_APPEAR}
                exiting={SLOT_DISAPPEAR}
                layout={SLOT_LAYOUT}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${slotTitle} · ${t('common.remove')}`}
                  onPress={() => handleSlotEnabledChange(slot.key, false)}
                  style={({ pressed }) => [
                    styles.slotStatusRow,
                    index < enabledSlots.length - 1 && { borderBottomColor: c.outlineVariant },
                    index === enabledSlots.length - 1 && { borderBottomWidth: 0 },
                    isCurrent && { backgroundColor: 'rgba(0,0,0,0.04)' },
                    pressed && { transform: [{ translateY: 1 }] },
                  ]}>
                  <View style={styles.slotStatusLeft}>
                    <IconSymbol name={slot.icon} size={16} color={isDone ? PRIMARY : c.onVariant} />
                    <ThemedText style={[styles.slotStatusLabel, { color: c.onSurface }]}>{slotTitle}</ThemedText>
                    <ThemedText style={[styles.slotStatusTime, { color: c.onVariant }]}>
                      {slotTimeNextDay(draft, slot.key)
                        ? `${t('dayPlan.nextDayPrefix')} ${formatHhmmClockKo(timeField(draft, slot.key))}`
                        : formatHhmmClockKo(timeField(draft, slot.key))}
                    </ThemedText>
                  </View>
                  <ThemedText
                    style={[
                      styles.slotStatusBadge,
                      {
                        color: isDone ? PRIMARY : isCurrent ? c.onSurface : c.onVariant,
                      },
                    ]}>
                    {statusLabel}
                  </ThemedText>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
        </Animated.View>
      ) : null}

      <View
        style={[
          styles.metricBar,
          !isNote && { borderTopColor: '#000', borderBottomColor: c.outline },
          isNote && styles.metricBarNote,
        ]}>
        <View style={styles.metricItem}>
          <ThemedText style={[styles.metricValue, { color: c.onSurface }]}>{draft.takenCount}</ThemedText>
          <ThemedText style={[styles.metricLabel, { color: c.onVariant }]}>{t('goalDetail.medicine.doneCount')}</ThemedText>
        </View>
        <View style={styles.metricItem}>
          <ThemedText style={[styles.metricValue, { color: c.onSurface }]}>{draft.dosesPerDay}</ThemedText>
          <ThemedText style={[styles.metricLabel, { color: c.onVariant }]}>{copy.doseCountLabel}</ThemedText>
        </View>
        <View style={styles.metricItem}>
          <ThemedText style={[styles.metricValue, { color: c.onSurface }]}>
            {Math.max(0, draft.dosesPerDay - draft.takenCount)}
          </ThemedText>
          <ThemedText style={[styles.metricLabel, { color: c.onVariant }]}>{t('goalDetail.medicine.remainingCount')}</ThemedText>
        </View>
      </View>

      {!intakeMode ? (
        <View
          style={[
            styles.routineWindowBand,
            !isNote && { borderColor: c.outline, backgroundColor: '#f4f4f5' },
            isNote && styles.routineWindowBandNote,
          ]}>
          <ThemedText style={[styles.routineWindowLabel, { color: c.onVariant }]}>{t('goalDetail.medicine.routineWindow')}</ThemedText>
          <ThemedText style={[styles.routineWindowTime, { color: c.onSurface }]}>{routineWindowLine}</ThemedText>
        </View>
      ) : null}

      <View style={[styles.rowsWrap, !isNote && { borderTopColor: '#000' }, isNote && styles.rowsWrapNote]}>
        <View style={[styles.row, !isNote && { borderBottomColor: c.outline }, isNote && styles.rowNote]}>
          <View style={styles.rowLeft}>
            <IconSymbol name={copy.itemIcon} size={18} color={PRIMARY} />
            <ThemedText style={[styles.rowTitle, { color: c.onSurface }]}>{copy.itemNameLabel}</ThemedText>
          </View>
          <ThemedTextInput
            value={draft.doseLabel}
            onChangeText={(next) => setDraft((prev) => ({ ...prev, doseLabel: next }))}
            placeholder={copy.itemNamePlaceholder}
            placeholderTextColor={c.outline}
            style={[styles.rowInput, { color: c.onSurface }]}
          />
        </View>

        {SLOT_GRID.map((slot) => {
          if (!slotOn(draft, slot.key)) return null;
          const notifyOn = slotNotify(draft, slot.key);
          const enabledIndex = enabledSlots.findIndex((row) => row.key === slot.key);
          const isSlotDone = enabledIndex >= 0 && enabledIndex < draft.takenCount;
          const slotTitle = t(slot.labelKey);
          return (
            <Animated.View
              key={slot.key}
              entering={SLOT_APPEAR}
              exiting={SLOT_DISAPPEAR}
              layout={SLOT_LAYOUT}
              style={[
                styles.slotDetailBlock,
                !isNote && { borderBottomColor: c.outline },
                isNote && styles.slotDetailBlockNote,
              ]}>
              <View style={styles.medicineTimePickerRow}>
                <ThemedText style={[styles.notifyWindowCaption, { color: c.onVariant }]}>
                  {t('dayPlan.bagRowDayWindowCaption', { window: routineWindowLine })}
                </ThemedText>
                <CatalogRowSpineTimePanel
                  startMinutes={parseHHmmToMinutes(timeField(draft, slot.key)) ?? 8 * 60 + 30}
                  endMinutes={parseHHmmToMinutes(timeField(draft, slot.key)) ?? 8 * 60 + 30}
                  endsNextCalendarDay={slotTimeNextDay(draft, slot.key)}
                  presentation="sheet"
                  visualStyle="default"
                  contentInsetLeft={0}
                  ink={c.onSurface}
                  muted={c.onVariant}
                  line={c.border}
                  isDark={isDark}
                  priorityStart={priorityStart}
                  priorityEnd={priorityEnd}
                  scheduleMode="single"
                  showSheetConfirm={false}
                  showEndDateChoice
                  startFieldLabel={t('goalDetail.medicine.notifyTimeLabel', {
                    label: t(slot.labelKey),
                  })}
                  startFieldHint={t('goalDetail.medicine.notifyTimeHint')}
                  dayChoiceQuestion={t('goalDetail.medicine.notifyDayQuestion')}
                  onScheduleChange={(start, _end, endsNext) => {
                    setDraft((prev) =>
                      withTime(prev, slot.key, formatMinutesToHHmm(start), endsNext),
                    );
                  }}
                />
              </View>
              <View style={[styles.row, styles.rowInSlotGroup, styles.slotNotifyRow]}>
                <ThemedText style={[styles.rowSubTitle, { color: c.onVariant }]}>{copy.slotNotifyLabel(t(slot.labelKey))}</ThemedText>
                <View style={styles.slotNotifySwitchWrap}>
                  <OutlinedSwitch
                    value={notifyOn}
                    onValueChange={(v) => handleSlotNotifyChange(slot.key, v)}
                    trackColor={{ true: PRIMARY, false: 'rgba(0,0,0,0.28)' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
              <View style={styles.slotDoseAction} pointerEvents="box-none">
                <View style={styles.doseActionBtnCompact} collapsable={false}>
                  <View
                    pointerEvents="none"
                    style={[
                      styles.doseActionShadow,
                      { backgroundColor: isDark ? RetroFlatColors.dark.solidShadow : '#000000' },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSlotDone }}
                    accessibilityLabel={
                      isSlotDone
                        ? t('session.medicine.uncheckA11y', { title: slotTitle })
                        : `${slotTitle} · ${copy.actionDone}`
                    }
                    onPress={() => toggleSlotTaken(slot.key)}
                    style={[
                      styles.doseActionBtn,
                      {
                        backgroundColor: isDark
                          ? RetroFlatColors.dark.primary
                          : RetroFlatColors.light.primaryContainer,
                      },
                      isSlotDone && styles.doseActionBtnDone,
                    ]}>
                    <ThemedText
                      style={[
                        styles.doseActionBtnText,
                        {
                          color: isDark
                            ? RetroFlatColors.dark.primaryOn
                            : RetroFlatColors.light.primary,
                        },
                      ]}>
                      {isSlotDone ? t('goalDetail.medicine.statusDone') : copy.actionDone}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 12, paddingVertical: 6 },
  shellEmbedded: { paddingVertical: 0, gap: 10 },
  routineWindowBand: {
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
    alignSelf: 'stretch',
  },
  routineWindowLabel: { fontSize: 12, fontWeight: '400', letterSpacing: -0.15 },
  routineWindowTime: { fontSize: 14, fontWeight: '400', letterSpacing: -0.2 },
  metricBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 16, fontWeight: '400', letterSpacing: -0.2 },
  metricLabel: { fontSize: 11, fontWeight: '400' },
  rowsWrap: { borderTopWidth: 1 },
  slotDetailBlock: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
  },
  rowInSlotGroup: {
    borderBottomWidth: 0,
  },
  slotNotifyRow: {
    minHeight: 40,
    paddingVertical: 4,
    alignItems: 'center',
  },
  slotNotifySwitchWrap: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  slotDoseAction: {
    paddingTop: 2,
    paddingBottom: 8,
    alignItems: 'flex-end',
  },
  doseActionBtnCompact: {
    alignSelf: 'flex-end',
    marginRight: SOLID_SHADOW_OFFSET,
    marginBottom: SOLID_SHADOW_OFFSET,
  },
  doseActionShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: SOLID_SHADOW_OFFSET }, { translateY: SOLID_SHADOW_OFFSET }],
  },
  doseActionBtn: {
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  doseActionBtnDone: {
    backgroundColor: '#C5E8E9',
  },
  doseActionBtnText: { fontSize: 13, fontWeight: '400' },
  rowSubTitle: { fontSize: 12, fontWeight: '400' },
  slotRowWrap: {
    flexDirection: 'column',
    alignItems: 'stretch',
    minHeight: 0,
    paddingVertical: 8,
  },
  slotColumn: { gap: 6, width: '100%' },
  row: {
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 14, fontWeight: '400' },
  rowInput: { flex: 1, fontSize: 14, fontWeight: '400', textAlign: 'right', minHeight: 32, maxWidth: '70%' },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    marginTop: 2,
    alignSelf: 'stretch',
  },
  slotChipShell: {
    flex: 1,
    marginRight: SOLID_SHADOW_OFFSET,
    marginBottom: SOLID_SHADOW_OFFSET,
  },
  slotChipShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: SOLID_SHADOW_OFFSET }, { translateY: SOLID_SHADOW_OFFSET }],
  },
  slotChip: {
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  slotChipText: { fontSize: 12, fontWeight: '400', letterSpacing: -0.2 },
  medicineTimePickerRow: {
    paddingVertical: 2,
    gap: 8,
  },
  notifyWindowCaption: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.15,
  },
  doseActionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  doseResetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  doseResetBtnText: { fontSize: 13, fontWeight: '400' },
  slotStatusShell: {
    marginRight: SOLID_SHADOW_OFFSET,
    marginBottom: SOLID_SHADOW_OFFSET,
  },
  slotStatusShadow: {
    ...StyleSheet.absoluteFillObject,
    transform: [{ translateX: SOLID_SHADOW_OFFSET }, { translateY: SOLID_SHADOW_OFFSET }],
  },
  slotStatusWrap: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  slotStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  slotStatusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  slotStatusLabel: { fontSize: 13, fontWeight: '400' },
  slotStatusTime: { fontSize: 12, fontWeight: '400' },
  slotStatusBadge: { fontSize: 12, fontWeight: '400' },
  doseResetBtnNote: {
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  metricBarNote: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingVertical: 8,
    justifyContent: 'space-around',
  },
  routineWindowBandNote: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 6,
  },
  rowsWrapNote: {
    borderTopWidth: 0,
    marginTop: 4,
    gap: 2,
  },
  rowNote: {
    minHeight: 0,
    paddingVertical: 6,
    borderBottomWidth: 0,
  },
  slotDetailBlockNote: {
    borderBottomWidth: 0,
    paddingVertical: 6,
  },
});
