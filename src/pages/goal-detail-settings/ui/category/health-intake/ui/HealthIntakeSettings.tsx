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
}: {
  rhythmTitle: string;
  categoryKey?: GoalDetailCategoryKey;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
  allowRename?: boolean;
  renameLockedReason?: 'running' | 'today' | null;
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
  const hydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const next = normalizeHealthIntakeDetailConfig(dataConfig ?? getInitialHealthIntakeDataConfig());
    const key = JSON.stringify(next);
    if (hydratedKeyRef.current === key) return;
    hydratedKeyRef.current = key;
    waterSnapshotRef.current = next.water;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setMedicine(next.medicine);
  }, [dataConfig]);

  useEffect(() => {
    const prev = dataConfig && typeof dataConfig === 'object' ? dataConfig : {};
    const payload: HealthIntakeDetailDataConfig = normalizeHealthIntakeDetailConfig({
      ...prev,
      displayName,
      summary,
      water: waterSnapshotRef.current,
      medicine,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [dataConfig, displayName, summary, medicine, onChangeDataConfig]);

  return (
    <View style={styles.root}>
      <RoutineTitleField
        value={displayName}
        onChangeValue={setDisplayName}
        fallback={titleFallback}
        allowRename={allowRename}
        renameLockedReason={renameLockedReason}
        palette={c}
      />

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
