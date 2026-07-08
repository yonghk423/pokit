import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  normalizeWorkDetailConfig,
  type WorkStudyDocument,
} from '@entities/day-plan';
import {
  loadGoalDetailCategoryConfig,
  saveGoalDetailCategoryConfig,
} from '@shared/lib/storage/goalDetailSettingsStorage';
import { StudyDocumentEditor, studyNoteDocumentPalette } from '@widgets/study-note-document';

import type { DayPlanPalette } from '../lib/dayPlanPalette';

const WORK_CATEGORY_KEY = 'work';

function loadWorkDocument(): WorkStudyDocument {
  const raw = loadGoalDetailCategoryConfig(WORK_CATEGORY_KEY);
  return normalizeWorkDetailConfig(raw ?? {}).document;
}

function persistWorkDocument(document: WorkStudyDocument): void {
  const raw = loadGoalDetailCategoryConfig(WORK_CATEGORY_KEY);
  const base = raw && typeof raw === 'object' ? raw : {};
  saveGoalDetailCategoryConfig(WORK_CATEGORY_KEY, { ...base, document });
}

type Props = {
  c: DayPlanPalette;
  isDark: boolean;
};

/** 오늘 탭 — 노트 루틴과 동일한 문서 편집 (상시 접근) */
export function DayNotePlanSection({ c, isDark }: Props) {
  const palette = useMemo(() => studyNoteDocumentPalette(isDark), [isDark]);
  const keyboardBottomChromeInset = useBottomTabBarHeight();

  const [document, setDocument] = useState<WorkStudyDocument>(loadWorkDocument);
  const documentRef = useRef(document);
  documentRef.current = document;

  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef<string | null>(null);

  const flushPersist = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const latest = JSON.stringify(documentRef.current);
    if (lastSentRef.current === latest) return;
    lastSentRef.current = latest;
    persistWorkDocument(documentRef.current);
  }, []);

  useEffect(() => {
    const serialized = JSON.stringify(document);
    if (lastSentRef.current === serialized) return;

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(flushPersist, 450);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [document, flushPersist]);

  useEffect(() => {
    return () => {
      flushPersist();
    };
  }, [flushPersist]);

  return (
    <View style={[styles.root, { backgroundColor: c.containerLow }]}>
      <StudyDocumentEditor
        document={document}
        onChangeDocument={setDocument}
        palette={palette}
        keyboardToolbarMode="docked"
        keyboardBottomChromeInset={keyboardBottomChromeInset}
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
