import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialWorkDataConfig,
  normalizeWorkDetailConfig,
  type WorkDetailDataConfig,
} from './workConfig';

export function WorkSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeWorkDetailConfig(dataConfig ?? getInitialWorkDataConfig());

  const [planStr, setPlanStr] = useState(String(initial.planMin));
  const [doneStr, setDoneStr] = useState(String(initial.doneMin));
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const payload: WorkDetailDataConfig = normalizeWorkDetailConfig({
      planMin: parseInt(planStr, 10) || 0,
      doneMin: parseInt(doneStr, 10) || 0,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [planStr, doneStr, onChangeDataConfig]);

  return (
    <View style={styles.card}>
      <View style={[styles.inner, { backgroundColor: c.surfaceLow }]}>
        <ThemedText style={[styles.title, { color: c.onSurface }]}>업무 집중</ThemedText>
        <ThemedText style={[styles.sub, { color: c.onVariant }]}>
          오늘 총 집중 시간과 지금까지 진행한 시간을 입력해 주세요.
        </ThemedText>
        <View style={styles.row}>
          <View style={styles.col}>
            <ThemedText style={[styles.label, { color: c.onVariant }]}>계획(분)</ThemedText>
            <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
              <TextInput
                value={planStr}
                onChangeText={setPlanStr}
                keyboardType="number-pad"
                placeholderTextColor={c.outline}
                style={[styles.input, { color: c.onSurface }]}
              />
            </View>
          </View>
          <View style={styles.col}>
            <ThemedText style={[styles.label, { color: c.onVariant }]}>진행(분)</ThemedText>
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: 18 },
  inner: { borderRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 8 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  field: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  input: { fontSize: 16, fontWeight: '800', padding: 0 },
});
