import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  getInitialHealthIntakeDataConfig,
  normalizeHealthIntakeDetailConfig,
  normalizeMedicineDetailConfig,
  type HealthIntakeDetailDataConfig,
} from '@entities/day-plan';

import { loadGoalDetailCategoryConfig } from '@shared/lib/storage';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';
import { MedicineSettings } from '../../medicine';

import type { GoalDetailCategoryKey } from '../../../../model/types';

/** 헤더·루틴 설정 전용 필드 — 본문 자동 저장이 덮어쓰지 않도록 제외 */
function omitCatalogAppearanceFields(config: HealthIntakeDetailDataConfig): Record<string, unknown> {
  const next: Record<string, unknown> = { ...config };
  delete next.displayName;
  delete next.icon;
  delete next.accentColor;
  return next;
}

export function HealthIntakeSettings({
  rhythmTitle,
  categoryKey = 'healthIntake',
  dataConfig,
  onChangeDataConfig,
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
  const c = useMemo(() => goalDetailSettingsPalette(false), []);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );

  const initial = normalizeHealthIntakeDetailConfig(dataConfig ?? getInitialHealthIntakeDataConfig());
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [summary, setSummary] = useState(initial.summary);
  const [medicine, setMedicine] = useState(initial.medicine);
  const waterSnapshotRef = useRef(initial.water);
  const lastRef = useRef<string | null>(null);
  const isSyncingFromPropsRef = useRef(false);
  const dataConfigRef = useRef(dataConfig);
  const onChangeDataConfigRef = useRef(onChangeDataConfig);
  dataConfigRef.current = dataConfig;
  onChangeDataConfigRef.current = onChangeDataConfig;

  useEffect(() => {
    const next = normalizeHealthIntakeDetailConfig(dataConfig ?? getInitialHealthIntakeDataConfig());
    isSyncingFromPropsRef.current = true;
    waterSnapshotRef.current = next.water;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setMedicine(next.medicine);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig]);

  useEffect(() => {
    if (isSyncingFromPropsRef.current) {
      isSyncingFromPropsRef.current = false;
      return;
    }
    const payload: HealthIntakeDetailDataConfig = normalizeHealthIntakeDetailConfig({
      ...(hideTitleField
        ? normalizeHealthIntakeDetailConfig(
            loadGoalDetailCategoryConfig(categoryKey) ?? getInitialHealthIntakeDataConfig(),
          )
        : normalizeHealthIntakeDetailConfig(
            dataConfigRef.current ?? getInitialHealthIntakeDataConfig(),
          )),
      ...(hideTitleField ? {} : { displayName }),
      summary,
      water: waterSnapshotRef.current,
      medicine,
    });
    const outgoing = hideTitleField ? omitCatalogAppearanceFields(payload) : payload;
    const s = JSON.stringify(outgoing);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfigRef.current(outgoing);
  }, [categoryKey, displayName, summary, medicine, hideTitleField]);

  return (
    <View style={styles.root}>
      {!hideTitleField ? (
        <RoutineTitleField
          value={displayName}
          onChangeValue={setDisplayName}
          fallback={titleFallback}
          allowRename={allowRename}
          renameLockedReason={renameLockedReason}
          palette={c}
        />
      ) : null}

      <RoutineSummaryField value={summary} onChangeValue={setSummary} palette={c} />

      <MedicineSettings
        embedded
        intakeMode
        rhythmTitle={rhythmTitle}
        categoryKey="healthIntake"
        dataConfig={medicine}
        onChangeDataConfig={(next) => setMedicine(normalizeMedicineDetailConfig(next))}
        allowRename={false}
        renameLockedReason={renameLockedReason}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 20 },
});

export {
  getInitialHealthIntakeDataConfig as getInitialHealthIntakeDataConfig,
  type HealthIntakeDetailDataConfig,
} from '@entities/day-plan';
