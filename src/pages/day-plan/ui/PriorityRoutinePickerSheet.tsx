import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveCategoryCatalogIcon } from '@entities/day-plan';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { AddablePriorityCatalogSection } from '../lib/priorityCatalog';

type Props = {
  visible: boolean;
  title: string;
  sections: AddablePriorityCatalogSection[];
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (keys: string[]) => void;
  onCreateCustom?: () => void;
};

/** 루틴 탭과 동일한 그룹 구조 — 담기·구간 연결용 다중 선택 시트 */
export function PriorityRoutinePickerSheet({
  visible,
  title,
  sections,
  isDark,
  ink,
  muted,
  surface,
  line,
  confirmLabel = '연결',
  onClose,
  onConfirm,
  onCreateCustom,
}: Props) {
  const insets = useSafeAreaInsets();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) setSelectedKeys(new Set());
  }, [visible]);

  const selectedCount = selectedKeys.size;

  const toggleSelection = useCallback((key: string) => {
    void Haptics.selectionAsync();
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedCount === 0) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm([...selectedKeys]);
    onClose();
  }, [onClose, onConfirm, selectedCount, selectedKeys]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.header, { borderBottomColor: line }]}>
          <ThemedText style={[styles.title, { color: ink }]}>{title}</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          {onCreateCustom ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="새로운 루틴 만들기"
              onPress={() => {
                onClose();
                onCreateCustom();
              }}
              style={({ pressed }) => [styles.createRow, pressed && { opacity: 0.72 }]}>
              <IconSymbol name="plus.circle.fill" size={20} color={ink} />
              <ThemedText style={[styles.rowLabel, { color: ink }]}>새로운 루틴 만들기</ThemedText>
            </Pressable>
          ) : null}
          {sections.map((section) => (
            <View key={section.groupKey}>
              <ThemedText style={[styles.sectionTitle, { color: muted }]}>{section.title}</ThemedText>
              {section.items.map((cat) => {
                const selected = selectedKeys.has(cat.key);
                return (
                  <Pressable
                    key={cat.key}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${cat.label} ${selected ? '선택됨' : '선택'}`}
                    onPress={() => toggleSelection(cat.key)}
                    style={({ pressed }) => [
                      styles.pickRow,
                      {
                        borderBottomColor: line,
                        backgroundColor: selected
                          ? isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.04)'
                          : 'transparent',
                      },
                      pressed && { opacity: 0.72 },
                    ]}>
                    <IconSymbol
                      name={resolveCategoryCatalogIcon(cat.key) as 'drop.fill'}
                      size={18}
                      color={activeIconColorByCategory(cat.key)}
                    />
                    <ThemedText style={[styles.rowLabel, { color: ink }]}>{cat.label}</ThemedText>
                    <IconSymbol
                      name={selected ? 'checkmark.circle.fill' : 'circle'}
                      size={18}
                      color={selected ? ink : muted}
                    />
                  </Pressable>
                );
              })}
            </View>
          ))}
          {sections.length === 0 ? (
            <ThemedText style={[styles.empty, { color: muted }]}>
              연결할 수 있는 루틴이 없어요. 위에서 새로운 루틴을 만들어 보세요.
            </ThemedText>
          ) : null}
        </ScrollView>
        <View
          style={[
            styles.footer,
            {
              borderTopColor: line,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: surface,
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selectedCount > 0 ? `${selectedCount}개 루틴 연결` : '루틴을 선택해 주세요'}
            disabled={selectedCount === 0}
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              {
                backgroundColor:
                  selectedCount > 0 ? ink : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                opacity: pressed && selectedCount > 0 ? 0.9 : 1,
              },
            ]}>
            <ThemedText
              style={[
                styles.confirmLabel,
                { color: selectedCount > 0 ? (isDark ? '#09090b' : '#fff') : muted },
              ]}>
              {selectedCount > 0 ? `${selectedCount}개 ${confirmLabel}` : '루틴을 선택해 주세요'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 12, paddingHorizontal: 20, gap: 2 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  empty: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    paddingVertical: 8,
  },
});
