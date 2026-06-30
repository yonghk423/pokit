import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resolveCategoryCatalogIcon } from '@entities/day-plan';
import { listAllCustomFlowCatalogEntries } from '@shared/lib/storage';
import { tabPillColors } from '@shared/lib/ui/tabPillColors';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { getPickerCategoryItem, getPickerCategoryLabel, PICKER_CATEGORIES } from '../lib/dayPlanEditorShared';
import { filterCatalogPickerCategories } from '../lib/priorityCatalogSections';
import { FixedRoutineDraftOrderList } from './FixedRoutineDraftOrderList';

type Props = {
  visible: boolean;
  onClose: () => void;
  initialKeys: string[];
  onSave: (next: string[]) => void;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  surface: string;
};

export function FixedRoutineEditorModal({
  visible,
  onClose,
  initialKeys,
  onSave,
  isDark,
  ink,
  muted,
  line,
  surface,
}: Props) {
  const insets = useSafeAreaInsets();
  const tabColors = useMemo(() => tabPillColors(isDark), [isDark]);
  const [catalogLabelTick, setCatalogLabelTick] = useState(0);
  useEffect(() => {
    if (visible) setCatalogLabelTick((n) => n + 1);
  }, [visible]);

  const catalogCategories = useMemo(() => {
    void catalogLabelTick;
    const base = filterCatalogPickerCategories(PICKER_CATEGORIES);
    const customs = listAllCustomFlowCatalogEntries().map((entry) => {
      const item = getPickerCategoryItem(entry.id);
      return {
        key: entry.id,
        label: getPickerCategoryLabel(entry.id),
        icon: (item?.icon ?? 'person.fill') as typeof PICKER_CATEGORIES[number]['icon'],
      };
    });
    return [...base, ...customs];
  }, [catalogLabelTick]);
  const catalogCategoryKeySet = useMemo(
    () => new Set(catalogCategories.map((c) => c.key)),
    [catalogCategories],
  );
  const [draft, setDraft] = useState<string[]>([]);
  const [fixedOrderDragging, setFixedOrderDragging] = useState(false);

  useEffect(() => {
    if (visible) setDraft(initialKeys.filter((k) => catalogCategoryKeySet.has(k)));
  }, [visible, initialKeys, catalogCategoryKeySet]);

  const byKey = useMemo(() => new Map(catalogCategories.map((c) => [c.key, c])), [catalogCategories]);
  const addable = useMemo(
    () => catalogCategories.filter((c) => !draft.includes(c.key)),
    [catalogCategories, draft],
  );

  const onRemove = useCallback((key: string) => {
    setDraft((prev) => prev.filter((k) => k !== key));
  }, []);

  const onAdd = useCallback((key: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraft((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const border = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: surface, paddingTop: insets.top + 8 }]}>
        <View style={[styles.sheetHeader, { borderBottomColor: border }]}>
          <ThemedText style={[styles.sheetTitle, { color: ink }]}>나만의 루틴</ThemedText>
          <ThemedText style={[styles.sheetLead, { color: muted }]}>
            담기 탭 위쪽에 모아 둘 항목을 고르세요. 순서는 왼쪽 줄을 길게 누른 뒤 위아래로 끌어 바꿀 수 있어요. 비워 두면 아래는 건강·몸 관리(수분·약·체중·스트레칭·자세 등)와 생산성 도구로만 나뉘어 보여요.
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scroll}
          scrollEnabled={!fixedOrderDragging}
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom, paddingHorizontal: 20, gap: 20 }}
          keyboardShouldPersistTaps="handled">
          <View style={styles.block}>
            <ThemedText style={[styles.blockTitle, { color: ink }]}>이 세트에 넣은 순서</ThemedText>
            {draft.length === 0 ? (
              <ThemedText style={[styles.emptyLine, { color: muted }]}>아직 없어요. 아래에서 항목을 추가해 주세요.</ThemedText>
            ) : (
              <FixedRoutineDraftOrderList
                orderedKeys={draft}
                byKey={byKey}
                isDark={isDark}
                ink={ink}
                muted={muted}
                line={line}
                surface={surface}
                onReorder={setDraft}
                onRemove={onRemove}
                onDragActiveChange={setFixedOrderDragging}
              />
            )}
          </View>

          <View style={styles.block}>
            <ThemedText style={[styles.blockTitle, { color: ink }]}>추가할 항목</ThemedText>
            {addable.length === 0 ? (
              <ThemedText style={[styles.emptyLine, { color: muted }]}>추가할 수 있는 항목이 없어요.</ThemedText>
            ) : (
              <View style={styles.addableList}>
                {addable.map((cat) => (
                  <Pressable
                    key={cat.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.label} 나만의 루틴 세트에 추가`}
                    onPress={() => onAdd(cat.key)}
                    style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.72 }]}
                    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}>
                    <IconSymbol
                      name={resolveCategoryCatalogIcon(cat.key) as any}
                      size={20}
                      color={activeIconColorByCategory(cat.key)}
                    />
                    <ThemedText style={[styles.orderLabel, { color: ink }]} numberOfLines={1}>
                      {cat.label}
                    </ThemedText>
                    <View
                      style={[
                        styles.rowTrailingIconPill,
                        {
                          backgroundColor: tabColors.inactiveBg,
                          borderColor: tabColors.inactiveBorder,
                        },
                      ]}
                      pointerEvents="none">
                      <IconSymbol name="plus" size={16} color={tabColors.inactiveIcon} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        <View
          style={[
            styles.footer,
            {
              borderTopColor: border,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: surface,
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="취소"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            style={({ pressed }) => [
              styles.footerTabPill,
              {
                backgroundColor: tabColors.inactiveBg,
                borderColor: tabColors.inactiveBorder,
                opacity: pressed ? 0.92 : 1,
              },
            ]}>
            <ThemedText style={[styles.footerTabLabel, { color: tabColors.inactiveIcon }]}>
              취소
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="저장"
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSave(draft);
              onClose();
            }}
            style={({ pressed }) => [
              styles.footerTabPill,
              {
                backgroundColor: tabColors.activeBg,
                borderColor: tabColors.activeBorder,
                opacity: pressed ? 0.92 : 1,
              },
            ]}>
            <ThemedText style={[styles.footerTabLabel, { color: tabColors.activeIcon }]}>
              저장
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 8,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.35 },
  sheetLead: { fontSize: 14, fontWeight: '500', lineHeight: 20, letterSpacing: -0.2 },
  scroll: { flex: 1 },
  block: { gap: 10 },
  blockTitle: { fontSize: 13, fontWeight: '800', letterSpacing: -0.2 },
  emptyLine: { fontSize: 14, fontWeight: '500', lineHeight: 20 },
  orderLabel: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  addableList: {
    paddingTop: 6,
    gap: 12,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 12,
  },
  rowTrailingIconPill: {
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** `DayPlanCustomTabBar` 의 `row` + `tabPill` 과 동일 간격·치수 */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  footerTabPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  footerTabLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
