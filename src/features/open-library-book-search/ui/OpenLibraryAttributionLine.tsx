import { StyleSheet } from 'react-native';

import { OPEN_LIBRARY_ATTRIBUTION_LABEL } from '@shared/config/openLibrary';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  color?: string;
  compact?: boolean;
};

export function OpenLibraryAttributionLine({ color = '#6b7280', compact = false }: Props) {
  return (
    <ThemedText
      style={[styles.label, compact && styles.compact, { color }]}
      lightColor={color}
      darkColor={color}>
      {OPEN_LIBRARY_ATTRIBUTION_LABEL}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '500',
  },
  compact: {
    fontSize: 10,
    lineHeight: 14,
  },
});
