import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialFastingDataConfig,
  normalizeFastingDetailConfig,
  type FastingDetailDataConfig,
} from './fastingConfig';

export function FastingSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeFastingDetailConfig(dataConfig ?? getInitialFastingDataConfig());

  const [fastingStr, setFastingStr] = useState(String(initial.fastingMin));
  const [currentWeightStr, setCurrentWeightStr] = useState(String(initial.currentWeightKg));
  const [targetWeightStr, setTargetWeightStr] = useState(String(initial.targetWeightKg));
  const [weeklyLossStr, setWeeklyLossStr] = useState(String(initial.weeklyLossTargetKg));
  const [fastingEnabled, setFastingEnabled] = useState(initial.fastingEnabled);
  const lastRef = useRef<string | null>(null);
  const presetMinutes = [12 * 60, 14 * 60, 16 * 60, 18 * 60, 20 * 60];

  const parsed = useMemo(
    () =>
      normalizeFastingDetailConfig({
        fastingMin: parseInt(fastingStr, 10) || 0,
        elapsedMin: initial.elapsedMin,
        currentWeightKg: parseFloat(currentWeightStr) || 0,
        targetWeightKg: parseFloat(targetWeightStr) || 0,
        weeklyLossTargetKg: parseFloat(weeklyLossStr) || 0,
        fastingEnabled,
      }),
    [currentWeightStr, fastingEnabled, fastingStr, initial.elapsedMin, targetWeightStr, weeklyLossStr],
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

  useEffect(() => {
    const payload: FastingDetailDataConfig = parsed;
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [onChangeDataConfig, parsed]);

  return (
    <View style={styles.shell}>
      <View style={styles.listHeader}>
        <Text style={[styles.mainTitle, { color: c.onSurface }]}>체중 관리</Text>
      </View>

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

      <View style={[styles.progressCard, { borderColor: c.outlineVariant, backgroundColor: c.surfaceLowest }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: c.onSurface }]}>체중 목표 진행</Text>
          <Text style={[styles.progressPct, { color: c.onVariant }]}>
            {parsed.currentWeightKg <= parsed.targetWeightKg ? '달성' : '진행 중'}
          </Text>
        </View>
        <Text style={[styles.weightSummary, { color: c.onVariant }]}>
          현재 {parsed.currentWeightKg.toFixed(1)}kg → 목표 {parsed.targetWeightKg.toFixed(1)}kg, 주간{' '}
          {parsed.weeklyLossTargetKg.toFixed(1)}kg 감량
        </Text>
      </View>

      {fastingEnabled ? (
        <View style={[styles.progressCard, { borderColor: c.outlineVariant, backgroundColor: c.surfaceLowest }]}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressTitle, { color: c.onSurface }]}>단식 진행 현황</Text>
            <Text style={[styles.progressPct, { color: c.onVariant }]}>{Math.round(progress01 * 100)}%</Text>
          </View>
          <View style={[styles.track, { backgroundColor: c.outlineVariant }]}>
            <View style={[styles.fill, { width: `${Math.round(progress01 * 100)}%` }]} />
          </View>
        </View>
      ) : null}
      <View />
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
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  presetChipText: { fontSize: 12, fontWeight: '700' },
  toggleChip: {
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  toggleChipText: { fontSize: 12, fontWeight: '700' },
  inlineInputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  inlineInput: { minWidth: 72, fontSize: 18, fontWeight: '700', textAlign: 'right', padding: 0 },
  progressCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 14, fontWeight: '800' },
  progressPct: { fontSize: 12, fontWeight: '700' },
  weightSummary: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.88)' },
  note: { fontSize: 12, lineHeight: 18, fontWeight: '500' },
});
