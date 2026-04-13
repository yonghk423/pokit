import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

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
    <View style={[styles.inner, { backgroundColor: c.surfaceLow }]}>
      <ThemedText style={[styles.title, { color: c.onSurface }]}>단식 타이머</ThemedText>
      <ThemedText style={[styles.sub, { color: c.onVariant }]}>
        목표 단식 시간을 설정해 주세요. 시작 후 경과 시간은 자동으로 누적됩니다. (1시간~48시간)
      </ThemedText>
      <View style={styles.presetWrap}>
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
                  borderColor: selected ? 'rgba(0,0,0,0.9)' : c.border,
                },
              ]}>
              <ThemedText style={[styles.presetChipText, { color: selected ? '#fff' : c.onSurface }]}>
                {Math.floor(min / 60)}시간
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.row}>
        <View style={styles.col}>
          <ThemedText style={[styles.label, { color: c.onVariant }]}>목표 단식(분)</ThemedText>
          <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
            <TextInput
              value={fastingStr}
              onChangeText={setFastingStr}
              keyboardType="number-pad"
              placeholderTextColor={c.outline}
              style={[styles.input, { color: c.onSurface }]}
            />
          </View>
        </View>
      </View>
      <View style={[styles.progressCard, { backgroundColor: c.surfaceLowest, borderColor: c.border }]}>
        <View style={styles.progressHeader}>
          <ThemedText style={[styles.progressTitle, { color: c.onSurface }]}>진행 현황</ThemedText>
          <ThemedText style={[styles.progressPct, { color: c.onVariant }]}>
            {Math.round(progress01 * 100)}%
          </ThemedText>
        </View>
        <View style={[styles.track, { backgroundColor: c.border }]}>
          <View style={[styles.fill, { width: `${Math.round(progress01 * 100)}%` }]} />
        </View>
        <View style={styles.progressMetaRow}>
          <ThemedText style={[styles.progressMeta, { color: c.onVariant }]}>
            남은 시간 {Math.floor(remainingMin / 60)}시간 {remainingMin % 60}분
          </ThemedText>
          <ThemedText style={[styles.progressMeta, { color: c.onVariant }]}>
            예상 종료 {finishLabel}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { borderRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 13, lineHeight: 18 },
  presetWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  presetChipText: { fontSize: 12, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 8 },
  label: { fontSize: 12, fontWeight: '600' },
  field: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  input: { fontSize: 16, fontWeight: '600', padding: 0 },
  progressCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 14, fontWeight: '800' },
  progressPct: { fontSize: 12, fontWeight: '700' },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.88)' },
  progressMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  progressMeta: { fontSize: 12, fontWeight: '600' },
});
