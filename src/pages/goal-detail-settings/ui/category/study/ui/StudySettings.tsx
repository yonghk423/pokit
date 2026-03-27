import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialStudyDataConfig,
  normalizeStudyDetailConfig,
  type StudyDetailDataConfig,
} from './studyConfig';

const PRIMARY = 'rgb(249, 115, 22)';

export function StudySettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const initial = normalizeStudyDetailConfig(dataConfig ?? getInitialStudyDataConfig());

  const [goalMemo, setGoalMemo] = useState(initial.goalMemo);
  const lastRef = useRef<string | null>(null);

  useEffect(() => {
    const payload: StudyDetailDataConfig = normalizeStudyDetailConfig({ goalMemo });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [goalMemo, onChangeDataConfig]);

  return (
    <View style={[styles.card, { backgroundColor: c.surfaceLow }]}>
      <View style={styles.iconWrap}>
        <IconSymbol name="book.closed.fill" size={28} color={PRIMARY} weight="semibold" />
      </View>
      <ThemedText style={[styles.title, { color: c.onSurface }]}>공부 목표 메모</ThemedText>
      <ThemedText style={[styles.body, { color: c.onVariant }]}>
        과목·단원·오늘의 목표를 짧게 적어 두면 미리보기 카드에 함께 보여요. 세부 지표·Live Activity 연동은
        이후 단계에서 맞출 예정입니다.
      </ThemedText>
      <View style={[styles.field, { backgroundColor: c.surfaceLowest }]}>
        <TextInput
          value={goalMemo}
          onChangeText={setGoalMemo}
          placeholder="예: 선형대수 3강 복습"
          placeholderTextColor={c.outline}
          style={[styles.input, { color: c.onSurface }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 22,
    gap: 12,
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3, textAlign: 'center' },
  body: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  field: {
    alignSelf: 'stretch',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  input: { fontSize: 16, fontWeight: '700', padding: 0 },
});
