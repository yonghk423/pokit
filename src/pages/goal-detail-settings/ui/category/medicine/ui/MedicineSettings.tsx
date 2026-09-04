import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import {
  clampHhmmToPriorityWindow,
  formatHhmmClockKo,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { useUiSurfacePresentation } from '@shared/ui/presentation';
import { paletteForReminderTimeCard, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
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

function withTime(
  cfg: MedicineDetailDataConfig,
  key: 'morning' | 'lunch' | 'dinner',
  time: string,
): MedicineDetailDataConfig {
  const n = { ...cfg, morningTime: cfg.morningTime, lunchTime: cfg.lunchTime, dinnerTime: cfg.dinnerTime };
  if (key === 'morning') n.morningTime = time;
  else if (key === 'lunch') n.lunchTime = time;
  else n.dinnerTime = time;
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

function clampMedicineTimesToRoutine(
  cfg: MedicineDetailDataConfig,
  routineStart: string,
  routineEnd: string,
): MedicineDetailDataConfig {
  const n = normalizeMedicineDetailConfig(cfg);
  return normalizeMedicineDetailConfig({
    ...n,
    morningTime: clampHhmmToPriorityWindow(n.morningTime, routineStart, routineEnd, 1),
    lunchTime: clampHhmmToPriorityWindow(n.lunchTime, routineStart, routineEnd, 1),
    dinnerTime: clampHhmmToPriorityWindow(n.dinnerTime, routineStart, routineEnd, 1),
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
  const c = useMemo(() => goalDetailSettingsPalette(isDark), [isDark]);
  const isNote = useUiSurfacePresentation() === 'note';
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  const pill = useMemo(() => tabPillColors(isDark), [isDark]);
  const priorityStart = useDayPlanDraftStore((s) => s.priorityStart);
  const priorityEnd = useDayPlanDraftStore((s) => s.priorityEnd);

  const [draft, setDraft] = useState<MedicineDetailDataConfig>(() =>
    normalizeMedicineDetailConfig(dataConfig ?? getInitialMedicineDataConfig()),
  );
  /** 부모 `dataConfig`와 동일한 JSON이면 재적용·재전송 생략 (두 effect 간 간섭 방지) */
  const lastSyncedJsonRef = useRef<string | null>(null);

  useEffect(() => {
    const incoming = normalizeMedicineDetailConfig(dataConfig ?? getInitialMedicineDataConfig());
    const clamped = clampMedicineTimesToRoutine(incoming, priorityStart, priorityEnd);
    const s = JSON.stringify(clamped);
    if (lastSyncedJsonRef.current === s) return;
    lastSyncedJsonRef.current = s;
    setDraft(clamped);
  }, [dataConfig, priorityEnd, priorityStart]);

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

  const markDoseTaken = () => {
    setDraft((prev) => {
      if (prev.takenCount >= prev.dosesPerDay) return prev;
      return normalizeMedicineDetailConfig({ ...prev, takenCount: prev.takenCount + 1 });
    });
  };

  const resetDoseTaken = () => {
    setDraft((prev) => normalizeMedicineDetailConfig({ ...prev, takenCount: 0 }));
  };

  const timePickerPalette = useMemo(() => paletteForReminderTimeCard(isDark).timeField, [isDark]);
  const [expandedMedicineTimeKey, setExpandedMedicineTimeKey] = useState<
    'morning' | 'lunch' | 'dinner' | null
  >(null);

  useEffect(() => {
    if (
      expandedMedicineTimeKey &&
      !slotOn(draft, expandedMedicineTimeKey)
    ) {
      setExpandedMedicineTimeKey(null);
    }
  }, [draft, expandedMedicineTimeKey]);

  return (
    <View style={[styles.shell, embedded && styles.shellEmbedded]}>
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

      {draft.dosesPerDay > 0 ? (
        <View style={styles.doseActionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.actionDone}
            onPress={markDoseTaken}
            disabled={draft.takenCount >= draft.dosesPerDay}
            style={({ pressed }) => [
              styles.doseActionBtn,
              isNote && styles.doseActionBtnNote,
              {
                backgroundColor: isNote ? 'transparent' : PRIMARY,
                opacity: draft.takenCount >= draft.dosesPerDay ? 0.35 : pressed ? 0.85 : 1,
              },
            ]}>
            <Text style={[styles.doseActionBtnText, isNote && { color: PRIMARY }]}>{copy.actionDone}</Text>
          </Pressable>
          {draft.takenCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.actionReset}
              onPress={resetDoseTaken}
              style={({ pressed }) => [
                styles.doseResetBtn,
                isNote && styles.doseResetBtnNote,
                !isNote && { borderColor: c.outline },
                pressed && { opacity: 0.75 },
              ]}>
              <Text style={[styles.doseResetBtnText, { color: c.onVariant }]}>{t('common.reset')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {enabledSlots.length > 0 ? (
        <View style={[styles.slotStatusWrap, !isNote && { borderColor: c.outline }, isNote && styles.slotStatusWrapNote]}>
          {enabledSlots.map((slot, index) => {
            const isDone = index < draft.takenCount;
            const isCurrent = index === draft.takenCount;
            const statusLabel = isDone ? t('goalDetail.medicine.statusDone') : isCurrent ? t('goalDetail.medicine.statusNext') : t('goalDetail.medicine.statusScheduled');
            return (
              <View
                key={slot.key}
                style={[
                  styles.slotStatusRow,
                  !isNote && { borderBottomColor: c.outlineVariant },
                  isNote && styles.slotStatusRowNote,
                  isCurrent && !isNote && { backgroundColor: 'rgba(0,0,0,0.04)' },
                ]}>
                <View style={styles.slotStatusLeft}>
                  <IconSymbol name={slot.icon} size={16} color={isDone ? PRIMARY : c.onVariant} />
                  <Text style={[styles.slotStatusLabel, { color: c.onSurface }]}>{t(slot.labelKey)}</Text>
                  <Text style={[styles.slotStatusTime, { color: c.onVariant }]}>
                    {formatHhmmClockKo(timeField(draft, slot.key))}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.slotStatusBadge,
                    {
                      color: isDone ? PRIMARY : isCurrent ? c.onSurface : c.onVariant,
                      fontWeight: isCurrent ? '800' : '700',
                    },
                  ]}>
                  {statusLabel}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View
        style={[
          styles.metricBar,
          !isNote && { borderTopColor: '#000', borderBottomColor: c.outline },
          isNote && styles.metricBarNote,
        ]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>{draft.takenCount}</Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>{t('goalDetail.medicine.doneCount')}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>{draft.dosesPerDay}</Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>{copy.doseCountLabel}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>
            {Math.max(0, draft.dosesPerDay - draft.takenCount)}
          </Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>{t('goalDetail.medicine.remainingCount')}</Text>
        </View>
      </View>

      {!intakeMode ? (
        <View
          style={[
            styles.routineWindowBand,
            !isNote && { borderColor: c.outline, backgroundColor: '#f4f4f5' },
            isNote && styles.routineWindowBandNote,
          ]}>
          <Text style={[styles.routineWindowLabel, { color: c.onVariant }]}>{t('goalDetail.medicine.routineWindow')}</Text>
          <Text style={[styles.routineWindowTime, { color: c.onSurface }]}>{routineWindowLine}</Text>
        </View>
      ) : null}

      <View style={[styles.rowsWrap, !isNote && { borderTopColor: '#000' }, isNote && styles.rowsWrapNote]}>
        <View style={[styles.row, !isNote && { borderBottomColor: c.outline }, isNote && styles.rowNote]}>
          <View style={styles.rowLeft}>
            <IconSymbol name={copy.itemIcon} size={18} color={PRIMARY} />
            <Text style={[styles.rowTitle, { color: c.onSurface }]}>{copy.itemNameLabel}</Text>
          </View>
          <TextInput
            value={draft.doseLabel}
            onChangeText={(t) => setDraft((prev) => ({ ...prev, doseLabel: t }))}
            placeholder={copy.itemNamePlaceholder}
            placeholderTextColor={c.outline}
            style={[styles.rowInput, { color: c.onSurface }]}
          />
        </View>

        <View
          style={[
            styles.row,
            styles.slotRowWrap,
            !isNote && { borderBottomColor: c.outline },
            isNote && styles.rowNote,
          ]}>
          <View style={styles.slotColumn}>
            <Text style={[styles.rowTitle, { color: c.onSurface }]}>{copy.slotSectionLabel}</Text>
            <View style={styles.slotRow}>
              {SLOT_GRID.map((slot) => {
                const on = slotOn(draft, slot.key);
                const bg = on ? pill.activeBg : pill.inactiveBg;
                const borderCol = on ? pill.activeBorder : pill.inactiveBorder;
                const fg = on ? pill.activeIcon : pill.inactiveIcon;
                return (
                  <Pressable
                    key={slot.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={copy.slotToggleA11y(t(slot.labelKey), on)}
                    android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
                    onPress={() => setDraft((prev) => setSlot(prev, slot.key, !slotOn(prev, slot.key)))}
                    style={({ pressed }) => [
                      styles.slotChip,
                      { flex: 1, backgroundColor: bg, borderColor: borderCol },
                      pressed && { opacity: 0.88 },
                    ]}>
                    <Text style={[styles.slotChipText, { color: fg }]}>{t(slot.labelKey)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {SLOT_GRID.map((slot) => {
          if (!slotOn(draft, slot.key)) return null;
          const notifyOn = slotNotify(draft, slot.key);
          return (
            <View
              key={slot.key}
              style={[
                styles.slotDetailBlock,
                !isNote && { borderBottomColor: c.outline },
                isNote && styles.slotDetailBlockNote,
              ]}>
              <View style={styles.medicineTimePickerRow}>
                <SnappedTimePickerField
                  label={copy.slotTimeLabel(t(slot.labelKey))}
                  hint={t('goalDetail.medicine.timeWithinWindow', { window: routineWindowLine })}
                  valueHhmm={timeField(draft, slot.key)}
                  onChangeHhmm={(next) =>
                    setDraft((prev) => withTime(prev, slot.key, next))
                  }
                  expanded={expandedMedicineTimeKey === slot.key}
                  onToggleExpand={() =>
                    setExpandedMedicineTimeKey((cur) => (cur === slot.key ? null : slot.key))
                  }
                  isDark={isDark}
                  palette={timePickerPalette}
                  snapStepMinutes={1}
                  routineDayStartHhmm={priorityStart}
                  routineDayEndHhmm={priorityEnd}
                  compact
                />
              </View>
              <View style={[styles.row, styles.rowInSlotGroup, styles.slotNotifyRow]}>
                <Text style={[styles.rowSubTitle, { color: c.onVariant }]}>{copy.slotNotifyLabel(t(slot.labelKey))}</Text>
                <Switch
                  value={notifyOn}
                  onValueChange={(v) => setDraft((prev) => setSlotNotify(prev, slot.key, v))}
                  trackColor={{ true: PRIMARY, false: 'rgba(0,0,0,0.12)' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          );
        })}
      </View>

    </View>
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
  routineWindowLabel: { fontSize: 12, fontWeight: '600', letterSpacing: -0.15 },
  routineWindowTime: { fontSize: 16, fontWeight: '800', letterSpacing: -0.35 },
  metricBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  metricLabel: { fontSize: 11, fontWeight: '600' },
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
  },
  rowSubTitle: { fontSize: 13, fontWeight: '600' },
  slotRowWrap: {
    flexDirection: 'column',
    alignItems: 'stretch',
    minHeight: 0,
    paddingVertical: 8,
  },
  slotColumn: { gap: 6, width: '100%' },
  row: {
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowInput: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'right', minHeight: 32, maxWidth: '70%' },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
    marginTop: 2,
    alignSelf: 'stretch',
  },
  slotChip: {
    minHeight: 32,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  slotChipText: { fontSize: 12, fontWeight: '800', letterSpacing: -0.2 },
  medicineTimePickerRow: {
    paddingVertical: 2,
  },
  doseActionRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  doseActionBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doseActionBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  doseResetBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  doseResetBtnText: { fontSize: 13, fontWeight: '700' },
  slotStatusWrap: {
    borderWidth: StyleSheet.hairlineWidth,
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
  slotStatusLabel: { fontSize: 14, fontWeight: '700' },
  slotStatusTime: { fontSize: 12, fontWeight: '600' },
  slotStatusBadge: { fontSize: 12 },
  doseActionBtnNote: {
    flex: 0,
    paddingVertical: 4,
    paddingHorizontal: 0,
    alignItems: 'flex-start',
  },
  doseResetBtnNote: {
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  slotStatusWrapNote: {
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  slotStatusRowNote: {
    paddingHorizontal: 0,
    paddingVertical: 5,
    borderBottomWidth: 0,
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
