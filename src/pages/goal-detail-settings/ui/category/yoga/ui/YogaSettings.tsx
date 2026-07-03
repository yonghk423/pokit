import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import {
  getInitialYogaDataConfig,
  normalizeYogaDetailConfig,
  type YogaDetailDataConfig,
} from './yogaConfig';

export function YogaSettings({
  rhythmTitle,
  categoryKey = 'yoga',
  dataConfig,
  onChangeDataConfig,
  allowRename = true,
  renameLockedReason = null,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  const initial = normalizeYogaDetailConfig(dataConfig ?? getInitialYogaDataConfig());

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [sessionStr, setSessionStr] = useState(String(initial.sessionMin));
  const [elapsedStr, setElapsedStr] = useState(String(initial.elapsedMin));
  const [flowLabel, setFlowLabel] = useState(initial.flowLabel);
  const [summary, setSummary] = useState(initial.summary);
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const payload: YogaDetailDataConfig = normalizeYogaDetailConfig({
      displayName,
      sessionMin: parseInt(sessionStr, 10) || 0,
      elapsedMin: parseInt(elapsedStr, 10) || 0,
      flowLabel,
      summary,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [displayName, sessionStr, elapsedStr, flowLabel, summary, onChangeDataConfig]);

  return (
    <View style={[styles.inner, { backgroundColor: c.surfaceLow }]}>
      <RoutineTitleField
        value={displayName}
        onChangeValue={setDisplayName}
        fallback={titleFallback}
        allowRename={allowRename}
        renameLockedReason={renameLockedReason}
        palette={c}
        size="compact"
      />
      <ThemedText style={[styles.sub, { color: c.onVariant }]}>
        세션 길이·경과 시간과 오늘의 플로우 이름을 적어 주세요.
      </ThemedText>
      <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={c} />
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
      <View style={styles.flowBlock}>
        <ThemedText style={[styles.label, { color: c.onVariant }]}>플로우 이름</ThemedText>
        <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
          <TextInput
            value={flowLabel}
            onChangeText={setFlowLabel}
            placeholder="아침 스트레치"
            placeholderTextColor={c.outline}
            style={[styles.input, { color: c.onSurface }]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: { borderRadius: 0, padding: 20, gap: 14 },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  sub: { fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 12 },
  flowBlock: { gap: 8, alignSelf: 'stretch' },
  col: { flex: 1, gap: 8 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  field: { borderRadius: 0, paddingVertical: 10, paddingHorizontal: 14 },
  input: { fontSize: 16, fontWeight: '800', padding: 0 },
});
