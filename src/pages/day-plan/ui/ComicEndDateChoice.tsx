import { Pressable, StyleSheet, View } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';

/** Separate pencil-framed paper slips, matching the comic time fields. */
export function ComicEndDateChoice({ value, onChange, options }: {
  value: 'today' | 'nextDay';
  onChange: (value: 'today' | 'nextDay') => void;
  options: { value: 'today' | 'nextDay'; label: string; accessibilityLabel: string }[];
}) {
  return <View style={styles.row}>{options.map((option, index) => {
    const selected = option.value === value;
    return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={option.accessibilityLabel} onPress={() => { tapHaptic('select'); onChange(option.value); }} style={[styles.slip, { transform: [{ rotate: index === 0 ? '-0.6deg' : '0.5deg' }] }, selected && styles.selected]}>
      <PaperGrain opacity={0.3} />
      <HanddrawnFrame color={selected ? '#82775E' : '#9A9B91'} bold={selected} />
      <ThemedText style={[styles.label, !selected && styles.muted]}>{option.label}</ThemedText>
    </Pressable>;
  })}</View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, width: '100%', padding: 3 },
  slip: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAF9F4' },
  selected: { backgroundColor: '#F1E8D5' },
  label: { fontSize: 15, lineHeight: 22, color: '#34362F', textAlign: 'center' },
  muted: { color: '#787A72' },
});
