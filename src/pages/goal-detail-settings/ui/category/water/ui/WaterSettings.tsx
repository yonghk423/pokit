import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import {
  buildWaterRoutineReminderSlots,
  clampHhmmToPriorityWindow,
  formatHhmmClockKo,
  formatMinuteOfDayKo,
  MAX_WATER_QUICK_ADD_PRESETS,
  MAX_WATER_REMINDER_TIMES,
  parseHHmmToMinutes,
  useDayPlanDraftStore,
  waterReminderIntervalMinutes,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { paletteForReminderTimeCard, SnappedTimePickerField } from '@widgets/daily-rhythm-time-field';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { SettingsProgressBand } from '../../lib/SettingsProgressBand';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';

import { WATER_GOAL_DETAIL_THEME as T } from '../lib/waterGoalDetailTheme';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import {
  getInitialWaterDataConfig,
  normalizeWaterDetailConfig,
  type WaterDetailDataConfig,
  type WaterReminderPreset,
} from './waterConfig';

const MAX_TIME_SLOTS = MAX_WATER_REMINDER_TIMES;

function parseGoalLitersToMl(text: string): number {
  const t = text.replace(',', '.').trim();
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return 2000;
  return Math.max(100, Math.min(10000, Math.round(n * 1000)));
}

function sanitizeGoalLitersInput(text: string): string {
  return text.replace(',', '.').replace(/[^0-9.]/g, '');
}

function parseQuickAddPresetMl(text: string): number | null {
  const ml = Math.round(Number(text.replace(/[^0-9]/g, '')));
  if (!Number.isFinite(ml)) return null;
  if (ml < 50 || ml > 2000) return null;
  return ml;
}

function seedWater(raw: unknown) {
  return normalizeWaterDetailConfig(raw ?? getInitialWaterDataConfig());
}

function clampWaterTimes(times: string[], routineStart: string, routineEnd: string): string[] {
  return times.map((t) => clampHhmmToPriorityWindow(t, routineStart, routineEnd, 1));
}

export function WaterSettings({
  rhythmTitle,
  categoryKey = 'water',
  dataConfig,
  onChangeDataConfig,
  allowRename = true,
  renameLockedReason = null,
  embedded = false,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
  embedded?: boolean;
}) {
  const scheme = useColorScheme();
  const palette = useMemo(() => {
    const base = goalDetailSettingsPalette(scheme === 'dark');
    const pageBg = T.screenBg;
    return {
      ...base,
      surfaceLow: pageBg,
      surfaceLowest: pageBg,
    };
  }, [scheme]);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  const timeFieldPalette = useMemo(() => paletteForReminderTimeCard(false).timeField, []);

  const normalizedKey = useMemo(
    () => JSON.stringify(normalizeWaterDetailConfig(dataConfig ?? getInitialWaterDataConfig())),
    [dataConfig],
  );

  const [goalMl, setGoalMl] = useState(() => seedWater(dataConfig).goalMl);
  const [drankMl, setDrankMl] = useState(() => seedWater(dataConfig).drankMl);
  const [goalLStr, setGoalLStr] = useState(() => (seedWater(dataConfig).goalMl / 1000).toFixed(1));
  const [quickAddPresetsMl, setQuickAddPresetsMl] = useState<number[]>(
    () => seedWater(dataConfig).quickAddPresetsMl,
  );
  const [showAddPresetInput, setShowAddPresetInput] = useState(false);
  const [addPresetDraft, setAddPresetDraft] = useState('');
  const [reminderPreset, setReminderPreset] = useState<WaterReminderPreset>(
    () => seedWater(dataConfig).reminderPreset,
  );
  const [reminderCustomMin, setReminderCustomMin] = useState(() =>
    String(seedWater(dataConfig).reminderCustomMin),
  );
  const [smartNotification, setSmartNotification] = useState(() => seedWater(dataConfig).smartNotification);
  const [reminderTimes, setReminderTimes] = useState<string[]>(() => seedWater(dataConfig).reminderTimes);
  const [summary, setSummary] = useState(() => seedWater(dataConfig).summary);
  const [displayName, setDisplayName] = useState(() => seedWater(dataConfig).displayName);
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);

  const lastRef = useRef<string | null>(null);
  const hydratedKey = useRef<string | null>(null);

  useEffect(() => {
    useDayPlanDraftStore.getState().hydrate();
  }, []);

  const { priorityStart, priorityEnd } = useDayPlanDraftStore(
    useShallow((s) => ({ priorityStart: s.priorityStart, priorityEnd: s.priorityEnd })),
  );

  const routineWindowLine = useMemo(
    () => `${formatHhmmClockKo(priorityStart)} – ${formatHhmmClockKo(priorityEnd)}`,
    [priorityEnd, priorityStart],
  );

  useEffect(() => {
    if (hydratedKey.current === normalizedKey) return;
    hydratedKey.current = normalizedKey;
    const next = normalizeWaterDetailConfig(dataConfig ?? getInitialWaterDataConfig());
    setGoalMl(next.goalMl);
    setDrankMl(next.drankMl);
    setGoalLStr((next.goalMl / 1000).toFixed(1));
    setQuickAddPresetsMl(next.quickAddPresetsMl);
    setShowAddPresetInput(false);
    setAddPresetDraft('');
    setReminderPreset(next.reminderPreset);
    setReminderCustomMin(String(next.reminderCustomMin));
    setSmartNotification(next.smartNotification);
    setReminderTimes(clampWaterTimes(next.reminderTimes, priorityStart, priorityEnd));
    setSummary(next.summary);
    setDisplayName(next.displayName);
    setOpenSlotIndex(null);
  }, [dataConfig, normalizedKey, priorityEnd, priorityStart]);

  const customMinNum = Math.max(
    15,
    Math.min(24 * 60, parseInt(reminderCustomMin, 10) || 90),
  );

  useEffect(() => {
    const payload: WaterDetailDataConfig = normalizeWaterDetailConfig({
      goalMl,
      drankMl: Math.min(drankMl, goalMl),
      quickAddPresetsMl,
      reminderPreset,
      reminderCustomMin: customMinNum,
      smartNotification,
      reminderTimes: clampWaterTimes(reminderTimes, priorityStart, priorityEnd),
      summary,
      displayName,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [
    goalMl,
    drankMl,
    quickAddPresetsMl,
    reminderPreset,
    customMinNum,
    smartNotification,
    reminderTimes,
    summary,
    displayName,
    priorityEnd,
    priorityStart,
    onChangeDataConfig,
  ]);

  const onPickPresetMl = (ml: number) => {
    setGoalMl(ml);
    setGoalLStr((ml / 1000).toFixed(1));
  };

  const addDrankMl = (delta: number) => {
    setDrankMl((prev) => Math.min(goalMl, prev + delta));
  };

  const waterProgressRatio = goalMl > 0 ? Math.min(1, drankMl / goalMl) : 0;
  const waterRemainingMl = Math.max(0, goalMl - drankMl);

  const onChangeGoalL = (text: string) => {
    const cleaned = sanitizeGoalLitersInput(text);
    setGoalLStr(cleaned);
    const n = parseFloat(cleaned);
    if (!Number.isFinite(n) || cleaned === '' || cleaned === '.') return;
    const nextMl = Math.max(100, Math.min(10000, Math.round(n * 1000)));
    setGoalMl(nextMl);
  };

  const onBlurGoalL = () => {
    const next = parseGoalLitersToMl(goalLStr);
    setGoalMl(next);
    setGoalLStr((next / 1000).toFixed(1));
  };

  const confirmAddQuickPreset = () => {
    const ml = parseQuickAddPresetMl(addPresetDraft);
    if (ml === null) {
      Alert.alert('빠른 추가', '50ml ~ 2000ml 사이 숫자를 입력해 주세요.');
      return;
    }
    if (quickAddPresetsMl.includes(ml)) {
      Alert.alert('빠른 추가', '이미 같은 용량이 있어요.');
      return;
    }
    if (quickAddPresetsMl.length >= MAX_WATER_QUICK_ADD_PRESETS) {
      Alert.alert('빠른 추가', `최대 ${MAX_WATER_QUICK_ADD_PRESETS}개까지 추가할 수 있어요.`);
      return;
    }
    setQuickAddPresetsMl((prev) => [...prev, ml].sort((a, b) => a - b));
    setAddPresetDraft('');
    setShowAddPresetInput(false);
  };

  const updateTimeAt = useCallback(
    (index: number, hhmm: string) => {
      setReminderTimes((prev) => {
        const next = [...prev];
        next[index] = clampHhmmToPriorityWindow(hhmm, priorityStart, priorityEnd, 1);
        return next;
      });
    },
    [priorityEnd, priorityStart],
  );

  const addTimeSlot = useCallback(() => {
    if (reminderTimes.length >= MAX_TIME_SLOTS) return;
    const seed =
      reminderTimes.length > 0
        ? reminderTimes[reminderTimes.length - 1]!
        : clampHhmmToPriorityWindow('09:00', priorityStart, priorityEnd, 1);
    setReminderTimes((prev) => [...prev, seed]);
    setOpenSlotIndex(reminderTimes.length);
  }, [priorityEnd, priorityStart, reminderTimes]);

  const removeTimeAt = useCallback((index: number) => {
    setReminderTimes((prev) => prev.filter((_, i) => i !== index));
    setOpenSlotIndex(null);
  }, []);

  const fillTimesFromInterval = useCallback(() => {
    const interval = waterReminderIntervalMinutes({
      reminderPreset,
      reminderCustomMin: customMinNum,
    });
    const slots = buildWaterRoutineReminderSlots({
      routineStartHhmm: priorityStart,
      routineEndHhmm: priorityEnd,
      intervalMinutes: interval,
    });
    const filled = slots.map((s) =>
      clampHhmmToPriorityWindow(
        `${String(Math.floor(s.wallMinuteOfDay / 60)).padStart(2, '0')}:${String(s.wallMinuteOfDay % 60).padStart(2, '0')}`,
        priorityStart,
        priorityEnd,
        1,
      ),
    );
    if (filled.length === 0) {
      Alert.alert('알림', '이 구간과 주기로 채울 시각이 없어요.');
      return;
    }
    const label =
      reminderPreset === '60'
        ? '매 1시간'
        : reminderPreset === '120'
          ? '매 2시간'
          : `${customMinNum}분`;
    Alert.alert(
      '시각 일괄 채우기',
      `담기 구간에 ${label} 간격으로 ${filled.length}개 시각을 넣을까요? 지금 추가해 둔 시각은 대체돼요.`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '채우기',
          onPress: () => setReminderTimes(filled.slice(0, MAX_TIME_SLOTS)),
        },
      ],
    );
  }, [customMinNum, priorityEnd, priorityStart, reminderPreset]);

  const reminderRows: { key: WaterReminderPreset; label: string }[] = [
    { key: '60', label: '매 1시간' },
    { key: '120', label: '매 2시간' },
    { key: 'custom', label: '직접(분)' },
  ];

  return (
    <View style={[styles.shell, embedded && styles.shellEmbedded]}>
      {!embedded ? (
        <>
          <RoutineTitleField
            value={displayName}
            onChangeValue={setDisplayName}
            fallback={titleFallback}
            allowRename={allowRename}
            renameLockedReason={renameLockedReason}
            palette={palette}
          />

          <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={palette} />
        </>
      ) : null}

      <SettingsProgressBand
        title="오늘 섭취"
        valueLine={`${drankMl}ml / ${goalMl}ml`}
        subLine={
          waterRemainingMl > 0
            ? `목표까지 ${waterRemainingMl}ml · ${Math.round(waterProgressRatio * 100)}%`
            : '오늘 목표를 달성했어요'
        }
        ratio={waterProgressRatio}
        palette={palette}
        accent={T.primary}
      />

      <View style={styles.intakeQuickRow}>
        <Text style={styles.intakeQuickLabel}>빠른 추가</Text>
        <View style={styles.presetRow}>
          {quickAddPresetsMl.map((ml) => (
            <Pressable
              key={ml}
              accessibilityRole="button"
              accessibilityLabel={`${ml}ml 추가`}
              onPress={() => addDrankMl(ml)}
              style={({ pressed }) => [styles.intakeChip, pressed && { opacity: 0.75 }]}>
              <Text style={styles.intakeChipText}>+{ml}ml</Text>
            </Pressable>
          ))}
          {quickAddPresetsMl.length < MAX_WATER_QUICK_ADD_PRESETS ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="빠른 추가 용량 추가"
              onPress={() => setShowAddPresetInput(true)}
              style={({ pressed }) => [styles.intakeAddChip, pressed && { opacity: 0.75 }]}>
              <Text style={styles.intakeAddChipText}>+</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="오늘 섭취량 초기화"
            onPress={() => setDrankMl(0)}
            style={({ pressed }) => [styles.intakeResetChip, pressed && { opacity: 0.75 }]}>
            <Text style={styles.intakeResetText}>초기화</Text>
          </Pressable>
        </View>
        {showAddPresetInput ? (
          <View style={styles.addPresetRow}>
            <TextInput
              value={addPresetDraft}
              onChangeText={(text) => setAddPresetDraft(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="ml"
              placeholderTextColor={T.placeholder}
              style={styles.addPresetInput}
              autoFocus
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="빠른 추가 용량 저장"
              onPress={confirmAddQuickPreset}
              style={({ pressed }) => [styles.addPresetConfirmBtn, pressed && { opacity: 0.75 }]}>
              <Text style={styles.addPresetConfirmText}>추가</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="빠른 추가 용량 추가 취소"
              onPress={() => {
                setShowAddPresetInput(false);
                setAddPresetDraft('');
              }}
              style={({ pressed }) => [styles.addPresetCancelBtn, pressed && { opacity: 0.75 }]}>
              <Text style={styles.addPresetCancelText}>취소</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.metricBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{(goalMl / 1000).toFixed(1)}</Text>
          <Text style={styles.metricLabel}>목표(L)</Text>
        </View>
      </View>

      <View style={styles.rowsWrap}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowTitle}>하루 목표</Text>
          </View>
          <View style={styles.inlineInputWrap}>
            <TextInput
              value={goalLStr}
              onChangeText={onChangeGoalL}
              onBlur={onBlurGoalL}
              keyboardType="decimal-pad"
              placeholder="2.0"
              placeholderTextColor={T.placeholder}
              style={styles.inlineInput}
            />
            <Text style={styles.inlineSuffix}>L</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowTitle}>빠른 선택</Text>
          <View style={styles.presetRow}>
            {[
              { ml: 1500, label: '1.5' },
              { ml: 2000, label: '2.0' },
              { ml: 2500, label: '2.5' },
            ].map((p) => {
              const active = goalMl === p.ml;
              return (
                <Pressable
                  key={p.ml}
                  onPress={() => onPickPresetMl(p.ml)}
                  style={[styles.presetChip, active && styles.presetChipOn]}>
                  <Text style={[styles.presetChipText, active && styles.presetChipTextOn]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowTitle}>스마트 알림</Text>
          <Switch
            value={smartNotification}
            onValueChange={setSmartNotification}
            trackColor={{ false: T.surfaceContainerHighest, true: T.primary }}
            thumbColor="#fff"
            ios_backgroundColor={T.surfaceContainerHighest}
          />
        </View>

        {smartNotification ? (
          <>
            <View style={styles.routineWindowBand}>
              <Text style={styles.routineWindowLabel}>오늘 담기 구간(시작~마무리)</Text>
              <Text style={styles.routineWindowTime}>{routineWindowLine}</Text>
            </View>

            <View style={styles.timesSection}>
              <Text style={styles.timesSectionTitle}>알림 시각</Text>
              <Text style={styles.timesSectionHint}>
                원하는 시각만 직접 추가해요. 아래 「시각 일괄 채우기」는 선택 사항이에요.
              </Text>

              {reminderTimes.length === 0 ? (
                <Text style={styles.timesEmpty}>아직 알림 시각이 없어요. 시각을 추가해 주세요.</Text>
              ) : (
                reminderTimes.map((hhmm, index) => (
                  <View key={`water-time-${index}`} style={styles.slotRow}>
                    <View style={styles.slotField}>
                      <SnappedTimePickerField
                        label={index === 0 ? '알림 시각' : `추가 시각 ${index + 1}`}
                        hint="담기 구간 안에서만 선택돼요"
                        valueHhmm={hhmm}
                        onChangeHhmm={(next) => updateTimeAt(index, next)}
                        expanded={openSlotIndex === index}
                        onToggleExpand={() =>
                          setOpenSlotIndex((j) => (j === index ? null : index))
                        }
                        isDark={false}
                        palette={timeFieldPalette}
                        routineDayStartHhmm={priorityStart}
                        routineDayEndHhmm={priorityEnd}
                        snapStepMinutes={1}
                      />
                    </View>
                    {reminderTimes.length > 1 ? (
                      <Pressable
                        onPress={() => removeTimeAt(index)}
                        accessibilityRole="button"
                        accessibilityLabel={`${index + 1}번 시각 삭제`}
                        hitSlop={8}
                        style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.65 }]}>
                        <Text style={styles.removeBtnText}>삭제</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))
              )}

              {reminderTimes.length < MAX_TIME_SLOTS ? (
                <Pressable
                  onPress={addTimeSlot}
                  accessibilityRole="button"
                  accessibilityLabel="알림 시각 추가"
                  style={({ pressed }) => [styles.addLink, pressed && { opacity: 0.75 }]}>
                  <Text style={styles.addLinkText}>+ 시각 추가</Text>
                </Pressable>
              ) : null}

              {reminderTimes.length > 0 ? (
                <Text style={styles.timesSummary}>
                  {reminderTimes
                    .map((t) => {
                      const m = parseHHmmToMinutes(t);
                      return m === null ? t : formatMinuteOfDayKo(m);
                    })
                    .join(', ')}
                </Text>
              ) : null}
            </View>

            <View style={styles.bulkFillBlock}>
              <Text style={styles.bulkFillTitle}>시각 일괄 채우기 (선택)</Text>
              <View style={styles.reminderList}>
                {reminderRows.map((row) => {
                  const selected = reminderPreset === row.key;
                  return (
                    <Pressable
                      key={row.key}
                      onPress={() => setReminderPreset(row.key)}
                      style={styles.reminderBtn}>
                      <Text style={[styles.reminderBtnText, selected && styles.reminderBtnTextOn]}>
                        {row.label}
                      </Text>
                      {selected ? (
                        <IconSymbol name="checkmark.circle.fill" size={20} color={T.primary} />
                      ) : (
                        <View style={styles.radioOuter} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
              {reminderPreset === 'custom' ? (
                <View style={styles.customRow}>
                  <Text style={styles.customRowLabel}>간격(분)</Text>
                  <TextInput
                    value={reminderCustomMin}
                    onChangeText={(t) => setReminderCustomMin(t.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    style={styles.customInput}
                  />
                </View>
              ) : null}
              <Pressable
                onPress={fillTimesFromInterval}
                accessibilityRole="button"
                accessibilityLabel="담기 구간에 주기로 시각 일괄 채우기"
                style={({ pressed }) => [styles.bulkFillBtn, pressed && { opacity: 0.88 }]}>
                <Text style={styles.bulkFillBtnText}>담기 구간에 맞춰 시각 채우기</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.smartOffHint}>
            스마트 알림을 켜면 알림 시각을 직접 추가할 수 있어요.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 4,
    backgroundColor: 'transparent',
    gap: 12,
  },
  shellEmbedded: {
    marginHorizontal: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    backgroundColor: 'transparent',
    gap: 12,
  },
  listHeader: { gap: 6, paddingTop: 2 },
  mainTitle: { color: T.onSurface, fontSize: 42, lineHeight: 46, fontWeight: '700', letterSpacing: -1.2 },
  intakeQuickRow: { gap: 8 },
  intakeQuickLabel: { color: T.onSurface, fontSize: 15, fontWeight: '700' },
  intakeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: T.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.25)',
  },
  intakeChipText: { fontSize: 13, fontWeight: '800', color: T.primary },
  intakeAddChip: {
    minWidth: 36,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: T.surfaceContainerHigh,
    borderWidth: 2,
    borderColor: T.outline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  intakeAddChipText: { fontSize: 16, fontWeight: '900', color: T.onSurface },
  addPresetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addPresetInput: {
    width: 88,
    borderWidth: 2,
    borderColor: T.glassPreviewBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
    color: T.onSurface,
    backgroundColor: T.surfaceContainerHigh,
  },
  addPresetConfirmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: T.primarySoft,
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.35)',
  },
  addPresetConfirmText: { fontSize: 13, fontWeight: '800', color: T.primary },
  addPresetCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  addPresetCancelText: { fontSize: 13, fontWeight: '700', color: T.onSurfaceVariant },
  intakeResetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: T.surfaceContainerHigh,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.outline,
  },
  intakeResetText: { fontSize: 13, fontWeight: '700', color: T.onSurfaceVariant },
  metricBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.outline,
    paddingVertical: 10,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { color: T.onSurface, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  metricLabel: { color: T.onSurfaceVariant, fontSize: 11, fontWeight: '600' },
  rowsWrap: { borderTopWidth: 1, borderTopColor: '#000' },
  row: {
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.outline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { color: T.onSurface, fontSize: 16, fontWeight: '600' },
  inlineInputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  inlineInput: { minWidth: 62, fontSize: 18, fontWeight: '700', textAlign: 'right', padding: 0, color: T.onSurface },
  inlineSuffix: { color: T.onSurfaceVariant, fontSize: 13, fontWeight: '600' },
  presetRow: { flexDirection: 'row', gap: 6 },
  presetChip: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 0,
    backgroundColor: T.surfaceContainerHigh,
    alignItems: 'center',
  },
  presetChipOn: {
    backgroundColor: T.primarySoft,
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.35)',
  },
  presetChipText: { fontSize: 12, fontWeight: '700', color: T.onSurfaceVariant },
  presetChipTextOn: { color: T.primary, fontWeight: '900' },
  smartOffHint: {
    color: T.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.outline,
  },
  routineWindowBand: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.outline,
    paddingVertical: 12,
    gap: 4,
    backgroundColor: '#f4f4f5',
    marginHorizontal: -2,
    paddingHorizontal: 10,
    borderRadius: 0,
  },
  routineWindowLabel: { color: T.onSurfaceVariant, fontSize: 11, fontWeight: '600' },
  routineWindowTime: { color: T.onSurface, fontSize: 15, fontWeight: '700' },
  timesSection: {
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.outline,
  },
  timesSectionTitle: { color: T.onSurface, fontSize: 16, fontWeight: '700' },
  timesSectionHint: { color: T.onSurfaceVariant, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  timesEmpty: { color: T.onSurfaceVariant, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  slotRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  slotField: { flex: 1 },
  removeBtn: { paddingTop: 14, paddingHorizontal: 4 },
  removeBtnText: { fontSize: 13, fontWeight: '700', color: T.onSurfaceVariant },
  addLink: { paddingVertical: 6 },
  addLinkText: { fontSize: 14, fontWeight: '700', color: T.primary },
  timesSummary: { color: T.onSurfaceVariant, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  bulkFillBlock: {
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.outline,
  },
  bulkFillTitle: { color: T.onSurfaceVariant, fontSize: 13, fontWeight: '700' },
  reminderList: { gap: 6 },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  reminderBtnText: { fontSize: 14, fontWeight: '700', color: T.onSurfaceVariant },
  reminderBtnTextOn: { color: T.onSurface },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: T.onSurfaceVariant },
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  customRowLabel: { color: T.onSurface, fontSize: 14, fontWeight: '600' },
  customInput: {
    minWidth: 80,
    borderWidth: 2,
    borderColor: T.glassPreviewBorder,
    borderRadius: 0,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    color: T.onSurface,
    backgroundColor: T.surfaceContainerHigh,
  },
  bulkFillBtn: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 0,
    backgroundColor: T.surfaceContainerHigh,
    alignItems: 'center',
  },
  bulkFillBtnText: { color: T.onSurface, fontSize: 14, fontWeight: '700' },
});
