import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

import type { DayPlanPalette } from '../lib/dayPlanPalette';
import type { PlanMode } from '../lib/dayPlanEditorShared';
import { PRIMARY } from '../lib/dayPlanEditorShared';

type Props = {
  planMode: PlanMode;
  onSelectTime: () => void;
  onSelectPriority: () => void;
  c: DayPlanPalette;
};

export function PlanModeSwitch({ planMode, onSelectTime, onSelectPriority, c }: Props) {
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
            우선순위 기반
          </ThemedText>
        </Pressable>
      </View>
      <ThemedText style={[styles.modeHint, { color: c.outline }]}>
        {planMode === 'time'
          ? '카테고리별로 시간 구간을 나눠 타임라인에 쌓습니다.'
          : '한 시간대 안에서 할 일을 순서대로 정리합니다.'}
      </ThemedText>
    </>
  );
}

const styles = StyleSheet.create({
  modeSwitch: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 6,
    alignSelf: 'center',
    gap: 4,
  },
  modeSwitchBtn: {
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
  },
  modeSwitchShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  modeSwitchText: { fontSize: 14, fontWeight: '600' },
  modeSwitchTextActive: { fontWeight: '800' },
  modeHint: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8, marginTop: -4 },
});
