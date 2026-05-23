import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  UIManager,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  createCustomFlowCategoryId,
  filterDayPlanFlowBlocks,
  getInitialOtherDataConfig,
  isSystemCatalogGroupKey,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  useDayPlanDraftStore,
  useDayPlanStore,
} from '@entities/day-plan';
import { registerOtherCategoryResolverFromStorage } from '@features/other-category-resolve';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  appendCustomFlowCatalogEntry,
  DEFAULT_CUSTOM_FLOW_GROUP_KEY,
  isCustomCatalogGroupKey,
  listCustomCatalogGroups,
  listCustomFlowCatalogEntries,
  listGoalDetailCategoryConfigKeys,
  loadGoalDetailCategoryConfig,
  loadPriorityCatalogFixedRoutineKeys,
  reassignCustomFlowGroup,
  removeCustomCatalogGroup,
  renameCustomCatalogGroup,
  saveGoalDetailCategoryConfig,
  savePriorityCatalogFixedRoutineKeys,
  type CustomCatalogGroup,
  type CustomFlowCatalogEntry,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { getPickerCategoryLabel, PRIMARY } from '../lib/dayPlanEditorShared';
import { palette, type DayPlanPalette } from '../lib/dayPlanPalette';
import { normalizeFixedRoutineCategoryKeys } from '../lib/normalizeFixedRoutineCategoryKeys';
import { CreateCustomFlowSheet } from './CreateCustomFlowSheet';
import { tabBarScrollBottomInset } from './DayPlanCustomTabBar';
import { FixedRoutineEditorModal } from './FixedRoutineEditorModal';
import { PriorityCatalogPanel } from './PriorityCatalogPanel';
import { RenameCustomGroupSheet } from './RenameCustomGroupSheet';

/** 시트에서 넘긴 그룹 키를 저장용으로 확정 — 검증 실패 시에만 기본 생산성 그룹 */
function resolveCatalogGroupKeyForPersist(raw: string): string {
  const t = typeof raw === 'string' ? raw.trim() : '';
  if (!t) return DEFAULT_CUSTOM_FLOW_GROUP_KEY;
  if (isSystemCatalogGroupKey(t)) return t;
  if (listCustomCatalogGroups().some((g) => g.key === t)) return t;
  if (isCustomCatalogGroupKey(t)) return t;
  return DEFAULT_CUSTOM_FLOW_GROUP_KEY;
}

function bookColors(c: DayPlanPalette, isDark: boolean) {
  if (isDark) {
    return {
      cover: c.containerLow,
      ink: c.onSurface,
      inkMuted: c.onVariant,
    };
  }
  return {
    cover: c.containerLow,
    ink: c.onSurface,
    inkMuted: c.onVariant,
  };
}

export function PriorityCatalogPage() {
  const router = useRouter();

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const animateListMutation = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 220,
      create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
      update: { type: LayoutAnimation.Types.easeInEaseOut },
      delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    });
  }, []);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const c = useMemo(() => palette(isDark), [isDark]);
  const bc = bookColors(c, isDark);

  const editorial = useMemo(() => {
    if (isDark) {
      return {
        ink: bc.ink,
        muted: bc.inkMuted,
        line: 'rgba(255,255,255,0.2)',
      };
    }
    return {
      ink: bc.ink,
      muted: bc.inkMuted,
      line: c.catBorderIdle,
    };
  }, [isDark, bc.ink, bc.inkMuted, c.catBorderIdle]);

  const {
    priorityCategoryOrder,
    setPriorityCategoryOrder,
    bumpPriorityCatalogFixedRoutineEpoch,
    isFocusStarted,
    completedFocusCategoryKeys,
    planCompletionDismissedKeys,
  } = useDayPlanDraftStore(
    useShallow((s) => ({
      priorityCategoryOrder: s.priorityCategoryOrder,
      setPriorityCategoryOrder: s.setPriorityCategoryOrder,
      bumpPriorityCatalogFixedRoutineEpoch: s.bumpPriorityCatalogFixedRoutineEpoch,
      isFocusStarted: s.isFocusStarted,
      completedFocusCategoryKeys: s.completedFocusCategoryKeys,
      planCompletionDismissedKeys: s.planCompletionDismissedKeys,
    })),
  );

  const planBlocks = useDayPlanStore((s) => s.blocks);
  const completedBlockIds = useDayPlanStore((s) => s.completedBlockIds);
  const skippedBlockIds = useDayPlanStore((s) => s.skippedBlockIds);

  const [customFlowEntries, setCustomFlowEntries] = useState<CustomFlowCatalogEntry[]>([]);
  const [customGroups, setCustomGroups] = useState<CustomCatalogGroup[]>([]);

  const reloadCatalogData = useCallback(() => {
    const stored = listCustomFlowCatalogEntries();
    const known = new Map(stored.map((e) => [e.id, e] as const));
    /** 저장소 키만 있고 catalog 항목이 없는 경우(레거시) 보강 */
    for (const id of listGoalDetailCategoryConfigKeys()) {
      if (!id.startsWith('customFlow:') || known.has(id)) continue;
      known.set(id, { id, groupKey: DEFAULT_CUSTOM_FLOW_GROUP_KEY });
    }
    setCustomFlowEntries([...known.values()]);
    setCustomGroups(listCustomCatalogGroups());
  }, []);

  useEffect(() => {
    reloadCatalogData();
  }, [reloadCatalogData]);

  useFocusEffect(
    useCallback(() => {
      reloadCatalogData();
    }, [reloadCatalogData]),
  );

  const customFlowPickerItems = useMemo(() => {
    return customFlowEntries.map((e) => ({
      key: e.id,
      label: getPickerCategoryLabel(e.id),
      icon: 'person.fill' as const,
    }));
  }, [customFlowEntries]);

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

  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [createSheetGroupKey, setCreateSheetGroupKey] = useState<string | undefined>(undefined);
  const [renameGroupSheet, setRenameGroupSheet] = useState<{
    groupKey: string;
    label: string;
  } | null>(null);

  const openCreateSheet = useCallback((groupKey?: string) => {
    const safe =
      groupKey && (isSystemCatalogGroupKey(groupKey) || isCustomCatalogGroupKey(groupKey))
        ? groupKey
        : 'productivity';
    setCreateSheetGroupKey(safe);
    setCreateSheetOpen(true);
  }, []);

  const handleCreateCustomFlow = useCallback(
    ({ name, groupKey }: { name: string; groupKey: string }) => {
      const id = createCustomFlowCategoryId();
      const safeGroupKey = resolveCatalogGroupKeyForPersist(groupKey);
      const initial = getInitialOtherDataConfig();
      const trimmed = name.trim();
      const next = trimmed.length > 0 ? { ...initial, displayName: trimmed } : initial;
      saveGoalDetailCategoryConfig(id, next);
      appendCustomFlowCatalogEntry({ id, groupKey: safeGroupKey });
      registerOtherCategoryResolverFromStorage();
      void loadGoalDetailCategoryConfig(id);
      reloadCatalogData();
      setCreateSheetOpen(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [reloadCatalogData],
  );

  const isCatalogRowCompleted = useCallback(
    (categoryKey: string) => {
      if (completedFocusCategoryKeys.includes(categoryKey)) return true;
      if (!isFocusStarted) return false;
      if (planCompletionDismissedKeys.includes(categoryKey)) return false;
      return completedCategoryKeysFromPlan.includes(categoryKey);
    },
    [
      completedFocusCategoryKeys,
      completedCategoryKeysFromPlan,
      isFocusStarted,
      planCompletionDismissedKeys,
    ],
  );

  const [fixedRoutineKeys, setFixedRoutineKeys] = useState<string[]>([]);
  const [fixedEditorOpen, setFixedEditorOpen] = useState(false);

  useEffect(() => {
    const raw = loadPriorityCatalogFixedRoutineKeys();
    setFixedRoutineKeys(normalizeFixedRoutineCategoryKeys(raw));
  }, []);

  const persistFixedRoutineKeys = useCallback(
    (next: string[]) => {
      const normalized = normalizeFixedRoutineCategoryKeys(next);
      setFixedRoutineKeys(normalized);
      savePriorityCatalogFixedRoutineKeys(normalized);
      bumpPriorityCatalogFixedRoutineEpoch();
    },
    [bumpPriorityCatalogFixedRoutineEpoch],
  );

  const scrollBottomPad = useMemo(
    () => tabBarScrollBottomInset(insets.bottom) + 88,
    [insets.bottom],
  );

  const shellBg = c.containerLow;

  const onCatalogTap = useCallback(
    (key: string) => {
      const alreadyIn = priorityCategoryOrder.includes(key);
      if (isFocusStarted && alreadyIn) {
        void Haptics.selectionAsync();
        return;
      }
      animateListMutation();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const nextOrder = priorityCategoryOrder.includes(key)
        ? priorityCategoryOrder.filter((k) => k !== key)
        : [...priorityCategoryOrder, key];
      setPriorityCategoryOrder(nextOrder);
    },
    [animateListMutation, isFocusStarted, priorityCategoryOrder, setPriorityCategoryOrder],
  );

  const onOpenCategorySettings = useCallback(
    (categoryKey: string) => {
      if (isFocusStarted && priorityCategoryOrder.includes(categoryKey)) {
        void Haptics.selectionAsync();
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: '/goal-detail-settings',
        params: { categoryKey },
      });
    },
    [isFocusStarted, priorityCategoryOrder, router],
  );

  const onRenameCustomGroup = useCallback((groupKey: string, currentLabel: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRenameGroupSheet({ groupKey, label: currentLabel });
  }, []);

  const onSaveRenameCustomGroup = useCallback(
    (trimmedLabel: string) => {
      if (!renameGroupSheet) return;
      if (trimmedLabel.length === 0) {
        Alert.alert('이름을 입력해 주세요', '묶음 이름은 한 글자 이상이어야 해요.');
        return;
      }
      renameCustomCatalogGroup(renameGroupSheet.groupKey, trimmedLabel);
      reloadCatalogData();
      setRenameGroupSheet(null);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [reloadCatalogData, renameGroupSheet],
  );

  const onDeleteCustomGroup = useCallback(
    (groupKey: string, currentLabel: string) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Alert.alert(
        '묶음 삭제',
        `「${currentLabel}」 묶음을 삭제할까요? 이 안에 있던 항목은 생산성 묶음으로 옮겨져요.`,
        [
          { text: '취소', style: 'cancel' },
          {
            text: '삭제',
            style: 'destructive',
            onPress: () => {
              reassignCustomFlowGroup(groupKey, DEFAULT_CUSTOM_FLOW_GROUP_KEY);
              removeCustomCatalogGroup(groupKey);
              reloadCatalogData();
              void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            },
          },
        ],
      );
    },
    [reloadCatalogData],
  );

  return (
    <ThemedView style={[styles.screen, { backgroundColor: shellBg }]} darkColor={shellBg} lightColor={shellBg}>
      <FixedRoutineEditorModal
        visible={fixedEditorOpen}
        onClose={() => setFixedEditorOpen(false)}
        initialKeys={fixedRoutineKeys}
        onSave={persistFixedRoutineKeys}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        line={editorial.line}
        surface={shellBg}
      />
      <View style={[styles.safe, { backgroundColor: shellBg }]}>
        <ScrollView
          style={[styles.scroll, { backgroundColor: shellBg }]}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: scrollBottomPad,
              paddingTop: insets.top + 16,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerBlock}>
            <ThemedText style={[styles.pageTitle, { color: editorial.ink }]}>오늘 집중할 것</ThemedText>
            <ThemedText style={[styles.lead, { color: editorial.muted }]}>
              하루 동안 무엇에 집중할지 골라 담는 곳이에요. 탭한 항목은 오늘 탭 우선 순위에 순서대로 쌓여요. 부담스럽지 않게 필요한 만큼만
              담아도 돼요.
            </ThemedText>
          </View>
          <PriorityCatalogPanel
            editorial={editorial}
            priorityCategoryOrder={priorityCategoryOrder}
            isFocusStarted={isFocusStarted}
            isCatalogRowCompleted={isCatalogRowCompleted}
            userFixedRoutineOrder={fixedRoutineKeys}
            onOpenFixedRoutineEditor={() => setFixedEditorOpen(true)}
            onCatalogTap={onCatalogTap}
            onOpenCategorySettings={onOpenCategorySettings}
            customFlowPickerItems={customFlowPickerItems}
            customFlowEntries={customFlowEntries}
            customGroups={customGroups}
            isDark={isDark}
            onRenameCustomGroup={onRenameCustomGroup}
            onDeleteCustomGroup={onDeleteCustomGroup}
          />
        </ScrollView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="새 루틴 만들기"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            openCreateSheet();
          }}
          style={({ pressed }) => [
            styles.fab,
            {
              bottom: Math.max(insets.bottom, 12) + 12,
              opacity: pressed ? 0.92 : 1,
            },
          ]}>
          <View style={styles.fabInner}>
            <IconSymbol name="plus" size={26} color="#FAFAFA" />
          </View>
        </Pressable>
      </View>
      <CreateCustomFlowSheet
        visible={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        onCreate={handleCreateCustomFlow}
        initialGroupKey={createSheetGroupKey}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        line={editorial.line}
        surface={shellBg}
      />
      <RenameCustomGroupSheet
        visible={renameGroupSheet != null}
        onClose={() => setRenameGroupSheet(null)}
        initialLabel={renameGroupSheet?.label ?? ''}
        onSave={onSaveRenameCustomGroup}
        isDark={isDark}
        ink={editorial.ink}
        muted={editorial.muted}
        surface={shellBg}
      />
    </ThemedView>
  );
}

const FAB_SIZE = 56;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    zIndex: 30,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
  },
  fabInner: {
    flex: 1,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBlock: {
    gap: 8,
    marginBottom: 4,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  lead: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
});
