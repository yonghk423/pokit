import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, StyleSheet, UIManager, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';

import {
  filterDayPlanFlowBlocks,
  resolveCategoryKeyFromLabel,
  useDayPlanStore,
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  loadPriorityCatalogFixedRoutineKeys,
  savePriorityCatalogFixedRoutineKeys,
} from '@shared/lib/storage';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { normalizeFixedRoutineCategoryKeys } from '../lib/normalizeFixedRoutineCategoryKeys';
import { palette, type DayPlanPalette } from '../lib/dayPlanPalette';
import { useDayPlanDraftStore } from '../model/dayPlanDraftStore';
import { tabBarScrollBottomInset } from './DayPlanCustomTabBar';
import { FixedRoutineEditorModal } from './FixedRoutineEditorModal';
import { PriorityCatalogPanel } from './PriorityCatalogPanel';

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

  const completedCategoryKeysFromPlan = useMemo(() => {
    const doneBlockIds = new Set([...completedBlockIds, ...skippedBlockIds]);
    const doneCategoryKeys = new Set<string>();
    const flowBlocks = filterDayPlanFlowBlocks(planBlocks);
    flowBlocks.forEach((block) => {
      if (!doneBlockIds.has(block.id)) return;
      const key = resolveCategoryKeyFromLabel(block.category ?? '');
      if (key) doneCategoryKeys.add(key);
    });
    return [...doneCategoryKeys];
  }, [planBlocks, completedBlockIds, skippedBlockIds]);

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

  const scrollBottomPad = useMemo(() => tabBarScrollBottomInset(insets.bottom), [insets.bottom]);

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
      <SafeAreaView style={[styles.safe, { backgroundColor: shellBg }]} edges={['top']}>
        <ScrollView
          style={[styles.scroll, { backgroundColor: shellBg }]}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: scrollBottomPad, paddingTop: 16 },
          ]}
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
            isDark={isDark}
          />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 16,
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
