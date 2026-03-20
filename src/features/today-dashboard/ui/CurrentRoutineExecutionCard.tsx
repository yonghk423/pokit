import { StyleSheet, View } from 'react-native';

import { getRoutineExecutionProgressPercent } from '@entities/routine-execution';
import type { Routine } from '@entities/routine';
import type { RoutineExecution } from '@entities/routine-execution';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

type Props = {
  execution: RoutineExecution;
  routine: Routine;
};

export function CurrentRoutineExecutionCard({ execution, routine }: Props) {
  const progress = getRoutineExecutionProgressPercent(execution, routine);

  return (
    <ThemedView style={styles.card}>
      <View style={styles.headerRow}>
        <ThemedText type="subtitle">{routine.title}</ThemedText>
        <ThemedText type="defaultSemiBold">{progress}%</ThemedText>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <ThemedText style={styles.meta}>
        {execution.endTime ? '완료됨' : '진행 중'}
        {' · '}
        {routine.defaultTasks.length}개 태스크
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(120,120,120,0.18)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(0,122,255,0.9)',
  },
  meta: {
    opacity: 0.7,
  },
});

