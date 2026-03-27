import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  loadGoalDetailBlockConfig,
  loadGoalDetailCategoryConfig,
  saveGoalDetailBlockConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { selectFirstPendingBlock, useDayPlanStore, type DayPlanBlock } from '@entities/day-plan/model';

import { useGoalDetailSettingsRoute } from '../model/useGoalDetailSettingsRoute';
import { getGoalDetailCategoryModule } from './category';
import type { GoalDetailCategoryKey } from '../model/types';

function palette(isDark: boolean) {
  if (isDark) {
    return {
      bg: '#09090b',
      onSurface: '#fafafa',
      onVariant: '#a1a1aa',
      outline: '#71717a',
      border: 'rgba(255,255,255,0.08)',
    };
  }
  return {
    bg: '#fafafa',
    onSurface: '#18181b',
    onVariant: '#52525b',
    outline: '#a1a1aa',
    border: 'rgba(0,0,0,0.08)',
  };
}

const PRIMARY = 'rgb(249, 115, 22)';

/** `DayPlanPage`에서 addBlock 시 넣는 임시 제목과 동일해야 함 */
const TEMP_FLOW_BLOCK_TITLE = '플로우';

function mergeFlowNameIntoBlockTitle(currentTitle: string, flowName: string): string {
  const c = currentTitle.trim();
  if (!c || c === TEMP_FLOW_BLOCK_TITLE) return flowName;
  return `${flowName}\n${c}`;
}

type EditingTarget = {
  blockId: string;
  categoryKey: GoalDetailCategoryKey;
  timeLabel: string;
};

function inferCategoryKeyFromLabel(category: string): GoalDetailCategoryKey {
  const t = category.trim();
  if (t === '러닝') return 'run';
  if (t === '업무') return 'work';
  if (t === '독서') return 'reading';
  if (t === '공부') return 'study';
  if (t === '명상') return 'meditation';
  if (t === '요가') return 'yoga';
  if (t === '휴식') return 'rest';
  if (t === '수분') return 'water';
  if (t === '약 복용') return 'medicine';
  if (t === '스트레칭') return 'stretch';
  return 'other';
}

function toHHmm(minutes: number): string {
  const m = Math.max(0, Math.min(24 * 60, Math.floor(minutes)));
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function blockTimeLabel(block: DayPlanBlock): string {
  return `${toHHmm(block.startMinutes)} - ${toHHmm(block.endMinutes)}`;
}

export function GoalDetailSettingsPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);

  const { rhythmTitle: rhythmTitleParam, categoryKey, startBlockId, blockIds } =
    useGoalDetailSettingsRoute();

  const [rhythmName, setRhythmName] = useState(rhythmTitleParam);

  useEffect(() => {
    setRhythmName(rhythmTitleParam);
  }, [rhythmTitleParam]);

  useEffect(() => {
    useDayPlanStore.getState().hydrate();
  }, []);
  const blocks = useDayPlanStore((s) => s.blocks);

  const targets = useMemo<EditingTarget[]>(() => {
    const byId = new Map(blocks.map((b) => [b.id, b]));
    const ids = blockIds.length > 0 ? blockIds : startBlockId ? [startBlockId] : [];
    const uniqueIds = [...new Set(ids)];
    const rows: EditingTarget[] = [];

    for (const id of uniqueIds) {
      const b = byId.get(id);
      if (!b) continue;
      rows.push({
        blockId: b.id,
        categoryKey: inferCategoryKeyFromLabel(b.category),
        timeLabel: blockTimeLabel(b),
      });
    }

    if (rows.length > 0) return rows;
    return [
      {
        blockId: startBlockId?.trim() || 'single',
        categoryKey,
        timeLabel: '-',
      },
    ];
  }, [blocks, blockIds, categoryKey, startBlockId]);

  const [dataByBlockId, setDataByBlockId] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const next: Record<string, unknown> = {};
    for (const t of targets) {
      const module = getGoalDetailCategoryModule(t.categoryKey);
      const fallback = module.getInitialDataConfig?.() ?? {};
      const byBlock = loadGoalDetailBlockConfig(t.blockId);
      const byCategory = loadGoalDetailCategoryConfig(t.categoryKey);
      next[t.blockId] = byBlock ?? byCategory ?? fallback;
    }
    setDataByBlockId(next);
  }, [targets]);

  const handleChangeDataConfig = useCallback((target: EditingTarget, next: unknown) => {
    setDataByBlockId((prev) => ({ ...prev, [target.blockId]: next }));
    saveGoalDetailBlockConfig(target.blockId, next);
    // 기존 카테고리 단위 데이터도 함께 갱신(하위 호환)
    saveGoalDetailCategoryConfig(target.categoryKey, next);
  }, []);

  const handleCompleteAndStart = useCallback(() => {
    const name = rhythmName.trim();

    const ids = targets
      .map((t) => t.blockId)
      .filter((id) => Boolean(id) && id !== 'single');
    if (ids.length > 0 && name) {
      const idSet = new Set(ids);
      const current = useDayPlanStore.getState().blocks;
      const next = current.map((b) =>
        idSet.has(b.id) ? { ...b, title: mergeFlowNameIntoBlockTitle(b.title, name) } : b,
      );
      useDayPlanStore.getState().setBlocks(next);
    }

    const fromRoute = startBlockId?.trim();
    if (fromRoute) {
      router.replace({ pathname: '/activity-session', params: { blockId: fromRoute } });
      return;
    }
    const pending = selectFirstPendingBlock(useDayPlanStore.getState());
    if (pending?.id) {
      router.replace({ pathname: '/activity-session', params: { blockId: pending.id } });
      return;
    }
    router.replace('/(tabs)');
  }, [router, rhythmName, startBlockId, targets]);

  const previewTitleForBlock = useCallback(
    (blockId: string) => {
      const b = blocks.find((x) => x.id === blockId);
      const firstLine = b?.title?.trim().split('\n')[0]?.trim() ?? '';
      return firstLine || rhythmName.trim() || '플로우';
    },
    [blocks, rhythmName],
  );

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.bg }]} darkColor={c.bg} lightColor={c.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark ? 'rgba(9,9,11,0.92)' : 'rgba(255,255,255,0.92)',
              borderBottomColor: c.border,
            },
          ]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <IconSymbol name="chevron.left" size={22} color={c.onSurface} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: c.onSurface }]}>목표 상세 설정</ThemedText>
          <Pressable onPress={() => router.push('/widget-settings')} style={styles.headerBtn} hitSlop={8}>
            <IconSymbol name="gearshape" size={20} color={PRIMARY} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={styles.padded}>
            <View style={styles.summaryCard}>
              <ThemedText style={[styles.summaryTitle, { color: c.onSurface }]}>
                총 {targets.length}개 블록 목표 설정
              </ThemedText>
              <ThemedText style={[styles.summarySub, { color: c.onVariant }]}>
                같은 화면에서 순서대로 설정하고 바로 시작할 수 있어요.
              </ThemedText>
            </View>

            <View style={styles.nameBlock}>
              <ThemedText style={[styles.labelUpper, { color: c.onVariant }]}>
                플로우 이름 (선택)
              </ThemedText>
              <View style={[styles.namePill, { backgroundColor: isDark ? '#18181b' : '#f4f4f5' }]}>
                <TextInput
                  value={rhythmName}
                  onChangeText={setRhythmName}
                  placeholder="모든 블록 앞에 붙일 이름이 있으면 입력"
                  placeholderTextColor={c.outline}
                  style={[styles.nameInput, { color: c.onSurface }]}
                />
                <View style={styles.nameHintRow}>
                  <IconSymbol name="pencil" size={14} color={PRIMARY} />
                  <ThemedText style={[styles.nameHint, { color: c.onVariant }]}>
                    새 플로우 설정에서 제목을 넣었다면 비워도 돼요
                  </ThemedText>
                </View>
              </View>
            </View>

            {targets.map((t, idx) => {
              const module = getGoalDetailCategoryModule(t.categoryKey);
              const Preview = module.Preview;
              const Settings = module.Settings;
              const dataConfig = dataByBlockId[t.blockId] ?? module.getInitialDataConfig?.() ?? {};
              const previewTitle = previewTitleForBlock(t.blockId);
              return (
                <View key={`${t.blockId}-${idx}`} style={styles.blockSection}>
                  <View style={styles.blockSectionHead}>
                    <ThemedText style={[styles.blockOrder, { color: PRIMARY }]}>
                      {idx + 1}
                    </ThemedText>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={[styles.blockTitle, { color: c.onSurface }]}>
                        {module.titleKo}
                      </ThemedText>
                      <ThemedText style={[styles.blockSub, { color: c.onVariant }]}>
                        {t.timeLabel}
                      </ThemedText>
                    </View>
                  </View>
                  <View style={styles.previewSection}>
                    <Preview rhythmTitle={previewTitle} dataConfig={dataConfig} />
                  </View>
                  <Settings
                    rhythmTitle={previewTitle}
                    dataConfig={dataConfig}
                    onChangeDataConfig={(next) => handleChangeDataConfig(t, next)}
                  />
                </View>
              );
            })}
            <Pressable style={styles.cta} onPress={handleCompleteAndStart}>
              <ThemedText style={styles.ctaText}>설정 완료 및 시작</ThemedText>
            </Pressable>
            <ThemedText style={[styles.ctaFootnote, { color: c.outline }]}>
              설정한 목표는 LockFlow 추적에 반영할 수 있어요.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  scrollContent: { paddingBottom: 48 },
  previewSection: { paddingHorizontal: 2, paddingTop: 8 },
  padded: { paddingHorizontal: 24, gap: 22, marginTop: 18 },
  summaryCard: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: 'rgba(249,115,22,0.08)' },
  summaryTitle: { fontSize: 16, fontWeight: '800' },
  summarySub: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  blockSection: { gap: 12, paddingVertical: 8 },
  blockSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 },
  blockOrder: { fontSize: 22, fontWeight: '900', width: 24, textAlign: 'center' },
  blockTitle: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  blockSub: { fontSize: 12, marginTop: 2 },
  nameBlock: { gap: 10 },
  labelUpper: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  namePill: {
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 20,
  },
  nameInput: { fontSize: 22, fontWeight: '800', padding: 0 },
  nameHintRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  nameHint: { fontSize: 12, fontWeight: '600' },
  cta: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  ctaFootnote: { textAlign: 'center', fontSize: 12, marginTop: -16, lineHeight: 18 },
});
