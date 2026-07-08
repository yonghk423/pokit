import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import {
  clampHhmmToPriorityWindow,
  formatHhmmClockKo,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { IconSymbol } from '@shared/ui/icon-symbol';
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
  label: string;
  cardSub: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
}[] = [
  { key: 'morning', label: '아침', cardSub: '아침 복용', icon: 'sun.max.fill' },
  { key: 'lunch', label: '점심', cardSub: '점심 복용', icon: 'sun.max' },
  { key: 'dinner', label: '저녁', cardSub: '저녁 복용', icon: 'moon.fill' },
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
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const c = useMemo(() => goalDetailSettingsPalette(isDark), [isDark]);
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
      ? enabledSlots[draft.takenCount]?.label ?? '—'
      : intakeMode ? '오늘 섭취 완료' : '오늘 복용 완료';

  const copy = intakeMode
    ? {
        progressTitle: '오늘 섭취',
        progressDone: '오늘 섭취를 모두 마쳤어요',
        progressEmpty: '섭취 슬롯을 켜면 횟수가 정해져요',
        actionDone: '섭취 완료',
        actionReset: '오늘 섭취 기록 초기화',
        doseCountLabel: '섭취 횟수',
        itemNameLabel: '항목 이름',
        itemNamePlaceholder: '약·영양제·보조제 이름',
        slotSectionLabel: '섭취 슬롯',
        slotToggleA11y: (label: string, on: boolean) => `${label} 섭취 ${on ? '켜짐' : '꺼짐'}`,
        slotTimeLabel: (label: string) => `${label} 섭취`,
        slotNotifyLabel: (label: string) => `${label} 섭취 알림`,
        itemIcon: 'pills.fill' as const,
      }
    : {
        progressTitle: '오늘 복용',
        progressDone: '오늘 복용을 모두 마쳤어요',
        progressEmpty: '복용 슬롯을 켜면 횟수가 정해져요',
        actionDone: '복용 완료',
        actionReset: '오늘 복용 기록 초기화',
        doseCountLabel: '복용 횟수',
        itemNameLabel: '약 이름',
        itemNamePlaceholder: '먹는 약 이름을 적어 주세요',
        slotSectionLabel: '복용 슬롯',
        slotToggleA11y: (label: string, on: boolean) => `${label} 복용 ${on ? '켜짐' : '꺼짐'}`,
        slotTimeLabel: (label: string) => `${label} 복용`,
        slotNotifyLabel: (label: string) => `${label} 복용 알림`,
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
        <>
          <RoutineTitleField
            value={draft.displayName}
            onChangeValue={(displayName) => setDraft((prev) => ({ ...prev, displayName }))}
            fallback={titleFallback}
            allowRename={allowRename}
            renameLockedReason={renameLockedReason}
            palette={c}
          />

          <RoutineSummaryField
            value={draft.summary}
            onChangeValue={(summary) => setDraft((prev) => ({ ...prev, summary }))}
            palette={c}
          />
        </>
      ) : null}

      <SettingsProgressBand
        title={copy.progressTitle}
        valueLine={`${draft.takenCount} / ${draft.dosesPerDay}회`}
        subLine={
          draft.dosesPerDay > 0
            ? draft.takenCount >= draft.dosesPerDay
              ? copy.progressDone
              : `다음: ${nextSlotLabel} · ${Math.round(doseProgressRatio * 100)}%`
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
              { backgroundColor: PRIMARY, opacity: draft.takenCount >= draft.dosesPerDay ? 0.35 : pressed ? 0.85 : 1 },
            ]}>
            <Text style={styles.doseActionBtnText}>{copy.actionDone}</Text>
          </Pressable>
          {draft.takenCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.actionReset}
              onPress={resetDoseTaken}
              style={({ pressed }) => [styles.doseResetBtn, { borderColor: c.outline }, pressed && { opacity: 0.75 }]}>
              <Text style={[styles.doseResetBtnText, { color: c.onVariant }]}>초기화</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {enabledSlots.length > 0 ? (
        <View style={[styles.slotStatusWrap, { borderColor: c.outline }]}>
          {enabledSlots.map((slot, index) => {
            const isDone = index < draft.takenCount;
            const isCurrent = index === draft.takenCount;
            const statusLabel = isDone ? '완료' : isCurrent ? '다음' : '예정';
            return (
              <View
                key={slot.key}
                style={[
                  styles.slotStatusRow,
                  { borderBottomColor: c.outlineVariant },
                  isCurrent && { backgroundColor: 'rgba(0,0,0,0.04)' },
                ]}>
                <View style={styles.slotStatusLeft}>
                  <IconSymbol name={slot.icon} size={16} color={isDone ? PRIMARY : c.onVariant} />
                  <Text style={[styles.slotStatusLabel, { color: c.onSurface }]}>{slot.label}</Text>
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

      <View style={[styles.metricBar, { borderTopColor: '#000', borderBottomColor: c.outline }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>{draft.takenCount}</Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>완료</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>{draft.dosesPerDay}</Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>{copy.doseCountLabel}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>
            {Math.max(0, draft.dosesPerDay - draft.takenCount)}
          </Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>남음</Text>
        </View>
      </View>

      <View style={[styles.routineWindowBand, { borderColor: c.outline, backgroundColor: '#f4f4f5' }]}>
        <Text style={[styles.routineWindowLabel, { color: c.onVariant }]}>오늘 담기 구간(시작~마무리)</Text>
        <Text style={[styles.routineWindowTime, { color: c.onSurface }]}>{routineWindowLine}</Text>
      </View>

      <View style={[styles.rowsWrap, { borderTopColor: '#000' }]}>
        <View style={[styles.row, { borderBottomColor: c.outline }]}>
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

        <View style={[styles.row, styles.slotRowWrap, { borderBottomColor: c.outline }]}>
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
                    accessibilityLabel={copy.slotToggleA11y(slot.label, on)}
                    android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
                    onPress={() => setDraft((prev) => setSlot(prev, slot.key, !slotOn(prev, slot.key)))}
                    style={({ pressed }) => [
                      styles.slotChip,
                      { flex: 1, backgroundColor: bg, borderColor: borderCol },
                      pressed && { opacity: 0.88 },
                    ]}>
                    <Text style={[styles.slotChipText, { color: fg }]}>{slot.label}</Text>
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
            <View key={slot.key} style={[styles.slotDetailBlock, { borderBottomColor: c.outline }]}>
              <View style={styles.medicineTimePickerRow}>
                <SnappedTimePickerField
                  label={copy.slotTimeLabel(slot.label)}
                  hint={`담기 구간 ${routineWindowLine} 안에서만 선택돼요`}
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
                />
              </View>
              <View style={[styles.row, styles.rowInSlotGroup, styles.slotNotifyRow]}>
                <Text style={[styles.rowSubTitle, { color: c.onVariant }]}>{copy.slotNotifyLabel(slot.label)}</Text>
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
    minHeight: 52,
    paddingVertical: 6,
  },
  rowSubTitle: { fontSize: 14, fontWeight: '600' },
  slotRowWrap: {
    flexDirection: 'column',
    alignItems: 'stretch',
    minHeight: 0,
    paddingVertical: 12,
  },
  slotColumn: { gap: 8, width: '100%' },
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
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowInput: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'right', minHeight: 32, maxWidth: '70%' },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    marginTop: 4,
    alignSelf: 'stretch',
  },
  slotChip: {
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  slotChipText: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  medicineTimePickerRow: {
    paddingVertical: 4,
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
});
