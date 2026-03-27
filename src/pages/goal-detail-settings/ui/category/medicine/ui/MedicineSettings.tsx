import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialMedicineDataConfig,
  normalizeMedicineDetailConfig,
  type MedicineDetailDataConfig,
} from './medicineConfig';

export function MedicineSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeMedicineDetailConfig(dataConfig ?? getInitialMedicineDataConfig());

  const [doseLabel, setDoseLabel] = useState(initial.doseLabel);
  const [perDayStr, setPerDayStr] = useState(String(initial.dosesPerDay));
  const [takenStr, setTakenStr] = useState(String(initial.takenCount));
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const payload: MedicineDetailDataConfig = normalizeMedicineDetailConfig({
      doseLabel,
      dosesPerDay: parseInt(perDayStr, 10) || 0,
      takenCount: parseInt(takenStr, 10) || 0,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [doseLabel, perDayStr, takenStr, onChangeDataConfig]);

  return (
    <View style={[styles.inner, { backgroundColor: c.surfaceLow }]}>
      <ThemedText style={[styles.title, { color: c.onSurface }]}>약 복용 체크</ThemedText>
      <ThemedText style={[styles.sub, { color: c.onVariant }]}>
        약 이름·하루 횟수·오늘 복용한 횟수를 입력해 주세요.
      </ThemedText>
      <View style={styles.block}>
        <ThemedText style={[styles.label, { color: c.onVariant }]}>약·종류 메모</ThemedText>
        <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
          <TextInput
            value={doseLabel}
            onChangeText={setDoseLabel}
            placeholder="종합비타민"
            placeholderTextColor={c.outline}
            style={[styles.input, { color: c.onSurface }]}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.col}>
          <ThemedText style={[styles.label, { color: c.onVariant }]}>하루 횟수</ThemedText>
          <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
            <TextInput
              value={perDayStr}
              onChangeText={setPerDayStr}
              keyboardType="number-pad"
              placeholderTextColor={c.outline}
              style={[styles.input, { color: c.onSurface }]}
            />
          </View>
        </View>
        <View style={styles.col}>
          <ThemedText style={[styles.label, { color: c.onVariant }]}>복용함</ThemedText>
          <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
            <TextInput
              value={takenStr}
              onChangeText={setTakenStr}
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
  block: { gap: 8, alignSelf: 'stretch' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1, gap: 8 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  field: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  input: { fontSize: 16, fontWeight: '800', padding: 0 },
});
