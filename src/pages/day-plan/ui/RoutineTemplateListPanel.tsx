import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  listCustomFlowTemplateCatalogEntries,
  type CustomFlowTemplateKey,
} from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
  onPressTemplate: (templateKey: CustomFlowTemplateKey) => void;
};

export function RoutineTemplateListPanel({
  ink,
  muted,
  line,
  cardBg,
  onPressTemplate,
}: Props) {
  const entries = useMemo(() => listCustomFlowTemplateCatalogEntries(), []);

  return (
    <View style={styles.root}>
      {entries.map((entry) => (
        <Pressable
          key={entry.key}
          accessibilityRole="button"
          accessibilityLabel={`${entry.label} — ${entry.description}, 자세히 보기`}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPressTemplate(entry.key);
          }}
          style={({ pressed }) => [
            styles.card,
            { borderColor: line, backgroundColor: cardBg, opacity: pressed ? 0.9 : 1 },
          ]}>
          <View style={[styles.iconBox, { borderColor: line }]}>
            <IconSymbol name={entry.icon} size={16} color={ink} />
          </View>
          <View style={styles.cardText}>
            <ThemedText style={[styles.title, { color: ink }]}>{entry.label}</ThemedText>
            <ThemedText style={[styles.desc, { color: muted }]}>{entry.description}</ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={14} color={muted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 10,
  },
  card: {
    borderWidth: 2,
    borderRadius: 0,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderWidth: 2,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  desc: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 18,
  },
});
