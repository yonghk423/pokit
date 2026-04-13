import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';

import { WATER_GOAL_DETAIL_THEME as T } from '../lib/waterGoalDetailTheme';

import {
  getInitialWaterDataConfig,
  normalizeWaterDetailConfig,
  type WaterDetailDataConfig,
  type WaterReminderPreset,
} from './waterConfig';

function parseGoalLitersToMl(text: string): number {
  const t = text.replace(',', '.').trim();
  const n = parseFloat(t);
  if (!Number.isFinite(n)) return 2000;
  return Math.max(100, Math.min(10000, Math.round(n * 1000)));
}

function seedWater(raw: unknown) {
  return normalizeWaterDetailConfig(raw ?? getInitialWaterDataConfig());
}

function initialDataConfigDrankMl(raw: unknown): number {
  return seedWater(raw).drankMl;
}

export function WaterSettings({
  rhythmTitle: _rhythmTitle,
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const normalizedKey = useMemo(
    () => JSON.stringify(normalizeWaterDetailConfig(dataConfig ?? getInitialWaterDataConfig())),
    [dataConfig],
  );

  const [goalMl, setGoalMl] = useState(() => seedWater(dataConfig).goalMl);
  const [goalLStr, setGoalLStr] = useState(() => (seedWater(dataConfig).goalMl / 1000).toFixed(1));
  const [reminderPreset, setReminderPreset] = useState<WaterReminderPreset>(
    () => seedWater(dataConfig).reminderPreset,
  );
  const [reminderCustomMin, setReminderCustomMin] = useState(() =>
    String(seedWater(dataConfig).reminderCustomMin),
  );
  const [smartNotification, setSmartNotification] = useState(() => seedWater(dataConfig).smartNotification);

  const lastRef = useRef<string | null>(null);
  const hydratedKey = useRef<string | null>(null);

  useEffect(() => {
    if (hydratedKey.current === normalizedKey) return;
    hydratedKey.current = normalizedKey;
    const next = normalizeWaterDetailConfig(dataConfig ?? getInitialWaterDataConfig());
    setGoalMl(next.goalMl);
    setGoalLStr((next.goalMl / 1000).toFixed(1));
    setReminderPreset(next.reminderPreset);
    setReminderCustomMin(String(next.reminderCustomMin));
    setSmartNotification(next.smartNotification);
  }, [dataConfig, normalizedKey]);
  const initialDrankMl = initialDataConfigDrankMl(dataConfig);

  const customMinNum = Math.max(
    15,
    Math.min(24 * 60, parseInt(reminderCustomMin, 10) || 90),
  );

  useEffect(() => {
    const payload: WaterDetailDataConfig = normalizeWaterDetailConfig({
      goalMl,
      drankMl: Math.min(initialDrankMl, goalMl),
      reminderPreset,
      reminderCustomMin: customMinNum,
      smartNotification,
    });
    const s = JSON.stringify(payload);
    if (lastRef.current === s) return;
    lastRef.current = s;
    onChangeDataConfig(payload);
  }, [
    goalMl,
    initialDrankMl,
    reminderPreset,
    customMinNum,
    smartNotification,
    onChangeDataConfig,
  ]);

  const onPickPresetMl = (ml: number) => {
    setGoalMl(ml);
    setGoalLStr((ml / 1000).toFixed(1));
  };

  const onBlurGoalL = () => {
    const next = parseGoalLitersToMl(goalLStr);
    setGoalMl(next);
    setGoalLStr((next / 1000).toFixed(1));
  };

  const reminderRows: { key: WaterReminderPreset; label: string }[] = [
    { key: '60', label: '매 1시간마다' },
    { key: '120', label: '매 2시간마다' },
    { key: 'custom', label: '직접 설정' },
  ];

  return (
    <View style={styles.shell}>
      <View style={styles.wrap}>
        <View style={styles.heading}>
          <Text style={styles.title}>수분섭취 몰입 설정</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>목표 설정</Text>
          <View style={styles.goalList}>
            <View style={styles.goalRow}>
              <View style={styles.goalLeft}>
                <View style={styles.goalIconWrap}>
                  <IconSymbol name="drop.fill" size={22} color={T.primary} />
                </View>
                <Text style={styles.goalLabel}>하루 목표</Text>
              </View>
              <View style={styles.goalInputWrap}>
                <TextInput
                  value={goalLStr}
                  onChangeText={setGoalLStr}
                  onBlur={onBlurGoalL}
                  keyboardType="decimal-pad"
                  placeholder="2.0"
                  placeholderTextColor={T.placeholder}
                  style={[styles.goalInput, styles.goalInputText]}
                />
                <Text style={styles.goalUnit}>L</Text>
              </View>
            </View>

            <View style={styles.presetBlock}>
              <Text style={styles.presetHint}>빠른 선택</Text>
              <View style={styles.presetRow}>
                {[
                  { ml: 1500, label: '1.5L' },
                  { ml: 2000, label: '2.0L' },
                  { ml: 2500, label: '2.5L' },
                ].map((p) => {
                  const active = goalMl === p.ml;
                  return (
                    <Pressable
                      key={p.ml}
                      onPress={() => onPickPresetMl(p.ml)}
                      style={[
                        styles.presetChip,
                        active && styles.presetChipOn,
                      ]}>
                      <Text style={[styles.presetChipText, active && styles.presetChipTextOn]}>
                        {p.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>알림</Text>
          <View style={[styles.reminderCard, { borderColor: T.glassPreviewBorder }]}>
            <View style={styles.reminderList}>
              {reminderRows.map((row) => {
                const selected = reminderPreset === row.key;
                return (
                  <Pressable
                    key={row.key}
                    onPress={() => setReminderPreset(row.key)}
                    style={[
                      styles.reminderBtn,
                      selected && { backgroundColor: T.surfaceContainerHigh },
                    ]}>
                    <Text
                      style={[
                        styles.reminderBtnText,
                        { color: selected ? T.onSurface : T.onSurfaceVariant },
                      ]}>
                      {row.label}
                    </Text>
                    {row.key === 'custom' ? (
                      <IconSymbol
                        name="chevron.right"
                        size={20}
                        color={selected ? T.primary : T.onSurfaceVariant}
                      />
                    ) : selected ? (
                      <IconSymbol name="checkmark.circle.fill" size={22} color={T.primary} />
                    ) : (
                      <View style={[styles.radioOuter, { borderColor: T.onSurfaceVariant }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            {reminderPreset === 'custom' ? (
              <View style={[styles.customRow, { borderTopColor: T.outline }]}>
                <Text style={styles.customLabel}>간격 (분)</Text>
                <TextInput
                  value={reminderCustomMin}
                  onChangeText={(t) => setReminderCustomMin(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  style={styles.customInput}
                />
              </View>
            ) : null}
            <View style={[styles.smartRow, { borderTopColor: T.outline }]}>
              <View style={styles.smartTextCol}>
                <Text style={styles.smartTitle}>스마트 알림</Text>
                <Text style={styles.smartSub}>수면 시간에는 알림을 보내지 않도록 할 예정이에요.</Text>
              </View>
              <Switch
                value={smartNotification}
                onValueChange={setSmartNotification}
                trackColor={{ false: T.surfaceContainerHighest, true: T.primary }}
                thumbColor="#fff"
                ios_backgroundColor={T.surfaceContainerHighest}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: T.screenBg,
    overflow: 'hidden',
  },
  wrap: { gap: 28 },
  heading: { gap: 6 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 28,
    color: T.onSurface,
  },
  section: { gap: 14 },
  sectionTitle: {
    color: T.onSurfaceVariant,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  goalList: { gap: 10 },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.glassPreviewBorder,
    backgroundColor: T.surfaceContainerLow,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  goalLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    minWidth: 0,
  },
  goalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: T.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalLabel: {
    color: T.onSurface,
    fontSize: 16,
    fontWeight: '800',
  },
  goalInputWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  goalInput: {
    minWidth: 56,
    maxWidth: 88,
  },
  goalInputText: {
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'right',
    padding: 0,
    color: T.onSurface,
  },
  goalUnit: {
    color: T.onSurfaceVariant,
    fontSize: 14,
    fontWeight: '600',
  },
  presetBlock: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.glassPreviewBorder,
    backgroundColor: T.surfaceContainerLow,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  presetHint: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
    color: T.onSurfaceVariant,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: T.surfaceContainerHigh,
  },
  presetChipOn: {
    backgroundColor: T.primarySoft,
    borderWidth: 2,
    borderColor: 'rgba(34, 211, 238, 0.35)',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: T.onSurfaceVariant,
  },
  presetChipTextOn: {
    color: T.primary,
    fontWeight: '900',
  },
  reminderCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    backgroundColor: T.surfaceContainerLow,
  },
  reminderList: { padding: 8, gap: 4 },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  reminderBtnText: { fontSize: 16, fontWeight: '800' },
  radioOuter: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  customLabel: { fontSize: 14, fontWeight: '700', color: T.onSurfaceVariant },
  customInput: {
    minWidth: 72,
    borderWidth: 1,
    borderColor: T.glassPreviewBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
    color: T.onSurface,
    backgroundColor: T.surfaceContainerHigh,
  },
  smartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  smartTextCol: { flex: 1, gap: 4 },
  smartTitle: { fontSize: 16, fontWeight: '800', color: T.onSurface },
  smartSub: { fontSize: 11, lineHeight: 16, fontWeight: '500', color: T.onSurfaceVariant },
});
