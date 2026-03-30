import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialStretchDataConfig,
  normalizeStretchDetailConfig,
  type StretchDetailDataConfig,
} from './stretchConfig';

export function StretchSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeStretchDetailConfig(dataConfig ?? getInitialStretchDataConfig());

  const [setsStr, setSetsStr] = useState(String(initial.totalSets));
  const [holdStr, setHoldStr] = useState(String(initial.holdSec));
  const [doneStr, setDoneStr] = useState(String(initial.doneSets));
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const payload: StretchDetailDataConfig = normalizeStretchDetailConfig({
      totalSets: parseInt(setsStr, 10) || 0,
      holdSec: parseInt(holdStr, 10) || 0,
      doneSets: parseInt(doneStr, 10) || 0,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [setsStr, holdStr, doneStr, onChangeDataConfig]);

  return (
    <View style={[styles.inner, { backgroundColor: c.surfaceLow }]}>
      <ThemedText style={[styles.title, { color: c.onSurface }]}>피트티스 세트</ThemedText>
      <ThemedText style={[styles.sub, { color: c.onVariant }]}>
        총 세트 수·한 자세 유지 시간(초)·완료한 세트 수를 입력해 주세요.
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.col}>
          <ThemedText style={[styles.label, { color: c.onVariant }]}>총 세트</ThemedText>
          <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
            <TextInput
              value={setsStr}
              onChangeText={setSetsStr}
              keyboardType="number-pad"
              placeholderTextColor={c.outline}
              style={[styles.input, { color: c.onSurface }]}
            />
          </View>
        </View>
        <View style={styles.col}>
          <ThemedText style={[styles.label, { color: c.onVariant }]}>유지(초)</ThemedText>
          <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
            <TextInput
              value={holdStr}
              onChangeText={setHoldStr}
              keyboardType="number-pad"
              placeholderTextColor={c.outline}
              style={[styles.input, { color: c.onSurface }]}
            />
          </View>
        </View>
        <View style={styles.col}>
          <ThemedText style={[styles.label, { color: c.onVariant }]}>완료</ThemedText>
          <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
            <TextInput
              value={doneStr}
              onChangeText={setDoneStr}
              keyboardType="number-pad"
              placeholderTextColor={c.outline}
              style={[styles.input, { color: c.onSurface }]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { borderRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 8 },
  col: { flex: 1, gap: 8 },
  label: { fontSize: 9, fontWeight: '900', letterSpacing: 0.8, textTransform: 'uppercase' },
  field: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10 },
  input: { fontSize: 15, fontWeight: '800', padding: 0 },
});
