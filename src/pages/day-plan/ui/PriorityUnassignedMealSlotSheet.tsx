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
  /** 시트에 표시 중인 항목의 기존 구간 지정 — 부분 지정 상태에서 재편집용 */
  initialAssignments?: Record<string, DayMealSlot[]>;
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
  onConfirm: (assignments: Record<string, DayMealSlot[]>) => void;
  /** 연동 방식 설정 시트로 이동 */
  onChangeLinkMode?: () => void;
};

/** 시간대 미지정 플로우 — 구간 선택 후 시간대별 보기 활성화 */
export function PriorityUnassignedMealSlotSheet({
  visible,
  items,
  initialAssignments,
  isDark,
  ink,
  muted,
  surface,
  line,
  onClose,
  onConfirm,
  onChangeLinkMode,
}: Props) {
  const insets = useSafeAreaInsets();
  const [slotsByKey, setSlotsByKey] = useState<Record<string, DayMealSlot[]>>({});
  const itemKeySignature = useMemo(() => items.map((item) => item.key).join('\n'), [items]);
  const initialAssignmentSignature = useMemo(
    () =>
      items
        .map((item) => `${item.key}:${(initialAssignments?.[item.key] ?? []).join(',')}`)
        .join('|'),
    [initialAssignments, items],
  );

  useEffect(() => {
    if (!visible) return;
    const next: Record<string, DayMealSlot[]> = {};
    for (const item of items) {
      const existing = initialAssignments?.[item.key];
      if (existing?.length) next[item.key] = [...existing];
    }
    setSlotsByKey(next);
  }, [visible, itemKeySignature, initialAssignmentSignature, initialAssignments, items]);

  const allAssigned = useMemo(
    () => items.length > 0 && items.every((item) => (slotsByKey[item.key]?.length ?? 0) > 0),
    [items, slotsByKey],
  );

  /** 시트 배경(surface)과 구분 — 투두 표·타임라인 카드와 같은 톤 */
  const itemCardBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.72)';

  const toggleSlot = useCallback((key: string, slot: DayMealSlot) => {
    void Haptics.selectionAsync();
    setSlotsByKey((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(slot)
        ? current.filter((item) => item !== slot)
        : [...current, slot];
      return { ...prev, [key]: next };
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!allAssigned) return;
    const assignments: Record<string, DayMealSlot[]> = {};
    for (const item of items) {
      const slots = slotsByKey[item.key];
      if (slots && slots.length > 0) assignments[item.key] = slots;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm(assignments);
  }, [allAssigned, items, onConfirm, slotsByKey]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          <View style={styles.headerText}>
            <ThemedText style={[styles.title, { color: ink }]}>시간대 지정</ThemedText>
            <ThemedText style={[styles.subtitle, { color: muted }]}>
              아직 구간이 정해지지 않은 루틴 {items.length}개가 있어요. 해당하는 시간대를 모두 골라
              주세요.
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
            const selected = slotsByKey[item.key] ?? [];
            return (
              <View
                key={item.key}
                style={[styles.itemCard, { borderColor: line, backgroundColor: itemCardBg }]}>
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
                    const active = selected.includes(slot);
                    return (
                      <Pressable
                        key={slot}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${item.label} ${DAY_MEAL_SLOT_LABEL[slot]}`}
                        onPress={() => toggleSlot(item.key, slot)}
                        style={({ pressed }) => [
                          styles.slotChip,
                          {
                            borderColor: active ? PrimaryColor.rgb : line,
                            backgroundColor: active
                              ? isDark
                                ? 'rgba(255,255,255,0.16)'
                                : 'rgba(0,0,0,0.06)'
                              : isDark
                                ? 'rgba(255,255,255,0.04)'
                                : 'rgba(255,255,255,0.9)',
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
          {onChangeLinkMode ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="연동 방식 다시 선택"
              onPress={onChangeLinkMode}
              style={({ pressed }) => [
                styles.secondaryBtn,
                { borderColor: line },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={[styles.secondaryLabel, { color: muted }]}>연동 방식 다시 선택</ThemedText>
            </Pressable>
          ) : null}
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
    gap: 8,
  },
  secondaryBtn: {
    minHeight: 44,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLabel: {
    fontSize: 14,
    fontWeight: '700',
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
