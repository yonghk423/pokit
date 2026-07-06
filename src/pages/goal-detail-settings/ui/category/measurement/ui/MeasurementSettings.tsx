import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { ThemedText } from '@shared/ui/themed-text';

import type { GoalDetailCategoryKey } from '../../../../model/types';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';
import { RoutineSummaryField } from '../../lib/RoutineSummaryField';
import { RoutineTitleField } from '../../lib/RoutineTitleField';
import { resolveRoutineTitleFallback } from '../../lib/routineTitleFallback';

import {
  getInitialMeasurementDataConfig,
  MEASUREMENT_UNIT_OPTIONS,
  normalizeMeasurementDetailConfig,
  type MeasurementDetailDataConfig,
  type MeasurementFrequency,
  type MeasurementUnitKey,
} from './measurementConfig';

function seedMeasurement(raw: unknown) {
  return normalizeMeasurementDetailConfig(raw ?? getInitialMeasurementDataConfig());
}

export function MeasurementSettings({
  rhythmTitle,
  categoryKey,
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
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);
  const titleFallback = useMemo(
    () => resolveRoutineTitleFallback(categoryKey, rhythmTitle),
    [categoryKey, rhythmTitle],
  );
  const initial = seedMeasurement(dataConfig);

  const [displayName, setDisplayName] = useState(initial.displayName);
  const [summary, setSummary] = useState(initial.summary);
  const [metricLabel, setMetricLabel] = useState(initial.metricLabel);
  const [unit, setUnit] = useState<MeasurementUnitKey>(initial.unit);
  const [useGoalValue, setUseGoalValue] = useState(initial.useGoalValue);
  const [goalValueStr, setGoalValueStr] = useState(
    initial.goalValue > 0 ? String(initial.goalValue) : '',
  );
  const [frequency, setFrequency] = useState<MeasurementFrequency>(initial.frequency);

  const lastRef = useRef<string | null>(null);
  const isSyncingRef = useRef(false);
  const dataConfigRef = useRef(dataConfig);
  const onChangeRef = useRef(onChangeDataConfig);
  dataConfigRef.current = dataConfig;
  onChangeRef.current = onChangeDataConfig;

  useEffect(() => {
    const next = seedMeasurement(dataConfig);
    isSyncingRef.current = true;
    setDisplayName(next.displayName);
    setSummary(next.summary);
    setMetricLabel(next.metricLabel);
    setUnit(next.unit);
    setUseGoalValue(next.useGoalValue);
    setGoalValueStr(next.goalValue > 0 ? String(next.goalValue) : '');
    setFrequency(next.frequency);
    lastRef.current = JSON.stringify(next);
  }, [dataConfig]);

  useEffect(() => {
    if (isSyncingRef.current) {
      isSyncingRef.current = false;
      return;
    }
    const appearanceBase = seedMeasurement(dataConfigRef.current);
    const goalRaw = parseFloat(goalValueStr.replace(',', '.'));
    const goalValue = Number.isFinite(goalRaw) ? goalRaw : 0;
    const payload: MeasurementDetailDataConfig = normalizeMeasurementDetailConfig({
      templateKey: 'measurement',
      displayName,
      summary,
      metricLabel,
      unit,
      useGoalValue,
      goalValue,
      currentValue: appearanceBase.currentValue,
      previousValue: appearanceBase.previousValue,
      history: appearanceBase.history,
      lastRecordedDateKey: appearanceBase.lastRecordedDateKey,
      frequency,
      ...(appearanceBase.icon ? { icon: appearanceBase.icon } : {}),
      ...(appearanceBase.accentColor ? { accentColor: appearanceBase.accentColor } : {}),
    });
    const serialized = JSON.stringify(payload);
    if (lastRef.current === serialized) return;
    lastRef.current = serialized;
    onChangeRef.current(payload);
  }, [displayName, summary, metricLabel, unit, useGoalValue, goalValueStr, frequency]);

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

      <RoutineSummaryField
        value={summary}
        onChangeValue={setSummary}
        palette={c}
        placeholder="한 줄 메모 (선택)"
      />

      <View style={[styles.section, { borderColor: c.outline }]}>
        <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>기록 설정</ThemedText>

        <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>무엇을 기록할까요?</ThemedText>
        <TextInput
          value={metricLabel}
          onChangeText={(v) => setMetricLabel(v.slice(0, 40))}
          placeholder="예: 체중, 혈압, 수면"
          placeholderTextColor={c.outline}
          style={[
            styles.input,
            { color: c.onSurface, borderColor: c.outline, backgroundColor: c.surfaceLowest },
          ]}
        />

        <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>단위</ThemedText>
        <View style={styles.chipsRow}>
          {MEASUREMENT_UNIT_OPTIONS.map((opt) => {
            const selected = unit === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setUnit(opt.key)}
                style={[
                  styles.chip,
                  {
                    borderColor: selected ? c.onSurface : c.outline,
                    backgroundColor: selected ? 'rgba(0,0,0,0.06)' : c.surfaceLowest,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.chipText,
                    {
                      color: selected ? c.onSurface : c.onVariant,
                      fontWeight: selected ? '700' : '500',
                    },
                  ]}>
                  {opt.labelKo}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.toggleRow}>
          <ThemedText style={[styles.fieldLabel, styles.toggleLabel, { color: c.onSurface }]}>
            목표값 사용
          </ThemedText>
          <Switch value={useGoalValue} onValueChange={setUseGoalValue} />
        </View>

        {useGoalValue ? (
          <>
            <ThemedText style={[styles.fieldLabel, { color: c.onVariant }]}>목표값</ThemedText>
            <TextInput
              value={goalValueStr}
              onChangeText={setGoalValueStr}
              placeholder="0"
              keyboardType="decimal-pad"
              placeholderTextColor={c.outline}
              style={[
                styles.input,
                { color: c.onSurface, borderColor: c.outline, backgroundColor: c.surfaceLowest },
              ]}
            />
          </>
        ) : null}

        <ThemedText style={[styles.helper, { color: c.onVariant }]}>
          세션에서 숫자를 입력하면 오늘 기록으로 저장돼요.
        </ThemedText>
      </View>

      <View style={[styles.section, { borderColor: c.outline }]}>
        <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>기록 주기</ThemedText>
        <View style={styles.segmentRow}>
          {(
            [
              { key: 'once' as const, label: '하루 1회' },
              { key: 'multiple' as const, label: '하루 여러 번' },
            ] as const
          ).map((opt) => {
            const selected = frequency === opt.key;
            return (
              <Pressable
                key={opt.key}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFrequency(opt.key)}
                style={[
                  styles.segment,
                  {
                    borderColor: selected ? c.onSurface : c.outline,
                    backgroundColor: selected ? 'rgba(0,0,0,0.06)' : c.surfaceLowest,
                  },
                ]}>
                <ThemedText
                  style={[
                    styles.segmentText,
                    {
                      color: selected ? c.onSurface : c.onVariant,
                      fontWeight: selected ? '700' : '500',
                    },
                  ]}>
                  {opt.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export { getInitialMeasurementDataConfig } from './measurementConfig';

const styles = StyleSheet.create({
  shell: {
    gap: 16,
  },
  section: {
    borderWidth: 2,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 2,
    minHeight: 44,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipText: {
    fontSize: 13,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  helper: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    borderWidth: 2,
    paddingVertical: 10,
    alignItems: 'center',
  },
  segmentText: {
    fontSize: 13,
  },
});
