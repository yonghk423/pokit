import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  createCustomFlowCategoryId,
  getInitialOtherDataConfig,
  SYSTEM_CATALOG_GROUP_LABEL_KO,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  appendCustomFlowCatalogEntry,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
  type FixedFlowSet,
  type FixedFlowSetItem,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { getPickerCategoryLabel } from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { buildPriorityCatalogRows, type PriorityCatalogRow } from '../lib/priorityCatalog';
import { defaultSystemGroupForCatalogKey } from '../lib/priorityCatalogSections';
import { CreateCustomFlowSheet } from './CreateCustomFlowSheet';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function categoryTagLabel(key: string, isCustom: boolean): string {
  if (isCustom) return '나만의';
  const group = defaultSystemGroupForCatalogKey(key);
  return SYSTEM_CATALOG_GROUP_LABEL_KO[group];
}

type FlowCardProps = {
  item: FixedFlowSetItem;
  catalog: PriorityCatalogRow | undefined;
  setName: string;
  isDark: boolean;
  ink: string;
  muted: string;
  cardBg: string;
  iconBoxBg: string;
  onToggleEnabled: (enabled: boolean) => void;
};

function FlowItemCard({
  item,
  catalog,
  setName,
  isDark,
  ink,
  muted,
  cardBg,
  iconBoxBg,
  onToggleEnabled,
}: FlowCardProps) {
  const label = catalog?.label ?? getPickerCategoryLabel(item.categoryKey);
  const icon = catalog?.icon ?? 'person.fill';
  const enabled = item.enabled !== false;
  const trackOff = isDark ? '#3f3f46' : '#e5e7eb';
  const categoryLabel = categoryTagLabel(item.categoryKey, catalog?.isCustom ?? false);

  return (
    <View
      style={[
        styles.flowCard,
        {
          backgroundColor: cardBg,
          opacity: enabled ? 1 : 0.55,
        },
      ]}>
      <View style={styles.flowCardTopRow}>
        <View style={[styles.flowIconBox, { backgroundColor: iconBoxBg }]}>
          <IconSymbol name={icon as any} size={22} color={ink} />
        </View>
        <View style={styles.flowCardTitleCol}>
          <ThemedText style={[styles.flowCardTitle, { color: ink }]} numberOfLines={1}>
            {label}
          </ThemedText>
          <ThemedText style={[styles.flowCardDesc, { color: muted }]} numberOfLines={2}>
            {enabled ? '오늘 일정 자동 보강에 포함' : '꺼 두면 오늘 자동 보강에서 제외'}
          </ThemedText>
        </View>
        <Switch
          accessibilityLabel={`${label} ${enabled ? '켜짐' : '꺼짐'}`}
          value={enabled}
          onValueChange={(next) => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggleEnabled(next);
          }}
          trackColor={{ false: trackOff, true: '#000000' }}
          thumbColor="#FFFFFF"
          ios_backgroundColor={trackOff}
        />
      </View>
      <View style={styles.tagRow}>
        <View style={[styles.tagPrimary, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
          <ThemedText style={[styles.tagPrimaryText, { color: ink }]} numberOfLines={1}>
            {setName}
          </ThemedText>
        </View>
        <View style={[styles.tagSecondary, { backgroundColor: iconBoxBg }]}>
          <ThemedText style={[styles.tagSecondaryText, { color: muted }]} numberOfLines={1}>
            {categoryLabel}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

type AddItemModalProps = {
  visible: boolean;
  addable: PriorityCatalogRow[];
  isDark: boolean;
  ink: string;
  muted: string;
  surface: string;
  line: string;
  onClose: () => void;
  onPick: (key: string) => void;
  onCreateCustom: () => void;
};

function AddItemModal({
  visible,
  addable,
  isDark,
  ink,
  muted,
  surface,
  line,
  onClose,
  onPick,
  onCreateCustom,
}: AddItemModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalSheet, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.modalHeader, { borderBottomColor: line }]}>
          <ThemedText style={[styles.modalTitle, { color: ink }]}>항목 추가</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom, paddingHorizontal: 20, gap: 4 }}
          keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="내 플로우 만들기"
            onPress={() => {
              onClose();
              onCreateCustom();
            }}
            style={({ pressed }) => [styles.modalCreateRow, pressed && { opacity: 0.72 }]}>
            <IconSymbol name="plus.circle.fill" size={22} color={ink} />
            <ThemedText style={[styles.modalRowLabel, { color: ink }]}>내 플로우 만들기</ThemedText>
          </Pressable>
          {addable.map((cat) => (
            <Pressable
              key={cat.key}
              accessibilityRole="button"
              accessibilityLabel={`${cat.label} 추가`}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPick(cat.key);
                onClose();
              }}
              style={({ pressed }) => [styles.modalPickRow, { borderBottomColor: line }, pressed && { opacity: 0.72 }]}>
              <IconSymbol name={cat.icon as any} size={20} color={muted} />
              <ThemedText style={[styles.modalRowLabel, { color: ink }]}>{cat.label}</ThemedText>
              <IconSymbol name="plus" size={16} color={muted} />
            </Pressable>
          ))}
          {addable.length === 0 ? (
            <ThemedText style={[styles.modalEmpty, { color: muted }]}>
              추가할 수 있는 항목이 없어요. 위에서 새 플로우를 만들어 보세요.
            </ThemedText>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

type GroupAccordionProps = {
  setItem: FixedFlowSet;
  isExpanded: boolean;
  isActiveForToday: boolean;
  catalogByKey: Map<string, PriorityCatalogRow>;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
  iconBoxBg: string;
  sectionBg: string;
  dashedBorder: string;
  onToggleExpand: () => void;
  onSetActiveForToday: () => void;
  onDeleteSet: () => void;
  onToggleItem: (categoryKey: string, enabled: boolean) => void;
  onOpenAddItem: () => void;
};

function GroupAccordion({
  setItem,
  isExpanded,
  isActiveForToday,
  catalogByKey,
  isDark,
  ink,
  muted,
  line,
  cardBg,
  iconBoxBg,
  sectionBg,
  dashedBorder,
  onToggleExpand,
  onSetActiveForToday,
  onDeleteSet,
  onToggleItem,
  onOpenAddItem,
}: GroupAccordionProps) {
  const enabledCount = setItem.items.filter((x) => x.enabled !== false).length;
  const totalCount = setItem.items.length;

  return (
    <View style={[styles.accordionSection, { backgroundColor: sectionBg, borderColor: line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${setItem.name} ${isExpanded ? '접기' : '펼치기'}`}
        onPress={onToggleExpand}
        onLongPress={onDeleteSet}
        style={({ pressed }) => [styles.accordionHeader, pressed && { opacity: 0.85 }]}>
        <View style={styles.accordionHeaderLeft}>
          <ThemedText style={[styles.accordionTitle, { color: ink }]}>{setItem.name}</ThemedText>
          {isActiveForToday ? (
            <View style={[styles.todayBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' }]}>
              <ThemedText style={[styles.todayBadgeText, { color: ink }]}>오늘 적용</ThemedText>
            </View>
          ) : null}
        </View>
        <View style={styles.accordionHeaderRight}>
          <View style={[styles.countPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
            <ThemedText style={[styles.countPillText, { color: muted }]}>
              {enabledCount}/{totalCount}
            </ThemedText>
          </View>
          <IconSymbol name={isExpanded ? 'chevron.up' : 'chevron.down'} size={14} color={muted} />
        </View>
      </Pressable>

      {isExpanded ? (
        <View style={[styles.accordionBody, { borderTopColor: line }]}>
          {!isActiveForToday ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="이 그룹을 오늘에 적용"
              onPress={onSetActiveForToday}
              style={({ pressed }) => [
                styles.applyTodayBtn,
                {
                  borderColor: line,
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <ThemedText style={[styles.applyTodayLabel, { color: ink }]}>이 그룹을 오늘에 적용</ThemedText>
            </Pressable>
          ) : null}
          {totalCount === 0 ? (
            <ThemedText style={[styles.accordionEmpty, { color: muted }]}>
              아직 항목이 없어요. 아래에서 추가해 주세요.
            </ThemedText>
          ) : null}
          <View style={styles.cardList}>
            {setItem.items.map((item) => (
              <FlowItemCard
                key={item.categoryKey}
                item={item}
                catalog={catalogByKey.get(item.categoryKey)}
                setName={setItem.name}
                isDark={isDark}
                ink={ink}
                muted={muted}
                cardBg={cardBg}
                iconBoxBg={iconBoxBg}
                onToggleEnabled={(enabled) => onToggleItem(item.categoryKey, enabled)}
              />
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="새 항목 추가"
              onPress={onOpenAddItem}
              style={({ pressed }) => [
                styles.addCard,
                {
                  borderColor: dashedBorder,
                  backgroundColor: iconBoxBg,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}>
              <View style={[styles.addCardIconCircle, { backgroundColor: cardBg }]}>
                <IconSymbol name="plus" size={20} color={ink} />
              </View>
              <ThemedText style={[styles.addCardLabel, { color: ink }]}>새 항목 추가</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function FixedRoutinePage() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);

  const horizontalPad = 24;

  const [catalogTick, setCatalogTick] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [addItemSetId, setAddItemSetId] = useState<string | null>(null);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const targetSetIdRef = useRef<string | null>(null);

  const {
    sets,
    activeSetId,
    hydrate,
    addSet,
    selectSet,
    removeSet,
    addCategoryToSet,
    setCategoryEnabledInSet,
  } = useFixedFlowSetsStore(
    useShallow((s) => ({
      sets: s.sets,
      activeSetId: s.activeSetId,
      hydrate: s.hydrate,
      addSet: s.addSet,
      selectSet: s.selectSet,
      removeSet: s.removeSet,
      addCategoryToSet: s.addCategoryToSet,
      setCategoryEnabledInSet: s.setCategoryEnabledInSet,
    })),
  );

  const reloadCatalog = useCallback(() => setCatalogTick((n) => n + 1), []);

  useEffect(() => {
    hydrate();
    reloadCatalog();
  }, [hydrate, reloadCatalog]);

  useFocusEffect(useCallback(() => reloadCatalog(), [reloadCatalog]));

  useEffect(() => {
    if (sets.length === 0 || expandedIds.size > 0) return;
    const first = activeSetId && sets.some((s) => s.id === activeSetId) ? activeSetId : sets[0].id;
    setExpandedIds(new Set([first]));
  }, [sets, activeSetId, expandedIds.size]);

  const catalog = useMemo(() => {
    void catalogTick;
    return buildPriorityCatalogRows();
  }, [catalogTick]);
  const catalogByKey = useMemo(() => new Map(catalog.map((x) => [x.key, x])), [catalog]);

  const addableForModal = useMemo(() => {
    const setItem = sets.find((s) => s.id === addItemSetId);
    if (!setItem) return [];
    const inSet = new Set(setItem.items.map((x) => x.categoryKey));
    return catalog.filter((c) => !inSet.has(c.key));
  }, [catalog, sets, addItemSetId]);

  const toggleExpanded = useCallback((setId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(setId)) next.delete(setId);
      else next.add(setId);
      return next;
    });
  }, []);

  const handleDeleteSet = useCallback(
    (setId: string) => {
      const target = sets.find((s) => s.id === setId);
      if (!target) return;
      Alert.alert(
        `"${target.name}" 삭제`,
        '이 그룹을 삭제할까요? 안에 있는 항목도 함께 사라져요.',
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              removeSet(setId);
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ],
      );
    },
    [sets, removeSet],
  );

  const submitNewGroup = useCallback(() => {
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      setIsAddingGroup(false);
      setNewGroupName('');
      return;
    }
    addSet(trimmed);
    setNewGroupName('');
    setIsAddingGroup(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextSets = useFixedFlowSetsStore.getState().sets;
    const created = nextSets[nextSets.length - 1];
    if (created) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedIds((prev) => new Set([...prev, created.id]));
      selectSet(created.id);
    }
  }, [addSet, newGroupName, selectSet]);

  const handleCreateCustomFlow = useCallback(
    ({ name, groupKey }: { name: string; groupKey: string }) => {
      const id = createCustomFlowCategoryId();
      const safeGroupKey =
        typeof groupKey === 'string' && groupKey.trim().length > 0
          ? groupKey.trim()
          : DEFAULT_CUSTOM_FLOW_GROUP_KEY;
      const initial = getInitialOtherDataConfig();
      const trimmed = name.trim();
      const next = trimmed.length > 0 ? { ...initial, displayName: trimmed } : initial;
      saveGoalDetailCategoryConfig(id, next);
      appendCustomFlowCatalogEntry({ id, groupKey: safeGroupKey });
      registerOtherCategoryResolverFromStorage();
      void loadGoalDetailCategoryConfig(id);
      reloadCatalog();
      const targetSetId = targetSetIdRef.current ?? addItemSetId ?? activeSetId;
      if (targetSetId) addCategoryToSet(targetSetId, id);
      setCreateSheetOpen(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [addCategoryToSet, activeSetId, addItemSetId, reloadCatalog],
  );

  const shellBg = c.bg;
  const cardBg = c.containerLowest;
  const iconBoxBg = c.containerLow;
  const sectionBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)';
  const ink = c.onSurface;
  const muted = c.onVariant;
  const line = c.catBorderIdle;
  const dashedBorder = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)';

  return (
    <ThemedView style={[styles.screen, { backgroundColor: shellBg }]} darkColor={shellBg} lightColor={shellBg}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: 32 + insets.bottom,
          paddingHorizontal: horizontalPad,
          paddingTop: insets.top + 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.accordionList}>
          {sets.map((setItem) => (
            <GroupAccordion
              key={setItem.id}
              setItem={setItem}
              isExpanded={expandedIds.has(setItem.id)}
              isActiveForToday={setItem.id === activeSetId}
              catalogByKey={catalogByKey}
              isDark={isDark}
              ink={ink}
              muted={muted}
              line={line}
              cardBg={cardBg}
              iconBoxBg={iconBoxBg}
              sectionBg={sectionBg}
              dashedBorder={dashedBorder}
              onToggleExpand={() => toggleExpanded(setItem.id)}
              onSetActiveForToday={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                selectSet(setItem.id);
              }}
              onDeleteSet={() => handleDeleteSet(setItem.id)}
              onToggleItem={(categoryKey, enabled) => {
                setCategoryEnabledInSet(setItem.id, categoryKey, enabled);
              }}
              onOpenAddItem={() => {
                targetSetIdRef.current = setItem.id;
                setAddItemSetId(setItem.id);
                setAddItemModalOpen(true);
              }}
            />
          ))}
        </View>

        {isAddingGroup ? (
          <View style={[styles.addGroupCard, { borderColor: dashedBorder, backgroundColor: iconBoxBg }]}>
            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="새 그룹 이름"
              placeholderTextColor={muted}
              autoFocus
              style={[styles.addGroupInput, { color: ink }]}
              returnKeyType="done"
              onSubmitEditing={submitNewGroup}
            />
            <View style={styles.addGroupActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="취소"
                onPress={() => {
                  setIsAddingGroup(false);
                  setNewGroupName('');
                }}>
                <ThemedText style={[styles.addGroupCancel, { color: muted }]}>취소</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="그룹 추가"
                onPress={submitNewGroup}
                style={[styles.addGroupSubmit, { backgroundColor: ink }]}>
                <ThemedText style={[styles.addGroupSubmitLabel, { color: isDark ? '#09090b' : '#fff' }]}>
                  추가
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="그룹 추가"
            onPress={() => setIsAddingGroup(true)}
            style={({ pressed }) => [
              styles.addGroupTrigger,
              { borderColor: dashedBorder, opacity: pressed ? 0.88 : 1 },
            ]}>
            <IconSymbol name="plus" size={18} color={muted} />
            <ThemedText style={[styles.addGroupTriggerLabel, { color: muted }]}>그룹 추가</ThemedText>
            <ThemedText style={[styles.addGroupHint, { color: muted }]}>
              그룹 이름을 길게 누르면 삭제할 수 있어요
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>

      <AddItemModal
        visible={addItemModalOpen}
        addable={addableForModal}
        isDark={isDark}
        ink={ink}
        muted={muted}
        surface={cardBg}
        line={line}
        onClose={() => {
          setAddItemModalOpen(false);
          setAddItemSetId(null);
        }}
        onPick={(key) => {
          if (addItemSetId) addCategoryToSet(addItemSetId, key);
        }}
        onCreateCustom={() => {
          targetSetIdRef.current = addItemSetId;
          setCreateSheetOpen(true);
        }}
      />

      <CreateCustomFlowSheet
        visible={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        onCreate={handleCreateCustomFlow}
        initialGroupKey={DEFAULT_CUSTOM_FLOW_GROUP_KEY}
        isDark={isDark}
        ink={ink}
        muted={muted}
        line={line}
        surface={cardBg}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  accordionList: {
    gap: 12,
    marginBottom: 20,
  },
  accordionSection: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  accordionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.35,
  },
  todayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  todayBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accordionBody: {
    width: '100%',
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 12,
  },
  applyTodayBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  applyTodayLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  accordionEmpty: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  addGroupTrigger: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 6,
  },
  addGroupTriggerLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  addGroupHint: {
    fontSize: 12,
    fontWeight: '500',
  },
  addGroupCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  addGroupInput: {
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
  },
  addGroupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  addGroupCancel: {
    fontSize: 14,
    fontWeight: '600',
  },
  addGroupSubmit: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addGroupSubmitLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardList: {
    width: '100%',
    gap: 10,
  },
  flowCard: {
    width: '100%',
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  flowCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flowIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flowCardTitleCol: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  flowCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 21,
  },
  flowCardDesc: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPrimary: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagPrimaryText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tagSecondary: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  tagSecondaryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  addCard: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  addCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.25,
  },
  modalSheet: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  modalCreateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  modalPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalRowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  modalEmpty: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    paddingVertical: 20,
  },
});
