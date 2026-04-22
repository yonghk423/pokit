import type { ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View } from 'react-native';

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
  /** 상단 행 오른쪽(문의 등) — 좌측 모드 버튼과 동일 베이스라인 */
  trailing?: ReactNode;
};

export function PlanModeSwitch({
  planMode,
  onSelectPriority,
  onSelectQuickMemo,
  c,
  description,
  trailing,
}: Props) {
  const hint =
    description !== undefined
      ? description
      : planMode === 'quickMemo'
        ? '떠오른 할 일을 빠르게 기록하고 저장하면 라이브 액티비티로 반영됩니다.'
        : null;

  const isQuickMemo = planMode === 'quickMemo';
  const isPriority = !isQuickMemo;
  const iconPriority = !isQuickMemo ? PRIMARY : c.onVariant;
  const iconQuickMemo = isQuickMemo ? PRIMARY : c.onVariant;

  return (
    <View style={styles.root}>
      {/* 풀폭: DayPlanPage에서 contentPad 밖에 두어 좌우 c.bg 띠 제거 */}
      <View style={styles.bleed}>
        <View
          style={[
            styles.row,
            { backgroundColor: c.containerLow, borderBottomColor: c.border },
            trailing ? styles.rowWithTrailing : null,
          ]}>
          <View style={styles.leftButtonGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="우선순위 기반"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectPriority();
              }}
              style={({ pressed }) => [
                styles.iconHit,
                {
                  backgroundColor: isPriority ? 'rgba(0,0,0,0.07)' : c.containerLowest,
                  borderColor: isPriority ? PRIMARY : c.border,
                },
                pressed && styles.iconPressed,
              ]}>
              <IconSymbol name="list.number" size={20} color={iconPriority} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="빠른 메모"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectQuickMemo();
              }}
              style={({ pressed }) => [
                styles.iconHit,
                {
                  backgroundColor: isQuickMemo ? 'rgba(0,0,0,0.07)' : c.containerLowest,
                  borderColor: isQuickMemo ? PRIMARY : c.border,
                },
                pressed && styles.iconPressed,
              ]}>
              <IconSymbol name="note.text" size={20} color={iconQuickMemo} />
            </Pressable>
          </View>
          {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
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
    justifyContent: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    /** 상단 모드 아이콘 행 — 과한 세로 여백 없이 터치 영역만 유지 */
    minHeight: 40,
  },
  rowWithTrailing: {
    justifyContent: 'space-between',
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconHit: {
    minWidth: 46,
    minHeight: 34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPressed: {
    opacity: 0.72,
  },
  modeHint: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 24,
    marginTop: 6,
  },
});
