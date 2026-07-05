import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  getInitialHealthIntakeDataConfig,
  normalizeHealthIntakeDetailConfig,
  normalizeMedicineDetailConfig,
  type HealthIntakeDetailDataConfig,
} from '@entities/day-plan';
import { ThemedText } from '@shared/ui/themed-text';

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
    const payload: HealthIntakeDetailDataConfig = normalizeHealthIntakeDetailConfig({
      displayName,
      summary,
      water: waterSnapshotRef.current,
      medicine,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [displayName, summary, medicine, onChangeDataConfig]);

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

      <View style={styles.heading}>
        <ThemedText style={[styles.title, { color: c.onSurface }]}>건강을 위한 섭취</ThemedText>
        <ThemedText style={[styles.sub, { color: c.onVariant }]}>
          약·영양제·보조제 등 섭취 습관을 한곳에서 관리해요.
        </ThemedText>
      </View>

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
  heading: { gap: 6 },
  title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28 },
  sub: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
});

export {
  getInitialHealthIntakeDataConfig as getInitialHealthIntakeDataConfig,
  type HealthIntakeDetailDataConfig,
} from '@entities/day-plan';
