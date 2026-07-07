import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useDayPlanDraftStore } from '@entities/day-plan';
import {
  getInitialReadingDataConfig,
  ReadingSettings,
} from '@pages/goal-detail-settings/ui/category/reading';
import {
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage/goalDetailSettingsStorage';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

const READING_CATEGORY_KEY = 'reading';

function loadReadingConfig(): unknown {
  return loadGoalDetailCategoryConfig(READING_CATEGORY_KEY) ?? getInitialReadingDataConfig();
}

function persistReadingConfig(next: unknown): void {
  const prev = loadGoalDetailCategoryConfig(READING_CATEGORY_KEY);
  const base = prev && typeof prev === 'object' ? prev : {};
  const patch = next && typeof next === 'object' ? next : {};
  saveGoalDetailCategoryConfig(READING_CATEGORY_KEY, { ...base, ...patch });
  useDayPlanDraftStore.getState().bumpCategoryLabelEpoch();
}

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
};

/** 오늘 탭 — 독서 루틴과 동일한 내 서재 UI (상시 접근) */
export function ReadingPlanSection({ c, isDark: _isDark }: Props) {
  const [dataConfig, setDataConfig] = useState<unknown>(() => loadReadingConfig());
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedRef = useRef(JSON.stringify(dataConfig));
  const pendingDraftRef = useRef<unknown>(dataConfig);

  const flushPersist = useCallback((next: unknown) => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const serialized = JSON.stringify(next);
    if (lastPersistedRef.current === serialized) return;
    lastPersistedRef.current = serialized;
    persistReadingConfig(next);
  }, []);

  const handleChangeDataConfig = useCallback(
    (next: unknown) => {
      pendingDraftRef.current = next;
      const serialized = JSON.stringify(next);
      if (lastPersistedRef.current === serialized) return;

      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
      }
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        flushPersist(next);
      }, 450);
    },
    [flushPersist],
  );

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
        flushPersist(pendingDraftRef.current);
      }
    };
  }, [flushPersist]);

  useFocusEffect(
    useCallback(() => {
      const latest = loadReadingConfig();
      const serialized = JSON.stringify(latest);
      if (serialized === lastPersistedRef.current) return;
      lastPersistedRef.current = serialized;
      pendingDraftRef.current = latest;
      setDataConfig(latest);
    }, []),
  );

  return (
    <View style={[styles.root, { backgroundColor: c.containerLow }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <ReadingSettings
          rhythmTitle="독서"
          categoryKey="reading"
          dataConfig={dataConfig}
          onChangeDataConfig={handleChangeDataConfig}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});
