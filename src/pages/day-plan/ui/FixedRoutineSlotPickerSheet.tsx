import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DAY_MEAL_SLOT_LABEL,
  DAY_MEAL_SLOT_ORDER,
  type DayMealSlot,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

type Props = {
  visible: boolean;
  title: string;
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
  onSelect: (slot: DayMealSlot) => void;
};

export function FixedRoutineSlotPickerSheet({
  visible,
  title,
  isDark,
  ink,
  muted,
  surface,
  line,
  onClose,
  onSelect,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          <ThemedText style={[styles.title, { color: ink }]}>{title}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16), paddingHorizontal: 20 }}>
          {DAY_MEAL_SLOT_ORDER.map((slot) => (
            <Pressable
              key={slot}
              accessibilityRole="button"
              accessibilityLabel={`${DAY_MEAL_SLOT_LABEL[slot]} 구간`}
              onPress={() => onSelect(slot)}
              style={({ pressed }) => [
                styles.row,
                { borderBottomColor: line },
                pressed && { opacity: 0.72 },
              ]}>
              <ThemedText style={[styles.rowLabel, { color: ink }]}>{DAY_MEAL_SLOT_LABEL[slot]}</ThemedText>
              <IconSymbol name="chevron.right" size={14} color={muted} />
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginRight: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
});
