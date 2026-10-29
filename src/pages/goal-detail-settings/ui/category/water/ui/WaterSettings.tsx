import { AppAlert as Alert } from '@shared/lib/app-alert';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  MAX_WATER_QUICK_ADD_PRESETS,
  useDayPlanDraftStore,
} from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { useUiSurfacePresentation } from '@shared/ui/presentation';

import { useGoalDetailSettingsPalette } from '../../lib/settingsPalette';
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
  const isDark = scheme === 'dark';
  const basePalette = useGoalDetailSettingsPalette(isDark);
  const palette = useMemo(() => {
    const pageBg = T.screenBg;
    return {
      ...basePalette,
      surfaceLow: pageBg,
      surfaceLowest: pageBg,
    };
  }, [basePalette]);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  const isNote = useUiSurfacePresentation() === 'note';

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

  const lastRef = useRef<string | null>(null);
  const hydratedStructuralKey = useRef<string | null>(null);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftPayloadRef = useRef<WaterDetailDataConfig | null>(null);

  useEffect(() => {
    useDayPlanDraftStore.getState().hydrate();
  }, []);

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
    setReminderTimes(next.reminderTimes);
    setSummary(next.summary);
    setDisplayName(next.displayName);
  }, [dataConfig, structuralKey]);

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
      reminderTimes,
      summary,
      displayName,
    });
  }, [
    displayName,
    drankMl,
    goalMl,
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

  return (
    <View style={[styles.shell, embedded && styles.shellEmbedded]}>
      {!embedded && !hideTitleField ? (
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
      ) : null}

      {!embedded ? (
        <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={palette} />
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
              onPress={() => { tapHaptic(); addDrankMl(ml); }}
              style={({ pressed }) => [
                styles.intakeChip,
                isNote && styles.intakeChipNote,
                pressed && { opacity: 0.75 },
              ]}>
              <Text style={[styles.intakeChipText, isNote && styles.intakeChipTextNote]}>+{ml}ml</Text>
            </Pressable>
          ))}
          {quickAddPresetsMl.length < MAX_WATER_QUICK_ADD_PRESETS ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('goalDetail.water.addPresetA11y')}
              onPress={() => { tapHaptic(); setShowAddPresetInput(true); }}
              style={({ pressed }) => [
                styles.intakeAddChip,
                isNote && styles.intakeAddChipNote,
                pressed && { opacity: 0.75 },
              ]}>
              <Text style={[styles.intakeAddChipText, isNote && { color: T.primary }]}>+</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('goalDetail.water.resetIntakeA11y')}
            onPress={() => { tapHaptic(); setDrankMl(0); }}
            style={({ pressed }) => [
              styles.intakeResetChip,
              isNote && styles.intakeResetChipNote,
              pressed && { opacity: 0.75 },
            ]}>
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
              onPress={() => { tapHaptic('confirm'); confirmAddQuickPreset(); }}
              style={({ pressed }) => [styles.addPresetConfirmBtn, pressed && { opacity: 0.75 }]}>
              <Text style={styles.addPresetConfirmText}>{t('goalDetail.add')}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('goalDetail.water.cancelPresetA11y')}
              onPress={() => {
                tapHaptic();
                setShowAddPresetInput(false);
                setAddPresetDraft('');
              }}
              style={({ pressed }) => [styles.addPresetCancelBtn, pressed && { opacity: 0.75 }]}>
              <Text style={styles.addPresetCancelText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={[styles.metricBar, isNote && styles.metricBarNote]}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{(goalMl / 1000).toFixed(1)}</Text>
          <Text style={styles.metricLabel}>{t('goalDetail.water.goalLiters')}</Text>
        </View>
      </View>

      <View style={[styles.rowsWrap, isNote && styles.rowsWrapNote]}>
        <View style={[styles.row, isNote && styles.rowNote]}>
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

        <View style={[styles.row, isNote && styles.rowNote]}>
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
                  onPress={() => { tapHaptic('select'); onPickPresetMl(p.ml); }}
                  style={[
                    styles.presetChip,
                    isNote && styles.presetChipNote,
                    active && (isNote ? styles.presetChipNoteOn : styles.presetChipOn),
                  ]}>
                  <Text
                    style={[
                      styles.presetChipText,
                      active && styles.presetChipTextOn,
                      isNote && active && styles.presetChipTextNoteOn,
                    ]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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
  intakeChipNote: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingRight: 12,
    paddingVertical: 2,
  },
  intakeChipTextNote: { textDecorationLine: 'underline' },
  intakeAddChipNote: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    minWidth: 0,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  intakeResetChipNote: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 2,
  },
  metricBarNote: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingVertical: 8,
  },
  rowsWrapNote: { borderTopWidth: 0 },
  rowNote: { minHeight: 0, paddingVertical: 6, borderBottomWidth: 0 },
  presetChipNote: {
    backgroundColor: 'transparent',
    minWidth: 0,
    paddingHorizontal: 0,
    paddingRight: 12,
    paddingVertical: 2,
  },
  presetChipNoteOn: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  presetChipTextNoteOn: { textDecorationLine: 'underline' },
  routineWindowBandNote: {
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    marginHorizontal: 0,
    paddingHorizontal: 0,
    paddingVertical: 6,
  },
  timesSectionNote: { borderBottomWidth: 0 },
  bulkFillBlockNote: { borderBottomWidth: 0 },
  bulkFillBtnNote: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
    alignItems: 'flex-start',
  },
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
