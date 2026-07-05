import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  timeLabel?: string;
  startDateLabel?: string;
  muted: string;
};

export function FlowHistoryMetaLine({ timeLabel, startDateLabel, muted }: Props) {
  if (!timeLabel && !startDateLabel) return null;

  return (
    <View style={styles.metaLine}>
      {timeLabel ? (
        <>
          <MaterialIcons name="schedule" size={10} color={muted} />
          <ThemedText style={[styles.metaText, { color: muted }]} numberOfLines={1}>
            {timeLabel}
          </ThemedText>
        </>
      ) : null}
      {timeLabel && startDateLabel ? (
        <ThemedText style={[styles.metaText, { color: muted }]}>·</ThemedText>
      ) : null}
      {startDateLabel ? (
        <ThemedText style={[styles.metaText, { color: muted }]} numberOfLines={1}>
          시작 {startDateLabel}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexWrap: 'wrap',
  },
  metaText: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
});
