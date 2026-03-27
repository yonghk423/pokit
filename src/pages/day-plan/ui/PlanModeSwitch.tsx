import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import type { PlanMode } from '../lib/dayPlanEditorShared';
import { PRIMARY } from '../lib/dayPlanEditorShared';

type Props = {
  planMode: PlanMode;
  onSelectTime: () => void;
  onSelectPriority: () => void;
  onSelectQuickMemo: () => void;
  c: DayPlanPalette;
};

export function PlanModeSwitch({
  planMode,
  onSelectTime,
  onSelectPriority,
  onSelectQuickMemo,
  c,
}: Props) {
  return (
    <>
      <View style={[styles.modeSwitch, { backgroundColor: c.containerLow }]}>
        <Pressable
          onPress={onSelectTime}
          style={[
            styles.modeSwitchBtn,
            planMode === 'time' && { backgroundColor: c.containerLowest, ...styles.modeSwitchShadow },
          ]}>
          <ThemedText
            style={[
              styles.modeSwitchText,
              { color: planMode === 'time' ? PRIMARY : c.onVariant },
              planMode === 'time' && styles.modeSwitchTextActive,
            ]}>
            시간 기반
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onSelectPriority}
          style={[
            styles.modeSwitchBtn,
            planMode === 'priority' && {
              backgroundColor: c.containerLowest,
              ...styles.modeSwitchShadow,
            },
          ]}>
          <ThemedText
            style={[
              styles.modeSwitchText,
              { color: planMode === 'priority' ? PRIMARY : c.onVariant },
              planMode === 'priority' && styles.modeSwitchTextActive,
            ]}>
            우선순위
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={onSelectQuickMemo}
          style={[
            styles.modeSwitchBtn,
            planMode === 'quickMemo' && {
              backgroundColor: c.containerLowest,
              ...styles.modeSwitchShadow,
            },
          ]}>
          <ThemedText
            style={[
              styles.modeSwitchText,
              { color: planMode === 'quickMemo' ? PRIMARY : c.onVariant },
              planMode === 'quickMemo' && styles.modeSwitchTextActive,
            ]}>
            빠른 메모
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText style={[styles.modeHint, { color: c.outline }]}>
        {planMode === 'time'
          ? '카테고리별로 시간 구간을 나눠 타임라인에 쌓습니다.'
          : planMode === 'priority'
            ? '한 시간대 안에서 할 일을 순서대로 정리합니다.'
            : '떠오른 할 일을 빠르게 기록하고 저장하면 라이브 액티비티로 반영됩니다.'}
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 6,
    alignSelf: 'stretch',
    gap: 4,
  },
  modeSwitchBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeSwitchShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modeSwitchText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
  modeSwitchTextActive: { fontWeight: '800' },
  modeHint: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8, marginTop: -4 },
});
