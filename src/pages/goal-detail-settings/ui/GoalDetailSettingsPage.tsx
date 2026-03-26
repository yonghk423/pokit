import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import {
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { selectFirstPendingBlock, useDayPlanStore } from '@entities/day-plan/model';

import { useGoalDetailSettingsRoute } from '../model/useGoalDetailSettingsRoute';
import { getGoalDetailCategoryModule } from './category';

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

export function GoalDetailSettingsPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);

  const { rhythmTitle, categoryKey, startBlockId } = useGoalDetailSettingsRoute();
  const module = useMemo(() => getGoalDetailCategoryModule(categoryKey), [categoryKey]);
  const Preview = module.Preview;
  const Settings = module.Settings;

  const getInitialDataConfig = useCallback(
    () => module.getInitialDataConfig?.() ?? {},
    [module],
  );

  const loadInitialByCategory = useCallback(() => {
    const persisted = loadGoalDetailCategoryConfig(categoryKey);
    return persisted ?? getInitialDataConfig();
  }, [categoryKey, getInitialDataConfig]);

  const [dataConfig, setDataConfig] = useState<unknown>(() => loadInitialByCategory());
  const handleChangeDataConfig = useCallback(
    (next: unknown) => {
      setDataConfig(next);
      saveGoalDetailCategoryConfig(categoryKey, next);
    },
    [categoryKey],
  );

  useEffect(() => {
    setDataConfig(loadInitialByCategory());
  }, [loadInitialByCategory]);

  const handleCompleteAndStart = useCallback(() => {
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
  }, [router, startBlockId]);

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
          <View style={styles.previewSection}>
            <Preview rhythmTitle={rhythmTitle} dataConfig={dataConfig} />
          </View>

          <View style={styles.padded}>
            <Settings rhythmTitle={rhythmTitle} dataConfig={dataConfig} onChangeDataConfig={handleChangeDataConfig} />
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
  previewSection: { paddingHorizontal: 24, paddingTop: 20 },
  padded: { paddingHorizontal: 24, gap: 22, marginTop: 18 },
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
