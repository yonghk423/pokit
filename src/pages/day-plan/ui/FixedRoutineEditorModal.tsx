import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { PICKER_CATEGORIES, PRIMARY } from '../lib/dayPlanEditorShared';
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
  const catalogCategories = useMemo(
    () => filterCatalogPickerCategories(PICKER_CATEGORIES),
    [],
  );
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
    setDraft((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const border = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)';
  const btnGhostBorder = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.18)';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: surface, paddingTop: insets.top + 8 }]}>
        <View style={[styles.sheetHeader, { borderBottomColor: border }]}>
          <ThemedText style={[styles.sheetTitle, { color: ink }]}>내 고정 루틴</ThemedText>
          <ThemedText style={[styles.sheetLead, { color: muted }]}>
            담기 탭 위쪽에 모아 둘 항목을 고르세요. 고정 순서는 왼쪽 줄을 길게 누른 뒤 위아래로 끌어 바꿀 수 있어요. 비워 두면 아래는 건강·몸 관리(수분·약·체중·스트레칭·자세 등)와 생산성 도구로만 나뉘어 보여요.
          </ThemedText>
        </View>

        <ScrollView
          style={styles.scroll}
          scrollEnabled={!fixedOrderDragging}
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom, paddingHorizontal: 20, gap: 20 }}
          keyboardShouldPersistTaps="handled">
          <View style={styles.block}>
            <ThemedText style={[styles.blockTitle, { color: ink }]}>고정 순서</ThemedText>
            {draft.length === 0 ? (
              <ThemedText style={[styles.emptyLine, { color: muted }]}>아직 없어요. 아래에서 항목을 추가해 주세요.</ThemedText>
            ) : (
              <FixedRoutineDraftOrderList
                orderedKeys={draft}
                byKey={byKey}
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
              <View style={{ borderTopWidth: 1, borderTopColor: line }}>
                {addable.map((cat) => (
                  <Pressable
                    key={cat.key}
                    accessibilityRole="button"
                    accessibilityLabel={`${cat.label} 고정 루틴에 추가`}
                    onPress={() => onAdd(cat.key)}
                    style={[styles.addRow, { borderBottomColor: line }]}>
                    <IconSymbol name={cat.icon as any} size={20} color={muted} />
                    <ThemedText style={[styles.orderLabel, { color: ink }]} numberOfLines={1}>
                      {cat.label}
                    </ThemedText>
                    <IconSymbol name="plus.circle.fill" size={22} color={PRIMARY} />
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
            onPress={onClose}
            style={[styles.footerBtn, { borderColor: btnGhostBorder }]}>
            <ThemedText style={[styles.footerBtnText, { color: ink }]}>취소</ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="저장"
            onPress={() => {
              onSave(draft);
              onClose();
            }}
            style={[styles.footerBtnPrimary, { backgroundColor: PRIMARY }]}>
            <ThemedText style={styles.footerBtnTextPrimary}>저장</ThemedText>
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
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  footerBtnPrimary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  footerBtnText: { fontSize: 16, fontWeight: '700' },
  footerBtnTextPrimary: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
