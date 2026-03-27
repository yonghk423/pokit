import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialOtherDataConfig,
  normalizeOtherDetailConfig,
  type OtherDetailDataConfig,
} from './otherConfig';

export function OtherSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());

  const [memo, setMemo] = useState(initial.memo);
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const payload: OtherDetailDataConfig = normalizeOtherDetailConfig({ memo });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [memo, onChangeDataConfig]);

  return (
    <View style={[styles.inner, { backgroundColor: c.surfaceLow }]}>
      <ThemedText style={[styles.title, { color: c.onSurface }]}>기타 메모</ThemedText>
      <ThemedText style={[styles.sub, { color: c.onVariant }]}>
        잠금화면에 보여 줄 짧은 메모를 적어 주세요.
      </ThemedText>
      <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
        <TextInput
          value={memo}
          onChangeText={setMemo}
          placeholder="오늘 할 일 한 줄 메모"
          placeholderTextColor={c.outline}
          multiline
          style={[styles.input, { color: c.onSurface }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { borderRadius: 16, padding: 20, gap: 14 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 12, lineHeight: 18 },
  field: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, minHeight: 88 },
  input: { fontSize: 15, fontWeight: '600', padding: 0, textAlignVertical: 'top' },
});
