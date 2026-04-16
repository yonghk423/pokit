import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import type { PlanMode } from '../lib/dayPlanEditorShared';
import { PRIMARY } from '../lib/dayPlanEditorShared';

type Props = {
  planMode: PlanMode;
  onSelectPriority: () => void;
  onSelectQuickMemo: () => void;
  c: DayPlanPalette;
  /** `null`이면 하단 설명 숨김 */
  description?: string | null;
};

export function PlanModeSwitch({
  planMode,
  onSelectPriority,
  onSelectQuickMemo,
  c,
  description,
}: Props) {
  const hint =
    description !== undefined
      ? description
      : planMode === 'quickMemo'
        ? '떠오른 할 일을 빠르게 기록하고 저장하면 라이브 액티비티로 반영됩니다.'
        : null;

  const isQuickMemo = planMode === 'quickMemo';
  const iconPriority = !isQuickMemo ? PRIMARY : c.onVariant;
  const iconQuickMemo = isQuickMemo ? PRIMARY : c.onVariant;

  return (
    <View style={styles.root}>
      {/* 풀폭: DayPlanPage에서 contentPad 밖에 두어 좌우 c.bg 띠 제거 */}
      <View style={styles.bleed}>
        <View style={[styles.row, { backgroundColor: c.containerLow, borderBottomColor: c.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="우선순위 기반"
          onPress={onSelectPriority}
          style={({ pressed }) => [styles.iconHit, pressed && { opacity: 0.75 }]}>
          <IconSymbol name="list.number" size={24} color={iconPriority} />
        </Pressable>

        <Switch
          value={isQuickMemo}
          onValueChange={(v) => (v ? onSelectQuickMemo() : onSelectPriority())}
          trackColor={{ false: c.trackOff, true: PRIMARY }}
          thumbColor={c.containerHigh}
          ios_backgroundColor={c.trackOff}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="빠른 메모"
          onPress={onSelectQuickMemo}
          style={({ pressed }) => [styles.iconHit, pressed && { opacity: 0.75 }]}>
          <IconSymbol name="note.text" size={24} color={iconQuickMemo} />
        </Pressable>
        </View>
      </View>
      {hint != null && hint !== '' ? (
        <ThemedText style={[styles.modeHint, { color: c.outline }]}>{hint}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: '100%',
  },
  bleed: {
    width: '100%',
    alignSelf: 'stretch',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    /** Switch·아이콘 행 높이 고정 — 모드/상태 전환 시 세로 점프 완화 */
    minHeight: 52,
  },
  iconHit: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeHint: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 24,
    marginTop: 8,
  },
});
