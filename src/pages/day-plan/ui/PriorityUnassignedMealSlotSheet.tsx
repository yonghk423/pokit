import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveCategoryCatalogIcon } from '@entities/day-plan';
import {
  DAY_MEAL_SLOT_LABEL,
  DAY_MEAL_SLOT_ORDER,
  type DayMealSlot,
} from '@shared/lib/storage';
import { PrimaryColor } from '@shared/config/theme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

export type UnassignedMealSlotItem = {
  key: string;
  label: string;
};

type Props = {
  visible: boolean;
  items: UnassignedMealSlotItem[];
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
  onConfirm: (assignments: Record<string, DayMealSlot>) => void;
};

/** 시간대 미지정 플로우 — 구간 선택 후 시간대별 보기 활성화 */
export function PriorityUnassignedMealSlotSheet({
  visible,
  items,
  isDark,
  ink,
  muted,
  surface,
  line,
  onClose,
  onConfirm,
}: Props) {
  const insets = useSafeAreaInsets();
  const [slotByKey, setSlotByKey] = useState<Record<string, DayMealSlot | undefined>>({});

  useEffect(() => {
    if (!visible) return;
    setSlotByKey({});
  }, [visible, items]);

  const allAssigned = useMemo(
    () => items.length > 0 && items.every((item) => slotByKey[item.key] != null),
    [items, slotByKey],
  );

  const selectSlot = useCallback((key: string, slot: DayMealSlot) => {
    void Haptics.selectionAsync();
    setSlotByKey((prev) => ({ ...prev, [key]: slot }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (!allAssigned) return;
    const assignments: Record<string, DayMealSlot> = {};
    for (const item of items) {
      const slot = slotByKey[item.key];
      if (slot) assignments[item.key] = slot;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(assignments);
    onClose();
  }, [allAssigned, items, onClose, onConfirm, slotByKey]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          <View style={styles.headerText}>
            <ThemedText style={[styles.title, { color: ink }]}>시간대 지정</ThemedText>
            <ThemedText style={[styles.subtitle, { color: muted }]}>
              아직 구간이 정해지지 않은 플로우 {items.length}개가 있어요. 새벽·아침·점심·저녁·밤 중
              하나를 골라 주세요.
            </ThemedText>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {items.map((item) => {
            const selected = slotByKey[item.key];
            return (
              <View key={item.key} style={[styles.itemCard, { borderColor: line }]}>
                <View style={styles.itemHead}>
                  <IconSymbol
                    name={resolveCategoryCatalogIcon(item.key) as 'drop.fill'}
                    size={18}
                    color={activeIconColorByCategory(item.key)}
                  />
                  <ThemedText style={[styles.itemLabel, { color: ink }]} numberOfLines={1}>
                    {item.label}
                  </ThemedText>
                </View>
                <View style={styles.slotRow}>
                  {DAY_MEAL_SLOT_ORDER.map((slot) => {
                    const active = selected === slot;
                    return (
                      <Pressable
                        key={slot}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${item.label} ${DAY_MEAL_SLOT_LABEL[slot]}`}
                        onPress={() => selectSlot(item.key, slot)}
                        style={({ pressed }) => [
                          styles.slotChip,
                          {
                            borderColor: active ? PrimaryColor.rgb : line,
                            backgroundColor: active
                              ? isDark
                                ? 'rgba(255,255,255,0.12)'
                                : 'rgba(0,0,0,0.06)'
                              : 'transparent',
                          },
                          pressed && styles.pressed,
                        ]}>
                        <ThemedText
                          style={[
                            styles.slotChipLabel,
                            { color: active ? ink : muted },
                          ]}>
                          {DAY_MEAL_SLOT_LABEL[slot]}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: line, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="시간대별 보기 활성화"
            disabled={!allAssigned}
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              {
                backgroundColor: allAssigned ? PrimaryColor.rgb : isDark ? '#3f3f46' : '#d4d4d8',
              },
              pressed && allAssigned && styles.pressed,
            ]}>
            <ThemedText style={styles.confirmLabel}>지정 완료</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  itemCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 0,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  itemHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  slotChip: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 0,
    borderWidth: 2,
  },
  slotChipLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    minHeight: 48,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FAFAFA',
  },
  pressed: {
    opacity: 0.82,
  },
});
