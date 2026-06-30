import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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
  filterDayPlanFlowBlocks,
  getInitialOtherDataConfig,
  getLocalDateKey,
  getLocalMinutesOfDayNow,
  isCustomFlowCategoryKey,
  isPriorityWindowEndedForToday,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  useDayPlanDraftStore,
  useDayPlanStore,
  useFixedFlowSetsStore,
} from '@entities/day-plan';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  appendCustomFlowCatalogEntry,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
  subscribeCustomFlowCatalog,
  type FixedFlowSet,
  type FixedFlowSetItem,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';
import { activeIconColorByCategory } from '@widgets/day-plan-priority-order';

import { getPickerCategoryLabel, PRIMARY } from '../lib/dayPlanEditorShared';
import { palette } from '../lib/dayPlanPalette';
import { buildPriorityCatalogRows, sortAddablePriorityCatalogRows, type PriorityCatalogRow } from '../lib/priorityCatalog';
import { CreateCustomFlowSheet } from './CreateCustomFlowSheet';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FlowCardProps = {
  item: FixedFlowSetItem;
  catalog: PriorityCatalogRow | undefined;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  iconBoxBg: string;
  isFocusStarted: boolean;
  isInTodayPlan: boolean;
  isCompleted: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onDelete: () => void;
};

function FlowItemCard({
  item,
  catalog,
  isDark,
  ink,
  muted,
  line,
  iconBoxBg,
  isFocusStarted,
  isInTodayPlan,
  isCompleted,
  onToggleEnabled,
  onDelete,
}: FlowCardProps) {
  const label = catalog?.label ?? getPickerCategoryLabel(item.categoryKey);
  const icon = catalog?.icon ?? 'person.fill';
  const enabled = item.enabled !== false;
  const categoryKey = item.categoryKey;
  const trackOff = isDark ? '#3f3f46' : '#e5e7eb';
  const shouldPulse = Boolean(isInTodayPlan && isFocusStarted && enabled && !isCompleted);
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!shouldPulse) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shouldPulse, pulse]);

  const selectedIconColor = isDark ? ink : PRIMARY;
  const iconColor = shouldPulse
    ? activeIconColorByCategory(categoryKey)
    : isInTodayPlan && enabled
      ? isCompleted
        ? muted
        : selectedIconColor
      : muted;
  const labelColor =
    isInTodayPlan && enabled ? (isCompleted ? muted : ink) : muted;

  return (
    <View
      style={[
        styles.flowRow,
        { borderBottomColor: line, opacity: enabled ? 1 : 0.5 },
      ]}>
      <View style={styles.flowRowMain}>
        <View style={[styles.flowIconBox, { backgroundColor: iconBoxBg }]}>
          {shouldPulse && categoryKey === 'medicine' ? (
            <Animated.View style={{ opacity: pulse }}>
              <IconSymbol name="cross.fill" size={12} color="#ef4444" />
            </Animated.View>
          ) : (
            <Animated.View style={shouldPulse ? { opacity: pulse } : undefined}>
              <IconSymbol name={icon as any} size={15} color={iconColor} />
            </Animated.View>
          )}
        </View>
        <ThemedText
          style={[styles.flowRowTitle, { color: labelColor }]}
          numberOfLines={1}>
          {label}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 삭제`}
        onPress={onDelete}
        style={({ pressed }) => [
          styles.rowDeleteBtn,
          { backgroundColor: iconBoxBg, borderColor: line },
          pressed && { opacity: 0.72 },
        ]}>
        <IconSymbol name="trash" size={14} color={muted} />
      </Pressable>
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
        style={styles.flowSwitch}
      />
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
  onConfirm: (keys: string[]) => void;
  onCreateCustom: () => void;
};

function addableSectionBucket(row: PriorityCatalogRow): 'user' | 'standard' | 'builtin' {
  if (row.isCustom && !row.key.includes('builtin_')) return 'user';
  if (!row.isCustom) return 'standard';
  return 'builtin';
}

function addableSectionTitle(bucket: 'user' | 'standard' | 'builtin'): string {
  if (bucket === 'user') return '내가 만든 루틴';
  if (bucket === 'standard') return '기본 항목';
  return '추천 루틴';
}

function AddItemModal({
  visible,
  addable,
  isDark,
  ink,
  muted,
  surface,
  line,
  onClose,
  onConfirm,
  onCreateCustom,
}: AddItemModalProps) {
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
      <View style={[styles.modalSheet, { backgroundColor: surface, paddingTop: insets.top + 12 }]}>
        <View style={[styles.modalHeader, { borderBottomColor: line }]}>
          <ThemedText style={[styles.modalTitle, { color: ink }]}>항목 추가</ThemedText>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} hitSlop={10}>
            <IconSymbol name="xmark" size={20} color={muted} />
          </Pressable>
        </View>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={{ paddingBottom: 12, paddingHorizontal: 20, gap: 2 }}
          keyboardShouldPersistTaps="handled">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="내 플로우 만들기"
            onPress={() => {
              onClose();
              onCreateCustom();
            }}
            style={({ pressed }) => [styles.modalCreateRow, pressed && { opacity: 0.72 }]}>
            <IconSymbol name="plus.circle.fill" size={20} color={ink} />
            <ThemedText style={[styles.modalRowLabel, { color: ink }]}>내 플로우 만들기</ThemedText>
          </Pressable>
          {addable.map((cat, index) => {
            const selected = selectedKeys.has(cat.key);
            const bucket = addableSectionBucket(cat);
            const prevBucket = index > 0 ? addableSectionBucket(addable[index - 1]!) : null;
            const sectionTitle = bucket !== prevBucket ? addableSectionTitle(bucket) : null;
            return (
              <View key={cat.key}>
                {sectionTitle ? (
                  <ThemedText style={[styles.modalSectionTitle, { color: muted }]}>{sectionTitle}</ThemedText>
                ) : null}
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${cat.label} ${selected ? '선택됨' : '선택'}`}
                  onPress={() => toggleSelection(cat.key)}
                  style={({ pressed }) => [
                    styles.modalPickRow,
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
                  <IconSymbol name={cat.icon as any} size={18} color={muted} />
                  <ThemedText style={[styles.modalRowLabel, { color: ink }]}>{cat.label}</ThemedText>
                  <IconSymbol
                    name={selected ? 'checkmark.circle.fill' : 'circle'}
                    size={18}
                    color={selected ? ink : muted}
                  />
                </Pressable>
              </View>
            );
          })}
          {addable.length === 0 ? (
            <ThemedText style={[styles.modalEmpty, { color: muted }]}>
              추가할 수 있는 항목이 없어요. 위에서 새 플로우를 만들어 보세요.
            </ThemedText>
          ) : null}
        </ScrollView>
        <View
          style={[
            styles.modalFooter,
            {
              borderTopColor: line,
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: surface,
            },
          ]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={selectedCount > 0 ? `${selectedCount}개 항목 추가` : '항목을 선택해 주세요'}
            disabled={selectedCount === 0}
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.modalConfirmBtn,
              {
                backgroundColor: selectedCount > 0 ? ink : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                opacity: pressed && selectedCount > 0 ? 0.9 : 1,
              },
            ]}>
            <ThemedText
              style={[
                styles.modalConfirmLabel,
                { color: selectedCount > 0 ? (isDark ? '#09090b' : '#fff') : muted },
              ]}>
              {selectedCount > 0 ? `${selectedCount}개 추가` : '항목을 선택해 주세요'}
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

type GroupAccordionProps = {
  setItem: FixedFlowSet;
  isExpanded: boolean;
  isActiveForToday: boolean;
  applyBlocked: boolean;
  catalogByKey: Map<string, PriorityCatalogRow>;
  isDark: boolean;
  ink: string;
  muted: string;
  line: string;
  cardBg: string;
  iconBoxBg: string;
  sectionBg: string;
  isFocusStarted: boolean;
  isCategoryInTodayPlan: (categoryKey: string) => boolean;
  isCategoryCompleted: (categoryKey: string) => boolean;
  onToggleExpand: () => void;
  onToggleActiveForToday: () => void;
  onApplyBlocked: () => void;
  onDeleteSet: () => void;
  onToggleItem: (categoryKey: string, enabled: boolean) => void;
  onDeleteItem: (categoryKey: string, label: string) => void;
  onOpenAddItem: () => void;
};

function GroupAccordion({
  setItem,
  isExpanded,
  isActiveForToday,
  applyBlocked,
  catalogByKey,
  isDark,
  ink,
  muted,
  line,
  cardBg,
  iconBoxBg,
  sectionBg,
  isFocusStarted,
  isCategoryInTodayPlan,
  isCategoryCompleted,
  onToggleExpand,
  onToggleActiveForToday,
  onApplyBlocked,
  onDeleteSet,
  onToggleItem,
  onDeleteItem,
  onOpenAddItem,
}: GroupAccordionProps) {
  const enabledCount = setItem.items.filter((x) => x.enabled !== false).length;
  const totalCount = setItem.items.length;
  const applyChipBlocked = applyBlocked && !isActiveForToday;

  return (
    <View style={[styles.accordionSection, { backgroundColor: sectionBg, borderColor: line }]}>
      <View style={styles.accordionHeader}>
        <View style={styles.accordionHeaderMain}>
          <ThemedText
            style={[styles.accordionTitle, styles.accordionTitleText, { color: ink }]}
            numberOfLines={1}>
            {setItem.name}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: applyChipBlocked }}
          accessibilityLabel={
            isActiveForToday
              ? '오늘 적용 해제'
              : applyChipBlocked
                ? '집중 시간이 끝나 오늘 적용할 수 없음'
                : '오늘 적용'
          }
          onPress={() => {
            if (applyChipBlocked) {
              onApplyBlocked();
              return;
            }
            onToggleActiveForToday();
          }}
          style={({ pressed }) => [
            styles.headerApplyChip,
            {
              borderColor: isActiveForToday ? ink : line,
              backgroundColor: isActiveForToday
                ? isDark
                  ? 'rgba(255,255,255,0.14)'
                  : 'rgba(0,0,0,0.08)'
                : isDark
                  ? 'rgba(255,255,255,0.06)'
                  : 'rgba(0,0,0,0.03)',
              opacity: applyChipBlocked ? 0.42 : pressed ? 0.88 : 1,
            },
          ]}>
          <ThemedText
            style={[
              styles.headerApplyChipLabel,
              { color: isActiveForToday ? ink : muted },
            ]}
            numberOfLines={1}>
            {isActiveForToday ? '적용 중' : '오늘 적용'}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${setItem.name} 그룹 삭제`}
          onPress={onDeleteSet}
          style={({ pressed }) => [
            styles.headerDeleteBtn,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
            pressed && { opacity: 0.72 },
          ]}>
          <IconSymbol name="trash" size={13} color={muted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${setItem.name} ${isExpanded ? '접기' : '펼치기'}`}
          onPress={onToggleExpand}
          style={({ pressed }) => [styles.accordionHeaderRight, pressed && { opacity: 0.85 }]}>
          <View style={[styles.countPill, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
            <ThemedText style={[styles.countPillText, { color: muted }]}>
              {enabledCount}/{totalCount}
            </ThemedText>
          </View>
          <IconSymbol name={isExpanded ? 'chevron.up' : 'chevron.down'} size={12} color={muted} />
        </Pressable>
      </View>

      {isExpanded ? (
        <View style={[styles.accordionBody, { borderTopColor: line }]}>
          {totalCount === 0 ? (
            <ThemedText style={[styles.accordionEmpty, { color: muted }]}>
              아직 항목이 없어요. 아래에서 추가해 주세요.
            </ThemedText>
          ) : null}
          <View style={[styles.cardList, { backgroundColor: cardBg, borderColor: line }]}>
            {setItem.items.map((item) => {
              const cat = catalogByKey.get(item.categoryKey);
              const itemLabel = cat?.label ?? getPickerCategoryLabel(item.categoryKey);
              return (
                <FlowItemCard
                  key={item.categoryKey}
                  item={item}
                  catalog={cat}
                  isDark={isDark}
                  ink={ink}
                  muted={muted}
                  line={line}
                  iconBoxBg={iconBoxBg}
                  isFocusStarted={isFocusStarted}
                  isInTodayPlan={isCategoryInTodayPlan(item.categoryKey)}
                  isCompleted={isCategoryCompleted(item.categoryKey)}
                  onToggleEnabled={(enabled) => onToggleItem(item.categoryKey, enabled)}
                  onDelete={() => onDeleteItem(item.categoryKey, itemLabel)}
                />
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="새 항목 추가"
              onPress={onOpenAddItem}
              style={({ pressed }) => [
                styles.addRow,
                { opacity: pressed ? 0.88 : 1 },
              ]}>
              <IconSymbol name="plus" size={14} color={muted} />
              <ThemedText style={[styles.addRowLabel, { color: muted }]}>새 항목 추가</ThemedText>
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

  const horizontalPad = 16;

  const [catalogTick, setCatalogTick] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [addItemSetId, setAddItemSetId] = useState<string | null>(null);
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const targetSetIdRef = useRef<string | null>(null);
  const hasInitializedExpandedRef = useRef(false);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const {
    planMode,
    priorityStart,
    priorityEnd,
    priorityPlanDateKey,
    priorityPlanDateKeyEnd,
    isFocusStarted,
    priorityCategoryOrder,
    completedFocusCategoryKeys,
    planCompletionDismissedKeys,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      planMode: s.planMode,
      priorityStart: s.priorityStart,
      priorityEnd: s.priorityEnd,
      priorityPlanDateKey: s.priorityPlanDateKey,
      priorityPlanDateKeyEnd: s.priorityPlanDateKeyEnd,
      isFocusStarted: s.isFocusStarted,
      priorityCategoryOrder: s.priorityCategoryOrder,
      completedFocusCategoryKeys: s.completedFocusCategoryKeys,
      planCompletionDismissedKeys: s.planCompletionDismissedKeys,
    })),
  );

  const planBlocks = useDayPlanStore((s) => s.blocks);
  const completedBlockIds = useDayPlanStore((s) => s.completedBlockIds);
  const skippedBlockIds = useDayPlanStore((s) => s.skippedBlockIds);

  const completedCategoryKeysFromPlan = useMemo(() => {
    const doneBlockIds = new Set([...completedBlockIds, ...skippedBlockIds]);
    const doneCategoryKeys = new Set<string>();
    const flowBlocks = filterDayPlanFlowBlocks(planBlocks);
    flowBlocks.forEach((block) => {
      if (!doneBlockIds.has(block.id)) return;
      const key = resolveBlockCategoryKey(block) ?? resolveCategoryKeyFromLabel(block.category ?? '');
      if (key) doneCategoryKeys.add(key);
    });
    return [...doneCategoryKeys];
  }, [planBlocks, completedBlockIds, skippedBlockIds]);

  const isCategoryCompleted = useCallback(
    (categoryKey: string) => {
      if (completedFocusCategoryKeys.includes(categoryKey)) return true;
      if (!isFocusStarted) return false;
      if (planCompletionDismissedKeys.includes(categoryKey)) return false;
      return completedCategoryKeysFromPlan.includes(categoryKey);
    },
    [
      completedCategoryKeysFromPlan,
      completedFocusCategoryKeys,
      isFocusStarted,
      planCompletionDismissedKeys,
    ],
  );

  const isCategoryInTodayPlan = useCallback(
    (categoryKey: string) => priorityCategoryOrder.includes(categoryKey),
    [priorityCategoryOrder],
  );

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 10_000);
    return () => clearInterval(id);
  }, []);

  const priorityWindowEndedForToday = useMemo(
    () =>
      isPriorityWindowEndedForToday({
        planMode,
        priorityStart,
        priorityEnd,
        priorityPlanDateKey,
        priorityPlanDateKeyEnd,
        nowKey: getLocalDateKey(),
        nowMin: getLocalMinutesOfDayNow(),
      }),
    [
      planMode,
      priorityStart,
      priorityEnd,
      priorityPlanDateKey,
      priorityPlanDateKeyEnd,
      nowTick,
    ],
  );

  const handleApplyBlocked = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      '집중 시간이 끝났어요',
      '오늘 집중 구간이 종료되어 지금은 적용할 수 없어요. 오늘 탭에서 집중 시간을 변경한 뒤 다시 적용해 주세요.',
    );
  }, []);

  const {
    sets,
    activeSetIds,
    hydrate,
    addSet,
    toggleSetForToday,
    removeSet,
    addCategoryToSet,
    removeCategoryFromSet,
    setCategoryEnabledInSet,
  } = useFixedFlowSetsStore(
    useShallow((s) => ({
      sets: s.sets,
      activeSetIds: s.activeSetIds,
      hydrate: s.hydrate,
      addSet: s.addSet,
      toggleSetForToday: s.toggleSetForToday,
      removeSet: s.removeSet,
      addCategoryToSet: s.addCategoryToSet,
      removeCategoryFromSet: s.removeCategoryFromSet,
      setCategoryEnabledInSet: s.setCategoryEnabledInSet,
    })),
  );

  const reloadCatalog = useCallback(() => setCatalogTick((n) => n + 1), []);

  useEffect(() => {
    hydrate();
    reloadCatalog();
  }, [hydrate, reloadCatalog]);

  useFocusEffect(useCallback(() => reloadCatalog(), [reloadCatalog]));

  useEffect(() => subscribeCustomFlowCatalog(reloadCatalog), [reloadCatalog]);

  /** 최초 진입 시 모든 그룹 펼침 — 이후 사용자가 접은 상태는 유지 */
  useEffect(() => {
    if (sets.length === 0 || hasInitializedExpandedRef.current) return;
    hasInitializedExpandedRef.current = true;
    setExpandedIds(new Set(sets.map((s) => s.id)));
  }, [sets]);

  /** 항목 추가 모달이 열릴 때마다 카탈로그를 최신으로 갱신 */
  useEffect(() => {
    if (addItemModalOpen) reloadCatalog();
  }, [addItemModalOpen, reloadCatalog]);

  const catalog = useMemo(() => {
    void catalogTick;
    return buildPriorityCatalogRows();
  }, [catalogTick]);
  const catalogByKey = useMemo(() => new Map(catalog.map((x) => [x.key, x])), [catalog]);

  const addableForModal = useMemo(() => {
    const setItem = sets.find((s) => s.id === addItemSetId);
    if (!setItem) return [];
    const inSet = new Set(setItem.items.map((x) => x.categoryKey));
    return sortAddablePriorityCatalogRows(catalog.filter((c) => !inSet.has(c.key)));
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
    }
  }, [addSet, newGroupName]);

  const handleCreateCustomFlow = useCallback(
    ({
      name,
      groupKey,
      icon,
      accentColor,
    }: {
      name: string;
      groupKey: string;
      icon: string;
      accentColor: string;
    }) => {
      const id = createCustomFlowCategoryId();
      const safeGroupKey =
        typeof groupKey === 'string' && groupKey.trim().length > 0
          ? groupKey.trim()
          : DEFAULT_CUSTOM_FLOW_GROUP_KEY;
      const initial = getInitialOtherDataConfig();
      const trimmed = name.trim();
      const next =
        trimmed.length > 0
          ? { ...initial, displayName: trimmed, icon, accentColor }
          : { ...initial, icon, accentColor };
      saveGoalDetailCategoryConfig(id, next);
      appendCustomFlowCatalogEntry({ id, groupKey: safeGroupKey });
      registerOtherCategoryResolverFromStorage();
      void loadGoalDetailCategoryConfig(id);
      reloadCatalog();
      const targetSetId = targetSetIdRef.current ?? addItemSetId ?? sets[0]?.id;
      if (targetSetId) addCategoryToSet(targetSetId, id);
      setCreateSheetOpen(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [addCategoryToSet, sets, addItemSetId, reloadCatalog],
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
          paddingBottom: 24 + insets.bottom,
          paddingHorizontal: horizontalPad,
          paddingTop: insets.top + 8,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.accordionList}>
          {sets.map((setItem) => (
            <GroupAccordion
              key={setItem.id}
              setItem={setItem}
              isExpanded={expandedIds.has(setItem.id)}
              isActiveForToday={activeSetIds.includes(setItem.id)}
              applyBlocked={priorityWindowEndedForToday}
              catalogByKey={catalogByKey}
              isDark={isDark}
              ink={ink}
              muted={muted}
              line={line}
              cardBg={cardBg}
              iconBoxBg={iconBoxBg}
              sectionBg={sectionBg}
              isFocusStarted={isFocusStarted}
              isCategoryInTodayPlan={isCategoryInTodayPlan}
              isCategoryCompleted={isCategoryCompleted}
              onToggleExpand={() => toggleExpanded(setItem.id)}
              onToggleActiveForToday={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleSetForToday(setItem.id);
              }}
              onApplyBlocked={handleApplyBlocked}
              onDeleteSet={() => handleDeleteSet(setItem.id)}
              onToggleItem={(categoryKey, enabled) => {
                setCategoryEnabledInSet(setItem.id, categoryKey, enabled);
              }}
              onDeleteItem={(categoryKey, itemLabel) => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert(
                  `"${itemLabel}" 삭제`,
                  '이 항목을 그룹에서 삭제할까요?',
                  [
                    { text: '취소', style: 'cancel' },
                    {
                      text: '삭제',
                      style: 'destructive',
                      onPress: () => {
                        removeCategoryFromSet(setItem.id, categoryKey);
                        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      },
                    },
                  ],
                );
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
              이름을 눌러 바꾸고, 휴지통으로 삭제할 수 있어요
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
        onConfirm={(keys) => {
          if (!addItemSetId) return;
          keys.forEach((key) => addCategoryToSet(addItemSetId, key));
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
    gap: 6,
    marginBottom: 12,
  },
  accordionSection: {
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  accordionHeaderMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.28,
  },
  accordionTitleText: {
    flex: 1,
    minWidth: 0,
  },
  headerApplyChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    flexShrink: 0,
  },
  headerApplyChipLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.15,
  },
  headerDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accordionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 32,
    paddingLeft: 2,
    flexShrink: 0,
  },
  countPill: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 999,
  },
  countPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  accordionBody: {
    width: '100%',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 4,
  },
  accordionEmpty: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  addGroupTrigger: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
  },
  addGroupTriggerLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  addGroupHint: {
    fontSize: 11,
    fontWeight: '500',
  },
  addGroupCard: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  addGroupInput: {
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 6,
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
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
  },
  addGroupSubmitLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardList: {
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 40,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  flowRowMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flowIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  flowRowTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  flowSwitch: {
    transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }],
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  addRowLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  modalSheet: { flex: 1 },
  modalScroll: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  modalCreateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  modalSectionTitle: {
    marginTop: 8,
    marginBottom: 2,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  modalPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalRowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.25,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  modalConfirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalConfirmLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  modalEmpty: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    paddingVertical: 20,
  },
});
