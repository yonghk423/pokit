import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialWaterDataConfig,
  normalizeWaterDetailConfig,
  type WaterDetailDataConfig,
} from './waterConfig';

export function WaterSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeWaterDetailConfig(dataConfig ?? getInitialWaterDataConfig());

  const [goalStr, setGoalStr] = useState(String(initial.goalMl));
  const [drankStr, setDrankStr] = useState(String(initial.drankMl));
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const payload: WaterDetailDataConfig = normalizeWaterDetailConfig({
      goalMl: parseInt(goalStr, 10) || 0,
      drankMl: parseInt(drankStr, 10) || 0,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [goalStr, drankStr, onChangeDataConfig]);

  return (
    <View style={[styles.inner, { backgroundColor: c.surfaceLow }]}>
      <ThemedText style={[styles.title, { color: c.onSurface }]}>수분 목표</ThemedText>
      <ThemedText style={[styles.sub, { color: c.onVariant }]}>
        하루 섭취 목표(ml)와 지금까지 마신 양을 입력해 주세요.
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.col}>
          <ThemedText style={[styles.label, { color: c.onVariant }]}>목표(ml)</ThemedText>
          <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
            <TextInput
              value={goalStr}
              onChangeText={setGoalStr}
              keyboardType="number-pad"
              placeholderTextColor={c.outline}
              style={[styles.input, { color: c.onSurface }]}
            />
          </View>
        </View>
        <View style={styles.col}>
          <ThemedText style={[styles.label, { color: c.onVariant }]}>섭취(ml)</ThemedText>
          <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
            <TextInput
              value={drankStr}
              onChangeText={setDrankStr}
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
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 8 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  field: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  input: { fontSize: 16, fontWeight: '800', padding: 0 },
});
