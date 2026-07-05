import { StyleSheet } from 'react-native';

import { ALADIN_ATTRIBUTION_LABEL } from '@shared/config/aladin';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  color?: string;
  compact?: boolean;
};

export function AladinAttributionLine({ color = '#6b7280', compact = false }: Props) {
  return (
    <ThemedText
      style={[styles.line, compact ? styles.compact : null, { color }]}
      lightColor={color}
      darkColor={color}>
      {ALADIN_ATTRIBUTION_LABEL}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  line: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  compact: {
    fontSize: 10,
    lineHeight: 14,
  },
});
