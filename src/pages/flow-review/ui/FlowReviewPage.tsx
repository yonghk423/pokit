import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  blockDurationSec,
  filterDayPlanFlowBlocks,
  formatMinuteOfDayKo,
  getOtherCategoryResolvedDisplayLabel,
  resolveBlockCategoryKey,
  resolveCategoryKeyFromLabel,
  useDayPlanStore,
  type DayPlanBlock,
} from '@entities/day-plan';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';
import { t, useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { useFlowReviewRoute } from '../model/useFlowReviewRoute';

const BG = '#F5F2EB';
const SURFACE = '#F4F2FF';
const SURFACE_LOW = '#E8E2D8';
const BORDER = '#000000';
const OUTLINE = '#436086';
const TEXT = '#181A2E';
const PRIMARY = '#356668';

const CATEGORY_META: Record<string, { icon: Parameters<typeof IconSymbol>[0]['name']; labelKey: Parameters<typeof t>[0] }> = {
  work: { icon: 'square.and.pencil', labelKey: 'flowReview.category.work' },
  reading: { icon: 'book.closed.fill', labelKey: 'flowReview.category.reading' },
  fasting: { icon: 'person.fill', labelKey: 'flowReview.category.fasting' },
  water: { icon: 'drop.fill', labelKey: 'flowReview.category.water' },
  medicine: { icon: 'pills.fill', labelKey: 'flowReview.category.medicine' },
  other: { icon: 'person.fill', labelKey: 'flowReview.category.other' },
};

type ReviewRow = {
  block: DayPlanBlock;
  categoryKey: string;
  title: string;
  subtitle: string;
  durationMin: number;
};

function toHHmm(minutes: number): string {
  const m = Math.max(0, Math.min(24 * 60, Math.floor(minutes)));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function getReviewCopy(block: DayPlanBlock, otherLabelFallback: string): { title: string; subtitle: string } {
  const lines = block.title
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const catKey = resolveBlockCategoryKey(block) ?? resolveCategoryKeyFromLabel(block.category) ?? 'other';
  const categoryFallback =
    catKey === 'other' ? otherLabelFallback : t(CATEGORY_META[catKey]?.labelKey ?? 'category.routineFallback');
  const first = lines[0] ?? '';
  const looksNumbered = /^\d+\.\s/.test(first);

  if (!first || looksNumbered) {
    const count = lines.length;
    return {
      title: block.category.trim() || categoryFallback,
      subtitle: count > 0 ? t('flowReview.subtitle.itemsReady', { count }) : t('flowReview.subtitle.tapToConfigure'),
    };
  }

  if (lines.length > 1) {
    return {
      title: first,
      subtitle: t('flowReview.subtitle.moreItems', { count: lines.length - 1 }),
    };
  }

  return {
    title: first,
    subtitle: t('flowReview.subtitle.categoryTap', { category: block.category.trim() || categoryFallback }),
  };
}

export function FlowReviewPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { startBlockId, blockIds } = useFlowReviewRoute();

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);

  const blocks = useDayPlanStore((s) => s.blocks);
  const isHydrated = useDayPlanStore((s) => s.isHydrated);
  const removeBlock = useDayPlanStore((s) => s.removeBlock);

  const rows = useMemo<ReviewRow[]>(() => {
    const otherLabelFallback = getOtherCategoryResolvedDisplayLabel(
      loadGoalDetailCategoryConfig('other'),
    );
    const byId = new Map(filterDayPlanFlowBlocks(blocks).map((block) => [block.id, block]));
    const ids = blockIds.length > 0 ? blockIds : startBlockId ? [startBlockId] : [];

    return ids
      .map((id) => byId.get(id))
      .filter((block): block is DayPlanBlock => Boolean(block))
      .map((block) => {
        const categoryKey =
          resolveBlockCategoryKey(block) ?? resolveCategoryKeyFromLabel(block.category) ?? 'other';
        const durationMin = Math.max(0, Math.round(blockDurationSec(block) / 60));
        const copy = getReviewCopy(block, otherLabelFallback);
        return { block, categoryKey, durationMin, ...copy };
      });
  }, [blocks, blockIds, startBlockId]);

  const totalDurationMin = useMemo(
    () => rows.reduce((sum, row) => sum + row.durationMin, 0),
    [rows],
  );
  const maxDurationMin = useMemo(
    () => Math.max(1, ...rows.map((row) => row.durationMin)),
    [rows],
  );

  const handleBackToEdit = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/day-plan');
  }, [router]);

  const handlePressCard = useCallback(
    (row: ReviewRow) => {
      router.push({
        pathname: '/goal-detail-settings',
        params: {
          categoryKey: row.categoryKey,
          startBlockId: row.block.id,
          blockIds: JSON.stringify([row.block.id]),
        },
      });
    },
    [router],
  );

  const handleStartTodayFlow = useCallback(() => {
    const targetBlockId = startBlockId?.trim() || rows[0]?.block.id;
    if (!targetBlockId) return;
    router.push({ pathname: '/activity-session', params: { blockId: targetBlockId } });
  }, [router, rows, startBlockId]);

  useEffect(() => {
    if (!isHydrated) return;
    if (rows.length > 0) return;
    router.replace('/day-plan');
  }, [isHydrated, rows.length, router]);

  const handleRemoveFlow = useCallback(
    (row: ReviewRow) => {
      Alert.alert(
        t('alert.deleteRoutine.title'),
        t('alert.deleteRoutine.message', { title: row.title }),
        [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: () => removeBlock(row.block.id),
        },
      ]);
    },
    [removeBlock],
  );

  if (rows.length === 0) {
    return (
      <ThemedView style={styles.screen} darkColor={BG} lightColor={BG}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen} darkColor={BG} lightColor={BG}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerBar}>
          <Pressable hitSlop={10} onPress={handleBackToEdit} style={styles.headerBtn}>
            <IconSymbol name="chevron.left" size={22} color={TEXT} />
          </Pressable>
          <View style={styles.headerCenter} />
          <View style={styles.headerBtn} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
            <ThemedText style={styles.heroKicker}>CURRENT SELECTION</ThemedText>
            <ThemedText style={styles.heroTitle}>{t('flowReview.heroTitle')}</ThemedText>
            <ThemedText style={styles.heroSub}>
              {t('flowReview.heroSub', { count: rows.length, minutes: totalDurationMin })}
            </ThemedText>
          </View>

          <View style={styles.list}>
            {rows.map((row, index) => {
              const meta = CATEGORY_META[row.categoryKey] ?? CATEGORY_META.other;
              const ratio = Math.max(0.12, row.durationMin / maxDurationMin);
              return (
                <Pressable
                  key={row.block.id}
                  onPress={() => handlePressCard(row)}
                  style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed,
                  ]}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardLeft}>
                      <View style={styles.iconWrap}>
                        <IconSymbol name={meta.icon} size={24} color={PRIMARY} />
                      </View>
                      <View style={styles.cardTextWrap}>
                        <View style={styles.cardTitleRow}>
                          <ThemedText style={styles.cardTitle} numberOfLines={1}>
                            {row.title}
                          </ThemedText>
                          <View style={styles.orderBadge}>
                            <ThemedText style={styles.orderBadgeText}>{index + 1}</ThemedText>
                          </View>
                        </View>
                        <ThemedText style={styles.cardSubtitle} numberOfLines={2}>
                          {row.subtitle}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.cardRight}>
                      <ThemedText style={styles.cardTimeStart}>{toHHmm(row.block.startMinutes)}</ThemedText>
                      <ThemedText style={styles.cardTimeEnd}>
                        -{' '}
                        {row.block.endsNextCalendarDay
                          ? formatMinuteOfDayKo(row.block.endMinutes)
                          : toHHmm(row.block.endMinutes)}
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.cardBottom}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.round(ratio * 100)}%` }]} />
                    </View>
                    <ThemedText style={styles.durationText}>{row.durationMin} MIN</ThemedText>
                  </View>

                  <View style={styles.cardFooter}>
                    <ThemedText style={styles.cardFooterText}>{t('flowReview.openDetail')}</ThemedText>
                    <View style={styles.cardFooterActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('flowReview.removeRoutine')}
                        hitSlop={8}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleRemoveFlow(row);
                        }}
                        style={({ pressed }) => [styles.removeBtn, pressed && styles.removeBtnPressed]}>
                        <IconSymbol name="trash" size={14} color={OUTLINE} />
                      </Pressable>
                      <IconSymbol name="chevron.right" size={16} color={OUTLINE} />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.bottomActions}>
          <Pressable style={styles.primaryButton} onPress={handleStartTodayFlow}>
            <ThemedText style={styles.primaryButtonText}>{t('flowReview.startToday')}</ThemedText>
          </Pressable>
          <Pressable onPress={handleBackToEdit} style={styles.secondaryAction}>
            <ThemedText style={styles.secondaryActionText}>{t('flowReview.editRoutines')}</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  headerBar: {
    paddingHorizontal: 18,
    paddingTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
    gap: 32,
  },
  heroSection: { gap: 8, marginBottom: 8 },
  heroKicker: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: TEXT,
    fontSize: 40,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  heroSub: {
    color: OUTLINE,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
    maxWidth: '82%',
  },
  list: { gap: 16 },
  card: {
    borderRadius: 0,
    padding: 20,
    backgroundColor: SURFACE,
    borderWidth: 2,
    borderColor: BORDER,
    overflow: 'hidden',
    gap: 16,
    elevation: 0,
    shadowOpacity: 0,
  },
  cardPressed: {
    opacity: 0.92,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  cardLeft: { flex: 1, flexDirection: 'row', gap: 14, minWidth: 0 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: SURFACE_LOW,
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: { flex: 1, gap: 6, minWidth: 0 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  cardTitle: {
    flex: 1,
    color: TEXT,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  orderBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 0,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: OUTLINE,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  cardRight: { alignItems: 'flex-end', gap: 2, flexShrink: 0 },
  cardTimeStart: {
    color: PRIMARY,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
  cardTimeEnd: {
    color: OUTLINE,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 0,
    backgroundColor: PRIMARY,
  },
  durationText: {
    color: OUTLINE,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFooterActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  removeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  removeBtnPressed: {
    opacity: 0.75,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  cardFooterText: {
    color: TEXT,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '700',
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: BORDER,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 0,
    shadowOpacity: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  secondaryAction: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryActionText: {
    color: OUTLINE,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
