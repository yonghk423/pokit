import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

type Props = ViewProps & {
  title?: string;
  onPressBrand?: () => void;
};

export function TopAppBar({ title = 'POKIT', onPressBrand, style, ...rest }: Props) {
  return (
    <ThemedView style={[styles.root, style]} {...rest}>
      <Pressable
        accessibilityRole={onPressBrand ? 'button' : undefined}
        onPress={onPressBrand}
        style={styles.brand}>
        <IconSymbol name="lock.open" size={22} color="rgba(0,0,0,0.9)" />
        <ThemedText type="defaultSemiBold" style={styles.brandText}>
          {title}
        </ThemedText>
      </Pressable>

      <View style={styles.right} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 56,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandText: {
    color: 'rgba(0,0,0,0.9)',
    fontSize: 18,
    letterSpacing: -0.4,
  },
  right: {
    minWidth: 32,
  },
});

