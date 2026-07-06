import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { normalizeWorkDetailConfig, type WorkDetailDataConfig } from '@entities/day-plan';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import { StudyDocumentEditor } from './StudyDocumentEditor';
import { getInitialWorkDataConfig } from './workConfig';

export function WorkSettings({
  dataConfig,
  onChangeDataConfig,
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

  const draftConfig = useMemo(
    (): WorkDetailDataConfig =>
      normalizeWorkDetailConfig({
        ...(dataConfig && typeof dataConfig === 'object' ? dataConfig : {}),
        document,
      }),
    [dataConfig, document],
  );
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
      <StudyDocumentEditor document={document} onChangeDocument={setDocument} palette={c} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', alignSelf: 'stretch' },
});
