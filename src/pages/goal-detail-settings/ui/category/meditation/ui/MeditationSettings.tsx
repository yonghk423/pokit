import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialMeditationDataConfig,
  normalizeMeditationDetailConfig,
  type MeditationDetailDataConfig,
} from './meditationConfig';

export function MeditationSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeMeditationDetailConfig(dataConfig ?? getInitialMeditationDataConfig());

  const [sessionStr, setSessionStr] = useState(String(initial.sessionMin));
  const [elapsedStr, setElapsedStr] = useState(String(initial.elapsedMin));
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const payload: MeditationDetailDataConfig = normalizeMeditationDetailConfig({
      sessionMin: parseInt(sessionStr, 10) || 0,
      elapsedMin: parseInt(elapsedStr, 10) || 0,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [sessionStr, elapsedStr, onChangeDataConfig]);

  return (
    <View style={[styles.inner, { backgroundColor: c.surfaceLow }]}>
      <ThemedText style={[styles.title, { color: c.onSurface }]}>명상 세션</ThemedText>
      <ThemedText style={[styles.sub, { color: c.onVariant }]}>
        한 세션 길이와 지금까지 진행된 시간을 분 단위로 적어 주세요.
      </ThemedText>
      <View style={styles.row}>
        <View style={styles.col}>
          <ThemedText style={[styles.label, { color: c.onVariant }]}>세션(분)</ThemedText>
          <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
            <TextInput
              value={sessionStr}
              onChangeText={setSessionStr}
              keyboardType="number-pad"
              placeholderTextColor={c.outline}
              style={[styles.input, { color: c.onSurface }]}
            />
          </View>
        </View>
        <View style={styles.col}>
          <ThemedText style={[styles.label, { color: c.onVariant }]}>경과(분)</ThemedText>
          <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
            <TextInput
              value={elapsedStr}
              onChangeText={setElapsedStr}
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
  label: { fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  field: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  input: { fontSize: 16, fontWeight: '800', padding: 0 },
});
