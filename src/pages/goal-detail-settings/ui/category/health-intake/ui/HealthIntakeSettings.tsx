import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  getInitialHealthIntakeDataConfig,
  normalizeHealthIntakeDetailConfig,
  normalizeMedicineDetailConfig,
  type HealthIntakeDetailDataConfig,
} from '@entities/day-plan';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';
import { MedicineSettings } from '../../medicine';

import type { GoalDetailCategoryKey } from '../../../../model/types';

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
    const appearanceBase = normalizeHealthIntakeDetailConfig(
      dataConfigRef.current ?? getInitialHealthIntakeDataConfig(),
    );
    const payload: HealthIntakeDetailDataConfig = normalizeHealthIntakeDetailConfig({
      ...appearanceBase,
      ...(hideTitleField ? {} : { displayName }),
      summary,
      water: waterSnapshotRef.current,
      medicine,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfigRef.current(payload);
  }, [displayName, summary, medicine, hideTitleField]);

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
