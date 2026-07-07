import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { normalizeWorkDetailConfig, type WorkDetailDataConfig } from '@entities/day-plan';
import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { StudyDocumentEditor } from '@widgets/study-note-document';
import { getInitialWorkDataConfig } from './workConfig';

export function WorkSettings({
  dataConfig,
  onChangeDataConfig,
  categoryKey = 'work',
}: {
  rhythmTitle: string;
  categoryKey?: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
  onDeleteCategory?: () => void;
}) {
  const c = useMemo(() => goalDetailSettingsPalette(false), []);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const editorViewportHeight = useMemo(() => {
    const goalHeaderHeight = 56;
    const footerHeight = 40 + Math.max(insets.bottom, 6);
    const routineToggleReserve = 40;
    return Math.max(
      300,
      windowHeight -
        insets.top -
        goalHeaderHeight -
        footerHeight -
        routineToggleReserve,
    );
  }, [insets.bottom, insets.top, windowHeight]);

  const initial = normalizeWorkDetailConfig(dataConfig ?? getInitialWorkDataConfig());
  const [document, setDocument] = useState(initial.document);
  const hydratedKeyRef = useRef<string | null>(null);

  const documentRef = useRef(document);
  documentRef.current = document;

  useEffect(() => {
    const next = normalizeWorkDetailConfig(dataConfig ?? getInitialWorkDataConfig());
    const incomingKey = JSON.stringify(next.document);
    const localKey = JSON.stringify(documentRef.current);
    if (hydratedKeyRef.current === incomingKey) return;
    if (
      hydratedKeyRef.current != null &&
      localKey !== hydratedKeyRef.current &&
      incomingKey !== localKey
    ) {
      return;
    }
    hydratedKeyRef.current = incomingKey;
    setDocument(next.document);
  }, [dataConfig]);

  const draftConfig = useMemo((): WorkDetailDataConfig => {
    const fromProps =
      dataConfig && typeof dataConfig === 'object' ? (dataConfig as Record<string, unknown>) : {};
    const stored = loadGoalDetailCategoryConfig(categoryKey);
    const fromStored =
      stored && typeof stored === 'object' ? (stored as Record<string, unknown>) : {};
    return normalizeWorkDetailConfig({
      ...fromStored,
      ...fromProps,
      document,
    });
  }, [categoryKey, dataConfig, document]);
  const draftConfigRef = useRef(draftConfig);
  draftConfigRef.current = draftConfig;
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef<string | null>(null);

  useEffect(() => {
    const serialized = JSON.stringify(draftConfig);
    if (lastSentRef.current === serialized) return;

    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      const latest = JSON.stringify(draftConfigRef.current);
      if (lastSentRef.current === latest) return;
      lastSentRef.current = latest;
      onChangeDataConfig(draftConfigRef.current);
    }, 450);

    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [draftConfig, onChangeDataConfig]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      const latest = JSON.stringify(draftConfigRef.current);
      if (lastSentRef.current === latest) return;
      lastSentRef.current = latest;
      onChangeDataConfig(draftConfigRef.current);
    };
  }, [onChangeDataConfig]);

  return (
    <View style={styles.root}>
      <StudyDocumentEditor
        document={document}
        onChangeDocument={setDocument}
        palette={c}
        viewportHeight={editorViewportHeight}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignSelf: 'stretch' },
});
