import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  getInitialReadingDataConfig,
  ReadingSettings,
} from '@pages/goal-detail-settings/ui/category/reading';
import {
  normalizeReadingLiveActivityConfig,
  seedReadingBookstoreIfNeeded,
} from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import {
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage/goalDetailSettingsStorage';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

const READING_CATEGORY_KEY = 'reading';

function serializeReadingConfig(value: unknown): string {
  return JSON.stringify(normalizeReadingLiveActivityConfig(value));
}

function loadReadingConfig(): ReturnType<typeof normalizeReadingLiveActivityConfig> {
  seedReadingBookstoreIfNeeded();
  const raw = loadGoalDetailCategoryConfig(READING_CATEGORY_KEY);
  return normalizeReadingLiveActivityConfig(raw ?? getInitialReadingDataConfig());
}

function persistReadingConfig(next: unknown): void {
  saveGoalDetailCategoryConfig(READING_CATEGORY_KEY, normalizeReadingLiveActivityConfig(next));
}

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
};

/** 오늘 탭 — 독서 루틴과 동일한 내 서재 UI (상시 접근) */
export function ReadingPlanSection({ c, isDark: _isDark }: Props) {
  const { t } = useTranslation();
  const [dataConfig, setDataConfig] = useState(() => loadReadingConfig());
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedRef = useRef(serializeReadingConfig(dataConfig));
  const pendingDraftRef = useRef(dataConfig);
  const skipNextFocusSyncRef = useRef(false);

  const flushPersist = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const next = pendingDraftRef.current;
    const serialized = serializeReadingConfig(next);
    if (lastPersistedRef.current === serialized) return;
    lastPersistedRef.current = serialized;
    persistReadingConfig(next);
  }, []);

  const handleChangeDataConfig = useCallback(
    (next: unknown) => {
      const normalized = normalizeReadingLiveActivityConfig(next);
      const serialized = JSON.stringify(normalized);
      pendingDraftRef.current = normalized;

      setDataConfig((prev) => {
        if (JSON.stringify(prev) === serialized) return prev;
        return normalized;
      });

      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      if (lastPersistedRef.current === serialized) return;

      // 로컬 저장 직후 focus sync가 디스크로 되돌리지 않게
      skipNextFocusSyncRef.current = true;
      persistTimerRef.current = setTimeout(() => {
        persistTimerRef.current = null;
        flushPersist();
      }, 450);
    },
    [flushPersist],
  );

  useEffect(() => {
    return () => {
      flushPersist();
    };
  }, [flushPersist]);

  useFocusEffect(
    useCallback(() => {
      if (skipNextFocusSyncRef.current) {
        skipNextFocusSyncRef.current = false;
        return;
      }
      if (persistTimerRef.current) return;

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
      <ReadingSettings
        rhythmTitle={t('planMode.reading')}
        categoryKey="reading"
        dataConfig={dataConfig}
        onChangeDataConfig={handleChangeDataConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
});
