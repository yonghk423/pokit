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
  const lastRef = useRef<string | null>(null);
  const presetMinutes = [12 * 60, 14 * 60, 16 * 60, 18 * 60, 20 * 60];

  const parsed = useMemo(
    () =>
      normalizeFastingDetailConfig({
        fastingMin: parseInt(fastingStr, 10) || 0,
        elapsedMin: initial.elapsedMin,
      }),
    [fastingStr, initial.elapsedMin],
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
      <View style={styles.header}>
        <Text style={[styles.brand, { color: c.onSurface }]}>LOCKFLOW FASTING</Text>
      </View>

      <View style={styles.about}>
        <Text style={[styles.sectionKicker, { color: c.onVariant }]}>ABOUT FASTING</Text>
        <Text style={[styles.aboutText, { color: c.onSurface }]}>
          단식 시간을 계획하고 남은 시간을 한 번에 확인해 세션 리듬을 안정적으로 유지합니다.
        </Text>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.sectionKicker, { color: c.onVariant }]}>CATEGORIES ||</Text>
        <Text style={[styles.mainTitle, { color: c.onSurface }]}>Fasting</Text>
      </View>

      <View style={[styles.metricBar, { borderTopColor: '#000', borderBottomColor: c.outline }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>{Math.floor(parsed.fastingMin / 60)}</Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>목표(시간)</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>{Math.round(progress01 * 100)}</Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>진행(%)</Text>
        </View>
      </View>

      <View style={[styles.rowsWrap, { borderTopColor: '#000' }]}>
        <View style={[styles.row, { borderBottomColor: c.outline }]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>빠른 목표</Text>
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

        <View style={[styles.row, { borderBottomColor: c.outline }]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>남은 시간</Text>
          <Text style={[styles.rowValue, { color: c.onSurface }]}>
            {Math.floor(remainingMin / 60)}시간 {remainingMin % 60}분
          </Text>
        </View>

        <View style={[styles.row, { borderBottomColor: c.outline }]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>예상 종료</Text>
          <Text style={[styles.rowValue, { color: c.onSurface }]}>{finishLabel}</Text>
        </View>
      </View>

      <View style={[styles.progressCard, { borderColor: c.outlineVariant, backgroundColor: c.surfaceLowest }]}>
        <View style={styles.progressHeader}>
          <Text style={[styles.progressTitle, { color: c.onSurface }]}>진행 현황</Text>
          <Text style={[styles.progressPct, { color: c.onVariant }]}>{Math.round(progress01 * 100)}%</Text>
        </View>
        <View style={[styles.track, { backgroundColor: c.outlineVariant }]}>
          <View style={[styles.fill, { width: `${Math.round(progress01 * 100)}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 16, paddingVertical: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  brand: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  about: { gap: 8 },
  sectionKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  aboutText: { fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: -0.3 },
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
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.88)' },
});
