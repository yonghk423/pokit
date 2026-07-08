import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import {
  latestWeightFromLogs,
  weightGoalAchieved,
  weightProgressRatioFromLogs,
  weightDeltaToTarget,
} from '@entities/day-plan/lib/weightLog';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
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
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  const initial = normalizeFastingDetailConfig(dataConfig ?? getInitialFastingDataConfig());

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [currentWeightStr, setCurrentWeightStr] = useState(String(initial.currentWeightKg));
  const [targetWeightStr, setTargetWeightStr] = useState(String(initial.targetWeightKg));
  const [weeklyLossStr, setWeeklyLossStr] = useState(String(initial.weeklyLossTargetKg));
  const [summary, setSummary] = useState(initial.summary);
  const [weightLogs, setWeightLogs] = useState(initial.weightLogs);
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const next = normalizeFastingDetailConfig(dataConfig ?? getInitialFastingDataConfig());
    setDisplayName(next.displayName);
    setCurrentWeightStr(String(next.currentWeightKg));
    setTargetWeightStr(String(next.targetWeightKg));
    setWeeklyLossStr(String(next.weeklyLossTargetKg));
    setSummary(next.summary);
    setWeightLogs(next.weightLogs);
  }, [dataConfig]);

  const parsed = useMemo(
    () =>
      normalizeFastingDetailConfig({
        displayName,
        currentWeightKg: parseFloat(currentWeightStr) || 0,
        targetWeightKg: parseFloat(targetWeightStr) || 0,
        weeklyLossTargetKg: parseFloat(weeklyLossStr) || 0,
        fastingEnabled: false,
        summary,
        weightLogs,
      }),
    [currentWeightStr, displayName, summary, targetWeightStr, weeklyLossStr, weightLogs],
  );

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

  useEffect(() => {
    const payload: FastingDetailDataConfig = parsed;
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [onChangeDataConfig, parsed]);

  const syncCurrentFromLogs = (logs: typeof weightLogs) => {
    const latest = latestWeightFromLogs(logs, parseFloat(currentWeightStr) || parsed.currentWeightKg);
    setCurrentWeightStr(String(latest));
  };

  return (
    <View style={styles.shell}>
      {!hideTitleField ? (
        <RoutineTitleField
          value={displayName}
          onChangeValue={setDisplayName}
          fallback={titleFallback}
          allowRename={allowRename}
          renameLockedReason={renameLockedReason}
          palette={c}
        />
      ) : null}

      <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={c} />

      <SettingsProgressBand
        title="체중 목표"
        valueLine={
          weightAchieved
            ? '목표 체중 달성'
            : `${effectiveCurrentKg.toFixed(1)}kg → ${parsed.targetWeightKg.toFixed(1)}kg`
        }
        subLine={
          weightAchieved
            ? `주간 ${parsed.weeklyLossTargetKg.toFixed(1)}kg 감량 목표 유지`
            : `목표까지 ${weightDeltaKg.toFixed(1)}kg · 주간 ${parsed.weeklyLossTargetKg.toFixed(1)}kg 감량`
        }
        ratio={weightProgressRatio}
        palette={c}
      />

      <WeightLogChart
        weightLogs={parsed.weightLogs}
        targetWeightKg={parsed.targetWeightKg}
        palette={c}
      />

      <WeightLogCalendarSection
        weightLogs={parsed.weightLogs}
        onChangeWeightLogs={(next) => {
          setWeightLogs(next);
          syncCurrentFromLogs(next);
        }}
        palette={c}
      />

      <View style={[styles.metricBar, { borderTopColor: '#000', borderBottomColor: c.outline }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>
            {effectiveCurrentKg.toFixed(1)}
          </Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>현재(kg)</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>{parsed.targetWeightKg.toFixed(1)}</Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>목표(kg)</Text>
        </View>
      </View>

      <View style={[styles.rowsWrap, { borderTopColor: '#000' }]}>
        <View style={[styles.row, { borderBottomColor: c.outline }]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>현재 체중(kg)</Text>
          <View style={styles.inlineInputWrap}>
            <TextInput
              value={currentWeightStr}
              onChangeText={setCurrentWeightStr}
              keyboardType="decimal-pad"
              placeholderTextColor={c.outline}
              style={[styles.inlineInput, { color: c.onSurface }]}
            />
          </View>
        </View>

        <View style={[styles.row, { borderBottomColor: c.outline }]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>목표 체중(kg)</Text>
          <View style={styles.inlineInputWrap}>
            <TextInput
              value={targetWeightStr}
              onChangeText={setTargetWeightStr}
              keyboardType="decimal-pad"
              placeholderTextColor={c.outline}
              style={[styles.inlineInput, { color: c.onSurface }]}
            />
          </View>
        </View>

        <View style={[styles.row, { borderBottomColor: c.outline }]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>주간 감량 목표(kg)</Text>
          <View style={styles.inlineInputWrap}>
            <TextInput
              value={weeklyLossStr}
              onChangeText={setWeeklyLossStr}
              keyboardType="decimal-pad"
              placeholderTextColor={c.outline}
              style={[styles.inlineInput, { color: c.onSurface }]}
            />
          </View>
        </View>
      </View>

      <Text style={[styles.note, { color: c.onVariant }]}>
        달력에 날짜별 체중을 기록하면 그래프와 진행도에 반영돼요.
      </Text>
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
  metricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  rowsWrap: { borderTopWidth: 1 },
  row: {
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
  },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  inlineInputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  inlineInput: { minWidth: 72, fontSize: 18, fontWeight: '700', textAlign: 'right', padding: 0 },
  note: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
});
