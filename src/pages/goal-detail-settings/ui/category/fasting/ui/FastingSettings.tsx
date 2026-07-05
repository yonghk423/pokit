import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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

export function FastingSettings({
  rhythmTitle,
  categoryKey = 'fasting',
  dataConfig,
  onChangeDataConfig,
  allowRename = true,
  renameLockedReason = null,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  const initial = normalizeFastingDetailConfig(dataConfig ?? getInitialFastingDataConfig());

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [fastingStr, setFastingStr] = useState(String(initial.fastingMin));
  const [currentWeightStr, setCurrentWeightStr] = useState(String(initial.currentWeightKg));
  const [targetWeightStr, setTargetWeightStr] = useState(String(initial.targetWeightKg));
  const [weeklyLossStr, setWeeklyLossStr] = useState(String(initial.weeklyLossTargetKg));
  const [fastingEnabled, setFastingEnabled] = useState(initial.fastingEnabled);
  const [summary, setSummary] = useState(initial.summary);
  const lastRef = useRef<string | null>(null);
  const presetMinutes = [12 * 60, 14 * 60, 16 * 60, 18 * 60, 20 * 60];

  const parsed = useMemo(
    () =>
      normalizeFastingDetailConfig({
        displayName,
        fastingMin: parseInt(fastingStr, 10) || 0,
        elapsedMin: initial.elapsedMin,
        currentWeightKg: parseFloat(currentWeightStr) || 0,
        targetWeightKg: parseFloat(targetWeightStr) || 0,
        weeklyLossTargetKg: parseFloat(weeklyLossStr) || 0,
        fastingEnabled,
        summary,
      }),
    [currentWeightStr, displayName, fastingEnabled, fastingStr, initial.elapsedMin, summary, targetWeightStr, weeklyLossStr],
  );
  const progress01 = parsed.fastingMin > 0 ? Math.min(1, parsed.elapsedMin / parsed.fastingMin) : 0;
  const remainingMin = Math.max(0, parsed.fastingMin - parsed.elapsedMin);
  const finishAt = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() + remainingMin * 60 * 1000);
  }, [remainingMin]);
  const finishLabel = useMemo(() => {
    const hh = String(finishAt.getHours()).padStart(2, '0');
    const mm = String(finishAt.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }, [finishAt]);

  const weightDeltaKg = Math.max(0, parsed.currentWeightKg - parsed.targetWeightKg);
  const weightAchieved = parsed.currentWeightKg <= parsed.targetWeightKg && parsed.targetWeightKg > 0;
  const weightProgressRatio = weightAchieved
    ? 1
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

  return (
    <View style={styles.shell}>
      <RoutineTitleField
        value={displayName}
        onChangeValue={setDisplayName}
        fallback={titleFallback}
        allowRename={allowRename}
        renameLockedReason={renameLockedReason}
        palette={c}
      />

      <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={c} />

      <SettingsProgressBand
        title="체중 목표"
        valueLine={
          weightAchieved
            ? '목표 체중 달성'
            : `${parsed.currentWeightKg.toFixed(1)}kg → ${parsed.targetWeightKg.toFixed(1)}kg`
        }
        subLine={
          weightAchieved
            ? `주간 ${parsed.weeklyLossTargetKg.toFixed(1)}kg 감량 목표 유지`
            : `목표까지 ${weightDeltaKg.toFixed(1)}kg · 주간 ${parsed.weeklyLossTargetKg.toFixed(1)}kg 감량`
        }
        ratio={weightProgressRatio}
        palette={c}
      />

      <View style={[styles.metricBar, { borderTopColor: '#000', borderBottomColor: c.outline }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>
            {parsed.currentWeightKg.toFixed(1)}
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

        <View style={[styles.row, { borderBottomColor: c.outline }]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>단식 기능</Text>
          <Pressable
            onPress={() => setFastingEnabled((prev) => !prev)}
            style={[
              styles.toggleChip,
              {
                backgroundColor: fastingEnabled ? 'rgba(0,0,0,0.9)' : c.surfaceLowest,
                borderColor: fastingEnabled ? 'rgba(0,0,0,0.9)' : c.outlineVariant,
              },
            ]}>
            <Text style={[styles.toggleChipText, { color: fastingEnabled ? '#fff' : c.onSurface }]}>
              {fastingEnabled ? '사용' : '사용 안 함'}
            </Text>
          </Pressable>
        </View>

        {fastingEnabled ? (
          <View style={[styles.row, { borderBottomColor: c.outline }]}>
            <Text style={[styles.rowTitle, { color: c.onSurface }]}>단식 빠른 목표</Text>
          <View style={styles.presetRow}>
            {presetMinutes.map((min) => {
              const selected = parsed.fastingMin === min;
              return (
                <Pressable
                  key={min}
                  onPress={() => setFastingStr(String(min))}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: selected ? 'rgba(0,0,0,0.9)' : c.surfaceLowest,
                      borderColor: selected ? 'rgba(0,0,0,0.9)' : c.outlineVariant,
                    },
                  ]}>
                  <Text style={[styles.presetChipText, { color: selected ? '#fff' : c.onSurface }]}>
                    {Math.floor(min / 60)}h
                  </Text>
                </Pressable>
              );
            })}
          </View>
          </View>
        ) : null}

        {fastingEnabled ? (
          <View style={[styles.row, { borderBottomColor: c.outline }]}>
            <Text style={[styles.rowTitle, { color: c.onSurface }]}>목표 단식(분)</Text>
            <View style={styles.inlineInputWrap}>
              <TextInput
                value={fastingStr}
                onChangeText={setFastingStr}
                keyboardType="number-pad"
                placeholderTextColor={c.outline}
                style={[styles.inlineInput, { color: c.onSurface }]}
              />
            </View>
          </View>
        ) : null}

        {fastingEnabled ? (
          <View style={[styles.row, { borderBottomColor: c.outline }]}>
            <Text style={[styles.rowTitle, { color: c.onSurface }]}>남은 시간</Text>
            <Text style={[styles.rowValue, { color: c.onSurface }]}>
              {Math.floor(remainingMin / 60)}시간 {remainingMin % 60}분
            </Text>
          </View>
        ) : null}

        {fastingEnabled ? (
          <View style={[styles.row, { borderBottomColor: c.outline }]}>
            <Text style={[styles.rowTitle, { color: c.onSurface }]}>예상 종료</Text>
            <Text style={[styles.rowValue, { color: c.onSurface }]}>{finishLabel}</Text>
          </View>
        ) : null}
      </View>

      {fastingEnabled ? (
        <SettingsProgressBand
          title="단식 진행"
          valueLine={`${Math.floor(parsed.elapsedMin / 60)}시간 ${parsed.elapsedMin % 60}분 / ${Math.floor(parsed.fastingMin / 60)}시간`}
          subLine={`남은 ${Math.floor(remainingMin / 60)}시간 ${remainingMin % 60}분 · 예상 종료 ${finishLabel}`}
          ratio={progress01}
          palette={c}
        />
      ) : null}

      <View>
        <Text style={[styles.note, { color: c.onVariant }]}>
          체중 관리를 기본으로 두고 필요할 때 단식 기능을 함께 사용하세요.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 16, paddingVertical: 6 },
  listHeader: { gap: 6, paddingTop: 2 },
  mainTitle: { fontSize: 42, lineHeight: 46, fontWeight: '700', letterSpacing: -1.2 },
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
  rowValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  presetRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', flex: 1 },
  presetChip: {
    minWidth: 42,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  presetChipText: { fontSize: 12, fontWeight: '700' },
  toggleChip: {
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  toggleChipText: { fontSize: 12, fontWeight: '700' },
  inlineInputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  inlineInput: { minWidth: 72, fontSize: 18, fontWeight: '700', textAlign: 'right', padding: 0 },
  note: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
});
