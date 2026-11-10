import { memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';

export const HeroCalendarApplyButton = memo(function HeroCalendarApplyButton({ selected, busy, error, dark, title, onPress }: { selected: boolean; busy: boolean; error: boolean; dark: boolean; title: string; onPress: () => void }) {
  const label = busy ? '적용 중…' : error ? '다시 적용하기' : selected ? '적용 중 ✓' : '이 캘린더 적용하기 →';
  return <Pressable testID="calendar-apply-button" accessibilityRole="button" accessibilityLabel={title + ' · ' + label} accessibilityState={{ selected, disabled: busy || selected, busy }} disabled={busy || selected} onPress={onPress} style={[styles.button, { backgroundColor: selected ? '#E5B777' : dark ? '#493C30' : '#EBD3B2' }]}>
    <ThemedText numberOfLines={1} style={styles.label}>{label}</ThemedText>
  </Pressable>;
});

const styles = StyleSheet.create({
  button: { marginTop: 10, height: 44, borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  label: { color: '#4A2F1D', fontSize: 14, lineHeight: 28, textAlign: 'center' },
});
