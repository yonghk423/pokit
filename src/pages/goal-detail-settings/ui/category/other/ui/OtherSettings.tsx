import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  isCustomFlowCategoryKey,
  resolveCustomFlowTemplateKey,
} from '@entities/day-plan';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialOtherDataConfig,
  normalizeOtherDetailConfig,
} from './otherConfig';

/**
 * 할 일/절제 루틴 상세 설정 — 이름만 편집.
 * 요약·할 일 목록·공유는 데이플랜 아코디언에서 다룬다.
 */
export function OtherSettings({
  rhythmTitle,
  dataConfig,
  onChangeDataConfig,
  categoryKey,
  allowRename = true,
  renameLockedReason = null,
  hideTitleField = false,
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
  hideTitleField?: boolean;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const seed = () => normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());
  const templateKey = resolveCustomFlowTemplateKey(dataConfig ?? getInitialOtherDataConfig());
  const isAbstain = templateKey === 'abstain';

  const [displayName, setDisplayName] = useState(() => seed().displayName);
  const lastPersistedRef = useRef<string | null>(null);
  const isSyncingFromPropsRef = useRef(false);

  const buildPayload = useCallback(
    (nextRaw: unknown) => {
      const appearanceBase = normalizeOtherDetailConfig(dataConfig ?? getInitialOtherDataConfig());
      const mergedRaw =
        typeof nextRaw === 'object' && nextRaw ? (nextRaw as Record<string, unknown>) : {};
      return normalizeOtherDetailConfig({
        ...mergedRaw,
        displayName,
        summary: appearanceBase.summary,
        checklist: appearanceBase.checklist,
        ...(isAbstain ? { templateKey: 'abstain' as const } : {}),
        ...(categoryKey && isCustomFlowCategoryKey(categoryKey) && !isAbstain
          ? { templateKey: 'checklist' as const }
          : {}),
        ...(appearanceBase.icon ? { icon: appearanceBase.icon } : {}),
        ...(appearanceBase.accentColor ? { accentColor: appearanceBase.accentColor } : {}),
      });
    },
    [categoryKey, dataConfig, displayName, isAbstain],
  );

  useEffect(() => {
    const next = seed();
    isSyncingFromPropsRef.current = true;
    setDisplayName(next.displayName);
    lastPersistedRef.current = JSON.stringify(next);
  }, [dataConfig]);

  useEffect(() => {
    if (isSyncingFromPropsRef.current) {
      isSyncingFromPropsRef.current = false;
      return;
    }
    const payload = buildPayload(dataConfig);
    const serialized = JSON.stringify(payload);
    if (lastPersistedRef.current === serialized) return;
    lastPersistedRef.current = serialized;
    onChangeDataConfig(payload);
  }, [buildPayload, dataConfig, displayName, onChangeDataConfig]);

  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );

  if (hideTitleField) {
    return null;
  }

  return (
    <View style={styles.shell}>
      <RoutineTitleField
        value={displayName}
        onChangeValue={setDisplayName}
        fallback={titleFallback}
        allowRename={allowRename}
        renameLockedReason={renameLockedReason}
        palette={c}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 18, paddingVertical: 6 },
});
