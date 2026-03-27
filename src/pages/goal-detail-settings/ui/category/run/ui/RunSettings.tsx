import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialRunDataConfig,
  normalizeRunDetailConfig,
  type RunDetailDataConfig,
} from './runConfig';

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  c,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType: 'decimal-pad' | 'number-pad';
  c: ReturnType<typeof goalDetailSettingsPalette>;
}) {
  return (
    <View style={fieldStyles.fieldCol}>
      <ThemedText style={[fieldStyles.fieldLabel, { color: c.onVariant }]}>{label}</ThemedText>
      <View style={[fieldStyles.fieldWrap, { backgroundColor: c.surfaceLowest }]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={c.outline}
          keyboardType={keyboardType}
          style={[fieldStyles.input, { color: c.onSurface }]}
        />
      </View>
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  fieldCol: { flex: 1, gap: 8 },
  fieldLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  fieldWrap: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  input: { fontSize: 16, fontWeight: '800', padding: 0 },
});

export function RunSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeRunDetailConfig(dataConfig ?? getInitialRunDataConfig());

  const [targetKmStr, setTargetKmStr] = useState(String(initial.targetKm));
  const [goalMinStr, setGoalMinStr] = useState(String(initial.goalMin));
  const [doneKmStr, setDoneKmStr] = useState(String(initial.doneKm));
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const n = normalizeRunDetailConfig({
      targetKm: parseFloat(targetKmStr) || 0,
      goalMin: parseInt(goalMinStr, 10) || 0,
      doneKm: parseFloat(doneKmStr) || 0,
    });
    const payload: RunDetailDataConfig = n;
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [targetKmStr, goalMinStr, doneKmStr, onChangeDataConfig]);

  return (
    <View style={styles.wrap}>
      <View style={[styles.card, { backgroundColor: c.surfaceLow }]}>
        <ThemedText style={[styles.title, { color: c.onSurface }]}>러닝 목표</ThemedText>
        <ThemedText style={[styles.sub, { color: c.onVariant }]}>
          오늘 달리기 거리·시간·현재까지 진행 거리를 정해 주세요.
        </ThemedText>
        <View style={styles.row}>
          <Field
            label="목표 거리(km)"
            value={targetKmStr}
            onChangeText={setTargetKmStr}
            keyboardType="decimal-pad"
            c={c}
          />
          <Field
            label="목표 시간(분)"
            value={goalMinStr}
            onChangeText={setGoalMinStr}
            keyboardType="number-pad"
            c={c}
          />
        </View>
        <Field
          label="현재까지(km)"
          value={doneKmStr}
          onChangeText={setDoneKmStr}
          keyboardType="decimal-pad"
          c={c}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  card: { borderRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 12 },
});
