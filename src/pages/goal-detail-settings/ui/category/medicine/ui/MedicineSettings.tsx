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
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

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
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const c = useMemo(() => goalDetailSettingsPalette(isDark), [isDark]);
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

  return (
    <View style={styles.shell}>
      <View style={[styles.metricBar, { borderTopColor: '#000', borderBottomColor: c.outline }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>{draft.dosesPerDay}</Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>복용 횟수</Text>
        </View>
      </View>

      <View style={[styles.routineWindowBand, { borderColor: c.outline, backgroundColor: '#f4f4f5' }]}>
        <Text style={[styles.routineWindowLabel, { color: c.onVariant }]}>오늘 담기 구간(시작~마무리)</Text>
        <Text style={[styles.routineWindowTime, { color: c.onSurface }]}>{routineWindowLine}</Text>
      </View>

      <View style={[styles.rowsWrap, { borderTopColor: '#000' }]}>
        <View style={[styles.row, { borderBottomColor: c.outline }]}>
          <View style={styles.rowLeft}>
            <IconSymbol name="cross.case.fill" size={18} color={PRIMARY} />
            <Text style={[styles.rowTitle, { color: c.onSurface }]}>약 이름</Text>
          </View>
          <TextInput
            value={draft.doseLabel}
            onChangeText={(t) => setDraft((prev) => ({ ...prev, doseLabel: t }))}
            placeholder="먹는 약 이름을 적어 주세요"
            placeholderTextColor={c.outline}
            style={[styles.rowInput, { color: c.onSurface }]}
          />
        </View>

        <View style={[styles.row, styles.slotRowWrap, { borderBottomColor: c.outline }]}>
          <View style={styles.slotColumn}>
            <Text style={[styles.rowTitle, { color: c.onSurface }]}>복용 슬롯</Text>
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
                    accessibilityLabel={`${slot.label} 복용 ${on ? '켜짐' : '꺼짐'}`}
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
              <View style={[styles.row, styles.rowInSlotGroup]}>
                <Text style={[styles.rowTitle, { color: c.onSurface }]}>{slot.cardSub}</Text>
                <View style={styles.inlineInputWrap}>
                  <TextInput
                    value={timeField(draft, slot.key)}
                    onChangeText={(t) => setDraft((prev) => withTime(prev, slot.key, t))}
                    onBlur={() =>
                      setDraft((prev) => {
                        const normalized = withTime(prev, slot.key, timeField(prev, slot.key));
                        const cur = timeField(normalized, slot.key);
                        return withTime(
                          normalized,
                          slot.key,
                          clampHhmmToPriorityWindow(cur, priorityStart, priorityEnd, 1),
                        );
                      })
                    }
                    keyboardType="numbers-and-punctuation"
                    placeholder="08:30"
                    placeholderTextColor={c.outline}
                    style={[styles.inlineInput, { color: c.onSurface }]}
                  />
                </View>
              </View>
              <View style={[styles.row, styles.rowInSlotGroup, styles.slotNotifyRow]}>
                <Text style={[styles.rowSubTitle, { color: c.onVariant }]}>{slot.cardSub} 알림</Text>
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
  routineWindowBand: {
    borderRadius: 12,
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
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  slotChipText: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  inlineInputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  inlineInput: { minWidth: 72, fontSize: 18, fontWeight: '700', textAlign: 'right', padding: 0 },
});
