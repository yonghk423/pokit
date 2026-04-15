import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import { goalDetailSettingsPalette } from '../../lib/settingsPalette';

import {
  getInitialMedicineDataConfig,
  normalizeMedicineDetailConfig,
  type MedicineDetailDataConfig,
} from './medicineConfig';

const PRIMARY = 'rgb(0, 0, 0)';

const SLOT_GRID: {
  key: 'morning' | 'lunch' | 'dinner';
  label: string;
  cardSub: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
}[] = [
  { key: 'morning', label: '아침', cardSub: '아침 복용', icon: 'sun.max.fill' },
  { key: 'lunch', label: '점심', cardSub: '점심 복용', icon: 'sun.max' },
  { key: 'dinner', label: '저녁', cardSub: '저녁 복용', icon: 'moon.fill' },
];

function slotOn(cfg: MedicineDetailDataConfig, key: 'morning' | 'lunch' | 'dinner'): boolean {
  if (key === 'morning') return cfg.morningOn;
  if (key === 'lunch') return cfg.lunchOn;
  return cfg.dinnerOn;
}

function setSlot(
  cfg: MedicineDetailDataConfig,
  key: 'morning' | 'lunch' | 'dinner',
  on: boolean,
): MedicineDetailDataConfig {
  const next = {
    ...cfg,
    morningOn: key === 'morning' ? on : cfg.morningOn,
    lunchOn: key === 'lunch' ? on : cfg.lunchOn,
    dinnerOn: key === 'dinner' ? on : cfg.dinnerOn,
  };
  const enabled = [next.morningOn, next.lunchOn, next.dinnerOn].filter(Boolean).length;
  next.dosesPerDay = Math.max(0, Math.min(12, enabled));
  next.takenCount = Math.min(next.takenCount, next.dosesPerDay);
  return normalizeMedicineDetailConfig(next);
}

function timeField(
  cfg: MedicineDetailDataConfig,
  key: 'morning' | 'lunch' | 'dinner',
): string {
  if (key === 'morning') return cfg.morningTime;
  if (key === 'lunch') return cfg.lunchTime;
  return cfg.dinnerTime;
}

function withTime(
  cfg: MedicineDetailDataConfig,
  key: 'morning' | 'lunch' | 'dinner',
  time: string,
): MedicineDetailDataConfig {
  const n = { ...cfg, morningTime: cfg.morningTime, lunchTime: cfg.lunchTime, dinnerTime: cfg.dinnerTime };
  if (key === 'morning') n.morningTime = time;
  else if (key === 'lunch') n.lunchTime = time;
  else n.dinnerTime = time;
  return normalizeMedicineDetailConfig(n);
}

export function MedicineSettings({
  dataConfig,
  onChangeDataConfig,
}: {
  rhythmTitle: string;
  dataConfig: unknown;
  onChangeDataConfig: (next: unknown) => void;
}) {
  const scheme = useColorScheme();
  const c = useMemo(() => goalDetailSettingsPalette(scheme === 'dark'), [scheme]);

  const [draft, setDraft] = useState<MedicineDetailDataConfig>(() =>
    normalizeMedicineDetailConfig(dataConfig ?? getInitialMedicineDataConfig()),
  );
  /** 부모 `dataConfig`와 동일한 JSON이면 재적용·재전송 생략 (두 effect 간 간섭 방지) */
  const lastSyncedJsonRef = useRef<string | null>(null);

  useEffect(() => {
    const incoming = normalizeMedicineDetailConfig(dataConfig ?? getInitialMedicineDataConfig());
    const s = JSON.stringify(incoming);
    if (lastSyncedJsonRef.current === s) return;
    lastSyncedJsonRef.current = s;
    setDraft(incoming);
  }, [dataConfig]);

  useEffect(() => {
    const payload = normalizeMedicineDetailConfig(draft);
    const s = JSON.stringify(payload);
    if (lastSyncedJsonRef.current === s) return;
    lastSyncedJsonRef.current = s;
    onChangeDataConfig(payload);
  }, [draft, onChangeDataConfig]);

  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <Text style={[styles.brand, { color: c.onSurface }]}>LOCKFLOW MEDICINE</Text>
      </View>

      <View style={styles.about}>
        <Text style={[styles.sectionKicker, { color: c.onVariant }]}>ABOUT MEDICATION</Text>
        <Text style={[styles.aboutText, { color: c.onSurface }]}>
          하루 복용 스케줄을 간결하게 정리하고, 세션 중 바로 확인할 수 있게 설정합니다.
        </Text>
      </View>

      <View style={styles.listHeader}>
        <Text style={[styles.sectionKicker, { color: c.onVariant }]}>CATEGORIES ||</Text>
        <Text style={[styles.mainTitle, { color: c.onSurface }]}>Medicine</Text>
      </View>

      <View style={[styles.metricBar, { borderTopColor: '#000', borderBottomColor: c.outline }]}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>{draft.dosesPerDay}</Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>복용 횟수</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, { color: c.onSurface }]}>{draft.takenCount}</Text>
          <Text style={[styles.metricLabel, { color: c.onVariant }]}>완료</Text>
        </View>
      </View>

      <View style={[styles.rowsWrap, { borderTopColor: '#000' }]}>
        <View style={[styles.row, { borderBottomColor: c.outline }]}>
          <View style={styles.rowLeft}>
            <IconSymbol name="cross.case.fill" size={18} color={PRIMARY} />
            <Text style={[styles.rowTitle, { color: c.onSurface }]}>약 이름</Text>
          </View>
          <TextInput
            value={draft.doseLabel}
            onChangeText={(t) => setDraft((prev) => ({ ...prev, doseLabel: t }))}
            placeholder="예: 타이레놀 500mg"
            placeholderTextColor={c.outline}
            style={[styles.rowInput, { color: c.onSurface }]}
          />
        </View>

        <View style={[styles.row, styles.slotRowWrap, { borderBottomColor: c.outline }]}>
          <View style={styles.slotColumn}>
            <Text style={[styles.rowTitle, { color: c.onSurface }]}>복용 슬롯</Text>
            <Text style={[styles.slotHint, { color: c.outline }]}>
              버튼을 눌러 복용 시간대를 추가·해제해요. 아래 「설정 완료」를 누르면 오늘 일정의 우선순위 목록에 이 카테고리가 담겨요. 켠 슬롯과 시각은 플로우 시작 후 목록에만 표시돼요.
            </Text>
            <View style={styles.slotRow}>
              {SLOT_GRID.map((slot) => {
                const on = slotOn(draft, slot.key);
                return (
                  <Pressable
                    key={slot.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${slot.label} 복용 ${on ? '켜짐' : '꺼짐'}`}
                    android_ripple={{ color: 'rgba(0,0,0,0.12)' }}
                    onPress={() => setDraft((prev) => setSlot(prev, slot.key, !slotOn(prev, slot.key)))}
                    style={({ pressed }) => [
                      styles.slotChip,
                      on ? styles.slotChipSelected : styles.slotChipIdle,
                      {
                        borderColor: on ? PRIMARY : 'rgba(0,0,0,0.18)',
                        backgroundColor: on ? PRIMARY : '#f4f4f5',
                      },
                      pressed && (on ? styles.slotChipPressedOn : styles.slotChipPressedOff),
                    ]}>
                    <Text style={[styles.slotChipText, { color: on ? '#fff' : c.onSurface }]}>
                      {slot.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        {SLOT_GRID.map((slot) => {
          if (!slotOn(draft, slot.key)) return null;
          return (
            <View key={slot.key} style={[styles.row, { borderBottomColor: c.outline }]}>
              <Text style={[styles.rowTitle, { color: c.onSurface }]}>{slot.cardSub}</Text>
              <View style={styles.inlineInputWrap}>
                <TextInput
                  value={timeField(draft, slot.key)}
                  onChangeText={(t) => setDraft((prev) => withTime(prev, slot.key, t))}
                  onBlur={() => setDraft((prev) => withTime(prev, slot.key, timeField(prev, slot.key)))}
                  keyboardType="numbers-and-punctuation"
                  placeholder="08:30"
                  placeholderTextColor={c.outline}
                  style={[styles.inlineInput, { color: c.onSurface }]}
                />
              </View>
            </View>
          );
        })}

        <View style={[styles.row, { borderBottomColor: c.outline }]}>
          <Text style={[styles.rowTitle, { color: c.onSurface }]}>복용 알림</Text>
          <Switch
            value={draft.medicationNotify}
            onValueChange={(v) => setDraft((prev) => normalizeMedicineDetailConfig({ ...prev, medicationNotify: v }))}
            trackColor={{ true: PRIMARY, false: 'rgba(0,0,0,0.12)' }}
            thumbColor="#fff"
          />
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  shell: { gap: 16, paddingVertical: 6 },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  brand: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  about: { gap: 8 },
  sectionKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  aboutText: { fontSize: 20, lineHeight: 28, fontWeight: '600', letterSpacing: -0.3 },
  listHeader: { gap: 6, paddingTop: 2 },
  mainTitle: { fontSize: 42, lineHeight: 46, fontWeight: '700', letterSpacing: -1.2 },
  metricBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  metricItem: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  rowsWrap: { borderTopWidth: 1 },
  slotRowWrap: {
    flexDirection: 'column',
    alignItems: 'stretch',
    minHeight: 0,
    paddingVertical: 12,
  },
  slotColumn: { gap: 8, width: '100%' },
  slotHint: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  row: {
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowInput: { flex: 1, fontSize: 16, fontWeight: '600', textAlign: 'right', minHeight: 32, maxWidth: '70%' },
  slotRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  slotChip: {
    minWidth: 80,
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      default: { elevation: 2 },
    }),
  },
  slotChipIdle: {},
  slotChipSelected: {},
  slotChipPressedOff: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  slotChipPressedOn: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  slotChipText: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  inlineInputWrap: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  inlineInput: { minWidth: 72, fontSize: 18, fontWeight: '700', textAlign: 'right', padding: 0 },
});
