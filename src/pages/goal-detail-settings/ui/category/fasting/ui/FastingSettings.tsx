import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  FASTING_WEEKLY_LOSS_MAX_KG,
  FASTING_WEEKLY_LOSS_MIN_KG,
  getLocalDateKey,
} from '@entities/day-plan';
import {
  applyCurrentWeightToLogs,
  latestWeightFromLogs,
  weightGoalAchieved,
  weightProgressRatioFromLogs,
  weightDeltaToTarget,
} from '@entities/day-plan/lib/weightLog';
import { useTranslation } from '@shared/lib/i18n';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { useUiSurfacePresentation } from '@shared/ui/presentation';
import { ThemedText } from '@shared/ui/themed-text';

import { useGoalDetailSettingsPalette } from '../../lib/settingsPalette';
import { SettingsProgressBand } from '../../lib/SettingsProgressBand';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import {
  getInitialFastingDataConfig,
  normalizeFastingDetailConfig,
  type FastingDetailDataConfig,
} from './fastingConfig';
import { WeightLogCalendarSection } from './WeightLogCalendarSection';
import { WeightLogChart } from './WeightLogChart';

const WEIGHT_MIN_KG = 30;
const WEIGHT_MAX_KG = 250;
const WEIGHT_STEP_KG = 0.1;

function roundKg1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clampWeightKg(n: number): number {
  return Math.max(WEIGHT_MIN_KG, Math.min(WEIGHT_MAX_KG, roundKg1(n)));
}

function clampWeeklyKg(n: number): number {
  return Math.max(
    FASTING_WEEKLY_LOSS_MIN_KG,
    Math.min(FASTING_WEEKLY_LOSS_MAX_KG, roundKg1(n)),
  );
}

function formatKg(n: number): string {
  return roundKg1(n).toFixed(1);
}

function WeightKgStepper({
  valueKg,
  onChangeKg,
  stepKg,
  minKg,
  maxKg,
  ink,
  outline,
  label,
}: {
  valueKg: number;
  onChangeKg: (next: number) => void;
  stepKg: number;
  minKg: number;
  maxKg: number;
  ink: string;
  outline: string;
  label: string;
}) {
  const { t } = useTranslation();
  const canDecrease = valueKg > minKg + 1e-9;
  const canIncrease = valueKg < maxKg - 1e-9;
  const stepLabel = formatKg(stepKg);

  const nudge = useCallback(
    (dir: -1 | 1) => {
      const next = roundKg1(valueKg + dir * stepKg);
      const clamped = Math.max(minKg, Math.min(maxKg, next));
      if (Math.abs(clamped - valueKg) < 1e-9) return;
      void Haptics.selectionAsync();
      onChangeKg(clamped);
    },
    [maxKg, minKg, onChangeKg, stepKg, valueKg],
  );

  return (
    <View style={styles.stepper} accessibilityLabel={label}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('customFlowTemplate.decreaseByA11y', { step: stepLabel })}
        accessibilityState={{ disabled: !canDecrease }}
        disabled={!canDecrease}
        hitSlop={6}
        onPress={() => nudge(-1)}
        style={({ pressed }) => [
          styles.stepBtn,
          {
            borderColor: outline,
            opacity: !canDecrease ? 0.35 : pressed ? 0.75 : 1,
          },
        ]}>
        <IconSymbol name="minus" size={13} color={ink} />
      </Pressable>
      <ThemedText style={[styles.stepValue, { color: ink }]}>{formatKg(valueKg)}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('customFlowTemplate.increaseByA11y', { step: stepLabel })}
        accessibilityState={{ disabled: !canIncrease }}
        disabled={!canIncrease}
        hitSlop={6}
        onPress={() => nudge(1)}
        style={({ pressed }) => [
          styles.stepBtn,
          {
            borderColor: outline,
            opacity: !canIncrease ? 0.35 : pressed ? 0.75 : 1,
          },
        ]}>
        <IconSymbol name="plus" size={13} color={ink} />
      </Pressable>
    </View>
  );
}

export function FastingSettings({
  rhythmTitle,
  categoryKey = 'fasting',
  dataConfig,
  onChangeDataConfig,
  allowRename = true,
  renameLockedReason = null,
  hideTitleField = false,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
  hideTitleField?: boolean;
}) {
  const { t } = useTranslation();

  const scheme = useColorScheme();
  const c = useGoalDetailSettingsPalette(scheme === 'dark');
  const isNote = useUiSurfacePresentation() === 'note';
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  const [draft, setDraft] = useState<FastingDetailDataConfig>(() =>
    normalizeFastingDetailConfig(dataConfig ?? getInitialFastingDataConfig()),
  );
  const lastJsonRef = useRef<string | null>(null);
  const pendingLocalRef = useRef(false);
  const onChangeDataConfigRef = useRef(onChangeDataConfig);
  onChangeDataConfigRef.current = onChangeDataConfig;

  useEffect(() => {
    const incoming = normalizeFastingDetailConfig(dataConfig ?? getInitialFastingDataConfig());
    const s = JSON.stringify(incoming);
    if (s === lastJsonRef.current) {
      pendingLocalRef.current = false;
      return;
    }
    if (pendingLocalRef.current) return;
    lastJsonRef.current = s;
    setDraft((prev) => (JSON.stringify(prev) === s ? prev : incoming));
  }, [dataConfig]);

  useEffect(() => {
    const s = JSON.stringify(draft);
    if (lastJsonRef.current === s) return;
    lastJsonRef.current = s;
    pendingLocalRef.current = true;
    onChangeDataConfigRef.current(draft);
  }, [draft]);

  const applyCurrentWeightKg = (next: number) => {
    const kg = clampWeightKg(next);
    setDraft((prev) =>
      normalizeFastingDetailConfig({
        ...prev,
        currentWeightKg: kg,
        weightLogs: applyCurrentWeightToLogs(prev.weightLogs, kg, getLocalDateKey()),
      }),
    );
  };

  const parsed = draft;
  const effectiveCurrentKg = latestWeightFromLogs(parsed.weightLogs, parsed.currentWeightKg);
  const weightDeltaKg = weightDeltaToTarget(effectiveCurrentKg, parsed.targetWeightKg);
  const weightAchieved = weightGoalAchieved(effectiveCurrentKg, parsed.targetWeightKg);
  const weightProgressRatio = weightAchieved
    ? 1
    : Object.keys(parsed.weightLogs).length > 0
      ? weightProgressRatioFromLogs(parsed.weightLogs, parsed.targetWeightKg, parsed.currentWeightKg)
      : parsed.weeklyLossTargetKg > 0
        ? Math.min(0.95, parsed.weeklyLossTargetKg / Math.max(0.1, weightDeltaKg))
        : 0;

  return (
    <View style={styles.shell}>
      {!hideTitleField ? (
        <RoutineTitleField
          value={draft.displayName}
          onChangeValue={(displayName) => setDraft((prev) => ({ ...prev, displayName }))}
          fallback={titleFallback}
          allowRename={allowRename}
          renameLockedReason={renameLockedReason}
          palette={c}
        />
      ) : null}

      <RoutineSummaryField
        value={draft.summary}
        onChangeValue={(summary) => setDraft((prev) => ({ ...prev, summary }))}
        palette={c}
      />

      <SettingsProgressBand
        title={t('goalDetail.fasting.weightGoal')}
        valueLine={
          weightAchieved
            ? t('goalDetail.fasting.goalAchieved')
            : `${effectiveCurrentKg.toFixed(1)}kg → ${parsed.targetWeightKg.toFixed(1)}kg`
        }
        subLine={
          weightAchieved
            ? t('goalDetail.fasting.weeklyMaintain', { kg: parsed.weeklyLossTargetKg.toFixed(1) })
            : t('goalDetail.fasting.goalDelta', {
                delta: weightDeltaKg.toFixed(1),
                weekly: parsed.weeklyLossTargetKg.toFixed(1),
              })
        }
        ratio={weightProgressRatio}
        palette={c}
      />

      <WeightLogChart
        weightLogs={parsed.weightLogs}
        targetWeightKg={parsed.targetWeightKg}
        weeklyLossTargetKg={parsed.weeklyLossTargetKg}
        palette={c}
      />

      <WeightLogCalendarSection
        weightLogs={parsed.weightLogs}
        currentWeightKg={parsed.currentWeightKg}
        onChangeWeightLogs={(next) => {
          setDraft((prev) =>
            normalizeFastingDetailConfig({
              ...prev,
              weightLogs: next,
              currentWeightKg: latestWeightFromLogs(next, prev.currentWeightKg),
            }),
          );
        }}
        palette={c}
      />

      <View
        style={[
          styles.metricBar,
          !isNote && { borderTopColor: '#000', borderBottomColor: c.outline },
          isNote && styles.metricBarNote,
        ]}>
        <View style={styles.metricItem}>
          <ThemedText style={[styles.metricValue, { color: c.onSurface }]}>
            {effectiveCurrentKg.toFixed(1)}
          </ThemedText>
          <ThemedText style={[styles.metricLabel, { color: c.onVariant }]}>{t('goalDetail.fasting.currentKg')}</ThemedText>
        </View>
        <View style={styles.metricItem}>
          <ThemedText style={[styles.metricValue, { color: c.onSurface }]}>{parsed.targetWeightKg.toFixed(1)}</ThemedText>
          <ThemedText style={[styles.metricLabel, { color: c.onVariant }]}>{t('goalDetail.fasting.targetKg')}</ThemedText>
        </View>
      </View>

      <View style={[styles.rowsWrap, !isNote && { borderTopColor: '#000' }, isNote && styles.rowsWrapNote]}>
        <View style={[styles.row, !isNote && { borderBottomColor: c.outline }, isNote && styles.rowNote]}>
          <ThemedText style={[styles.rowTitle, { color: c.onSurface }]}>{t('goalDetail.fasting.currentWeight')}</ThemedText>
          <WeightKgStepper
            label={t('goalDetail.fasting.currentWeight')}
            valueKg={draft.currentWeightKg}
            onChangeKg={applyCurrentWeightKg}
            stepKg={WEIGHT_STEP_KG}
            minKg={WEIGHT_MIN_KG}
            maxKg={WEIGHT_MAX_KG}
            ink={c.onSurface}
            outline={c.outline}
          />
        </View>

        <View style={[styles.row, !isNote && { borderBottomColor: c.outline }, isNote && styles.rowNote]}>
          <ThemedText style={[styles.rowTitle, { color: c.onSurface }]}>{t('goalDetail.fasting.targetWeight')}</ThemedText>
          <WeightKgStepper
            label={t('goalDetail.fasting.targetWeight')}
            valueKg={draft.targetWeightKg}
            onChangeKg={(next) =>
              setDraft((prev) => ({ ...prev, targetWeightKg: clampWeightKg(next) }))
            }
            stepKg={WEIGHT_STEP_KG}
            minKg={WEIGHT_MIN_KG}
            maxKg={WEIGHT_MAX_KG}
            ink={c.onSurface}
            outline={c.outline}
          />
        </View>

        <View style={[styles.row, !isNote && { borderBottomColor: c.outline }, isNote && styles.rowNote]}>
          <ThemedText style={[styles.rowTitle, { color: c.onSurface }]}>{t('goalDetail.fasting.weeklyTarget')}</ThemedText>
          <WeightKgStepper
            label={t('goalDetail.fasting.weeklyTarget')}
            valueKg={draft.weeklyLossTargetKg}
            onChangeKg={(next) =>
              setDraft((prev) => ({ ...prev, weeklyLossTargetKg: clampWeeklyKg(next) }))
            }
            stepKg={WEIGHT_STEP_KG}
            minKg={FASTING_WEEKLY_LOSS_MIN_KG}
            maxKg={FASTING_WEEKLY_LOSS_MAX_KG}
            ink={c.onSurface}
            outline={c.outline}
          />
        </View>
      </View>

      <ThemedText style={[styles.note, { color: c.onVariant }]}>
        {t('goalDetail.fasting.calendarHint')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 16, paddingVertical: 6 },
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
  row: {
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 8,
  },
  rowTitle: { flex: 1, fontSize: 14, fontWeight: '400', minWidth: 0 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    minWidth: 40,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  note: { fontSize: 12, lineHeight: 18, fontWeight: '400' },
  metricBarNote: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    paddingVertical: 8,
    justifyContent: 'space-around',
  },
  rowsWrapNote: { borderTopWidth: 0, gap: 2 },
  rowNote: { minHeight: 0, paddingVertical: 6, borderBottomWidth: 0 },
});
