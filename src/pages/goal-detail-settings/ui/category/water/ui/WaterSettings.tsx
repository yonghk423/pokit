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
      <View style={styles.header}>
        <Text style={styles.brand}>LOCKFLOW WATER</Text>
      </View>

      <View style={styles.about}>
        <Text style={styles.sectionKicker}>ABOUT HYDRATION</Text>
        <Text style={styles.aboutText}>
          하루 수분 목표와 알림 흐름을 한 화면에서 빠르게 조정해 집중 플로우를 유지합니다.
        </Text>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionKicker}>CATEGORIES ||</Text>
        <Text style={styles.mainTitle}>Hydration</Text>
      </View>

      <View style={styles.metricBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{(goalMl / 1000).toFixed(1)}</Text>
          <Text style={styles.metricLabel}>목표(L)</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{Math.max(0, goalMl - initialDrankMl)}</Text>
          <Text style={styles.metricLabel}>남은(ml)</Text>
        </View>
      </View>

      <View style={styles.rowsWrap}>
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <IconSymbol name="drop.fill" size={18} color={T.primary} />
            <Text style={styles.rowTitle}>하루 목표</Text>
          </View>
          <View style={styles.inlineInputWrap}>
            <TextInput
              value={goalLStr}
              onChangeText={setGoalLStr}
              onBlur={onBlurGoalL}
              keyboardType="decimal-pad"
              placeholder="2.0"
              placeholderTextColor={T.placeholder}
              style={styles.inlineInput}
            />
            <Text style={styles.inlineSuffix}>L</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowTitle}>빠른 선택</Text>
          <View style={styles.presetRow}>
            {[
              { ml: 1500, label: '1.5' },
              { ml: 2000, label: '2.0' },
              { ml: 2500, label: '2.5' },
            ].map((p) => {
              const active = goalMl === p.ml;
              return (
                <Pressable
                  key={p.ml}
                  onPress={() => onPickPresetMl(p.ml)}
                  style={[styles.presetChip, active && styles.presetChipOn]}>
                  <Text style={[styles.presetChipText, active && styles.presetChipTextOn]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.rowTitle}>알림 주기</Text>
          <View style={styles.reminderList}>
            {reminderRows.map((row) => {
              const selected = reminderPreset === row.key;
              return (
                <Pressable
                  key={row.key}
                  onPress={() => setReminderPreset(row.key)}
                  style={styles.reminderBtn}>
                  <Text style={[styles.reminderBtnText, selected && styles.reminderBtnTextOn]}>
                    {row.label}
                  </Text>
                  {row.key === 'custom' ? (
                    <IconSymbol
                      name="chevron.right"
                      size={18}
                      color={selected ? T.primary : T.onSurfaceVariant}
                    />
                  ) : selected ? (
                    <IconSymbol name="checkmark.circle.fill" size={20} color={T.primary} />
                  ) : (
                    <View style={styles.radioOuter} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {reminderPreset === 'custom' ? (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>커스텀(분)</Text>
            <TextInput
              value={reminderCustomMin}
              onChangeText={(t) => setReminderCustomMin(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              style={styles.customInput}
            />
          </View>
        ) : null}

        <View style={styles.row}>
          <Text style={styles.rowTitle}>스마트 알림</Text>
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
  );
}

const styles = StyleSheet.create({
  shell: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: T.screenBg,
    gap: 16,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  brand: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4, color: T.onSurface },
  about: { gap: 8 },
  sectionKicker: {
    color: T.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  aboutText: {
    color: T.onSurface,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  listHeader: { gap: 6, paddingTop: 2 },
  mainTitle: { color: T.onSurface, fontSize: 42, lineHeight: 46, fontWeight: '700', letterSpacing: -1.2 },
  metricBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#000',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.outline,
    paddingVertical: 10,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { color: T.onSurface, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  metricLabel: { color: T.onSurfaceVariant, fontSize: 11, fontWeight: '600' },
  rowsWrap: { borderTopWidth: 1, borderTopColor: '#000' },
  row: {
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: T.outline,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { color: T.onSurface, fontSize: 16, fontWeight: '600' },
  inlineInputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  inlineInput: { minWidth: 62, fontSize: 18, fontWeight: '700', textAlign: 'right', padding: 0, color: T.onSurface },
  inlineSuffix: { color: T.onSurfaceVariant, fontSize: 13, fontWeight: '600' },
  presetRow: { flexDirection: 'row', gap: 6 },
  presetChip: {
    minWidth: 44,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: T.surfaceContainerHigh,
    alignItems: 'center',
  },
  presetChipOn: {
    backgroundColor: T.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.35)',
  },
  presetChipText: { fontSize: 12, fontWeight: '700', color: T.onSurfaceVariant },
  presetChipTextOn: { color: T.primary, fontWeight: '900' },
  reminderList: { minWidth: 170, gap: 6 },
  reminderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  reminderBtnText: { fontSize: 14, fontWeight: '700', color: T.onSurfaceVariant },
  reminderBtnTextOn: { color: T.onSurface },
  radioOuter: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: T.onSurfaceVariant },
  customInput: {
    minWidth: 80,
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
});
