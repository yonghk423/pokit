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
import { useTranslation } from '@shared/lib/i18n';
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

function waterStructuralConfigKey(raw: unknown): string {
  const { displayName: _displayName, summary: _summary, ...structural } = seedWater(raw);
  return JSON.stringify(structural);
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
  hideTitleField = false,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
  embedded?: boolean;
  hideTitleField?: boolean;
}) {
  const { t } = useTranslation();

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

  const structuralKey = useMemo(() => waterStructuralConfigKey(dataConfig), [dataConfig]);

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
  const hydratedStructuralKey = useRef<string | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftPayloadRef = useRef<WaterDetailDataConfig | null>(null);

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
    if (hydratedStructuralKey.current === structuralKey) return;
    hydratedStructuralKey.current = structuralKey;
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
  }, [dataConfig, structuralKey, priorityEnd, priorityStart]);

  const buildDraftPayload = useCallback((): WaterDetailDataConfig => {
    const customMin = Math.max(
      15,
      Math.min(24 * 60, parseInt(reminderCustomMin, 10) || 90),
    );
    return normalizeWaterDetailConfig({
      goalMl,
      drankMl: Math.min(drankMl, goalMl),
      quickAddPresetsMl,
      reminderPreset,
      reminderCustomMin: customMin,
      smartNotification,
      reminderTimes: clampWaterTimes(reminderTimes, priorityStart, priorityEnd),
      summary,
      displayName,
    });
  }, [
    displayName,
    drankMl,
    goalMl,
    priorityEnd,
    priorityStart,
    quickAddPresetsMl,
    reminderCustomMin,
    reminderPreset,
    reminderTimes,
    smartNotification,
    summary,
  ]);

  draftPayloadRef.current = buildDraftPayload();

  const persistCatalogAppearanceNow = useCallback(
    (cosmetic: Partial<Pick<WaterDetailDataConfig, 'displayName' | 'summary'>>) => {
      const payload = normalizeWaterDetailConfig({
        ...(draftPayloadRef.current ?? buildDraftPayload()),
        ...cosmetic,
      });
      const serialized = JSON.stringify(payload);
      if (lastRef.current === serialized) return;
      lastRef.current = serialized;
      draftPayloadRef.current = payload;
      onChangeDataConfig(payload);
    },
    [buildDraftPayload, onChangeDataConfig],
  );

  useEffect(() => {
    const payload = buildDraftPayload();
    const serialized = JSON.stringify(payload);
    if (lastRef.current === serialized) return;

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      const latest = JSON.stringify(draftPayloadRef.current);
      if (lastRef.current === latest) return;
      lastRef.current = latest;
      onChangeDataConfig(draftPayloadRef.current);
    }, 450);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [buildDraftPayload, onChangeDataConfig]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      const payload = draftPayloadRef.current;
      if (!payload) return;
      const serialized = JSON.stringify(payload);
      if (lastRef.current === serialized) return;
      lastRef.current = serialized;
      onChangeDataConfig(payload);
    };
  }, [onChangeDataConfig]);

  const customMinNum = Math.max(
    15,
    Math.min(24 * 60, parseInt(reminderCustomMin, 10) || 90),
  );

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
      Alert.alert(t('goalDetail.water.quickAddTitle'), t('goalDetail.water.quickAddRange'));
      return;
    }
    if (quickAddPresetsMl.includes(ml)) {
      Alert.alert(t('goalDetail.water.quickAddTitle'), t('goalDetail.water.quickAddDuplicate'));
      return;
    }
    if (quickAddPresetsMl.length >= MAX_WATER_QUICK_ADD_PRESETS) {
      Alert.alert(t('goalDetail.water.quickAddTitle'), t('goalDetail.water.quickAddMax', { max: MAX_WATER_QUICK_ADD_PRESETS }));
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
      Alert.alert(t('alert.permission.title'), t('goalDetail.water.noFillTimes'));
      return;
    }
    const label =
      reminderPreset === '60'
        ? t('goalDetail.water.intervalHour1')
        : reminderPreset === '120'
          ? t('goalDetail.water.intervalHour2')
          : t('goalDetail.water.intervalMinutes', { min: customMinNum });
    Alert.alert(
      t('goalDetail.water.bulkFillTitle'),
      t('goalDetail.water.bulkFillMessage', { label, count: filled.length }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('goalDetail.water.bulkFillConfirm'),
          onPress: () => setReminderTimes(filled.slice(0, MAX_TIME_SLOTS)),
        },
      ],
    );
  }, [customMinNum, priorityEnd, priorityStart, reminderPreset, t]);

  const reminderRows = useMemo(
    (): { key: WaterReminderPreset; label: string }[] => [
      { key: '60', label: t('goalDetail.water.intervalHour1') },
      { key: '120', label: t('goalDetail.water.intervalHour2') },
      { key: 'custom', label: t('goalDetail.water.intervalCustom') },
    ],
    [t],
  );

  return (
    <View style={[styles.shell, embedded && styles.shellEmbedded]}>
      {!embedded && !hideTitleField ? (
        <>
          <RoutineTitleField
            value={displayName}
            onChangeValue={(next) => {
              setDisplayName(next);
              persistCatalogAppearanceNow({ displayName: next });
            }}
            fallback={titleFallback}
            allowRename={allowRename}
            renameLockedReason={renameLockedReason}
            palette={palette}
          />

          <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={palette} />
        </>
      ) : null}

      <SettingsProgressBand
        title={t('goalDetail.water.todayIntake')}
        valueLine={`${drankMl}ml / ${goalMl}ml`}
        subLine={
          waterRemainingMl > 0
            ? t('goalDetail.water.remainingGoal', { ml: waterRemainingMl, percent: Math.round(waterProgressRatio * 100) })
            : t('goalDetail.water.goalReached')
        }
        ratio={waterProgressRatio}
        palette={palette}
        accent={T.primary}
      />

      <View style={styles.intakeQuickRow}>
        <Text style={styles.intakeQuickLabel}>{t('goalDetail.water.quickAddLabel')}</Text>
        <View style={styles.presetRow}>
          {quickAddPresetsMl.map((ml) => (
            <Pressable
              key={ml}
              accessibilityRole="button"
              accessibilityLabel={t('goalDetail.water.addMlA11y', { ml })}
              onPress={() => addDrankMl(ml)}
              style={({ pressed }) => [styles.intakeChip, pressed && { opacity: 0.75 }]}>
              <Text style={styles.intakeChipText}>+{ml}ml</Text>
            </Pressable>
          ))}
          {quickAddPresetsMl.length < MAX_WATER_QUICK_ADD_PRESETS ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('goalDetail.water.addPresetA11y')}
              onPress={() => setShowAddPresetInput(true)}
              style={({ pressed }) => [styles.intakeAddChip, pressed && { opacity: 0.75 }]}>
              <Text style={styles.intakeAddChipText}>+</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('goalDetail.water.resetIntakeA11y')}
            onPress={() => setDrankMl(0)}
            style={({ pressed }) => [styles.intakeResetChip, pressed && { opacity: 0.75 }]}>
            <Text style={styles.intakeResetText}>{t('common.reset')}</Text>
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
              accessibilityLabel={t('goalDetail.water.savePresetA11y')}
              onPress={confirmAddQuickPreset}
              style={({ pressed }) => [styles.addPresetConfirmBtn, pressed && { opacity: 0.75 }]}>
              <Text style={styles.addPresetConfirmText}>{t('goalDetail.add')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('goalDetail.water.cancelPresetA11y')}
              onPress={() => {
                setShowAddPresetInput(false);
                setAddPresetDraft('');
              }}
              style={({ pressed }) => [styles.addPresetCancelBtn, pressed && { opacity: 0.75 }]}>
              <Text style={styles.addPresetCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.metricBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{(goalMl / 1000).toFixed(1)}</Text>
          <Text style={styles.metricLabel}>{t('goalDetail.water.goalLiters')}</Text>
        </View>
      </View>

      <View style={styles.rowsWrap}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.rowTitle}>{t('goalDetail.water.dailyGoal')}</Text>
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
          <Text style={styles.rowTitle}>{t('goalDetail.water.quickSelect')}</Text>
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
          <Text style={styles.rowTitle}>{t('goalDetail.water.smartNotify')}</Text>
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
              <Text style={styles.routineWindowLabel}>{t('goalDetail.water.routineWindow')}</Text>
              <Text style={styles.routineWindowTime}>{routineWindowLine}</Text>
            </View>

            <View style={styles.timesSection}>
              <Text style={styles.timesSectionTitle}>{t('goalDetail.water.notifyTimes')}</Text>
              <Text style={styles.timesSectionHint}>
                {t('goalDetail.water.notifyTimesHint')}
              </Text>

              {reminderTimes.length === 0 ? (
                <Text style={styles.timesEmpty}>{t('goalDetail.water.noNotifyTimes')}</Text>
              ) : (
                reminderTimes.map((hhmm, index) => (
                  <View key={`water-time-${index}`} style={styles.slotRow}>
                    <View style={styles.slotField}>
                      <SnappedTimePickerField
                        label={index === 0 ? t('goalDetail.water.notifyTimeLabel') : t('goalDetail.water.extraTimeLabel', { index: index + 1 })}
                        hint={t('goalDetail.water.timeWithinWindow')}
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
                        accessibilityLabel={t('goalDetail.water.removeTimeA11y', { index: index + 1 })}
                        hitSlop={8}
                        style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.65 }]}>
                        <Text style={styles.removeBtnText}>{t('common.delete')}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))
              )}

              {reminderTimes.length < MAX_TIME_SLOTS ? (
                <Pressable
                  onPress={addTimeSlot}
                  accessibilityRole="button"
                  accessibilityLabel={t('goalDetail.water.addTimeA11y')}
                  style={({ pressed }) => [styles.addLink, pressed && { opacity: 0.75 }]}>
                  <Text style={styles.addLinkText}>{t('goalDetail.water.addTimeLink')}</Text>
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
              <Text style={styles.bulkFillTitle}>{t('goalDetail.water.bulkFillOptional')}</Text>
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
                  <Text style={styles.customRowLabel}>{t('goalDetail.water.intervalMinutesLabel')}</Text>
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
                accessibilityLabel={t('goalDetail.water.bulkFillBtnA11y')}
                style={({ pressed }) => [styles.bulkFillBtn, pressed && { opacity: 0.88 }]}>
                <Text style={styles.bulkFillBtnText}>{t('goalDetail.water.bulkFillBtn')}</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.smartOffHint}>
            {t('goalDetail.water.smartNotifyHint')}
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
