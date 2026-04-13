import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Switch,
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
  if (!next.morningOn && !next.lunchOn && !next.dinnerOn) {
    next.morningOn = true;
  }
  const enabled = [next.morningOn, next.lunchOn, next.dinnerOn].filter(Boolean).length;
  next.dosesPerDay = Math.max(1, Math.min(12, enabled));
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
  const isDark = scheme === 'dark';

  const [draft, setDraft] = useState<MedicineDetailDataConfig>(() =>
    normalizeMedicineDetailConfig(dataConfig ?? getInitialMedicineDataConfig()),
  );
  const lastSerialized = useRef<string | null>(null);

  useEffect(() => {
    const incoming = normalizeMedicineDetailConfig(dataConfig ?? getInitialMedicineDataConfig());
    const s = JSON.stringify(incoming);
    if (lastSerialized.current === s) return;
    lastSerialized.current = s;
    setDraft(incoming);
  }, [dataConfig]);

  useEffect(() => {
    const payload = normalizeMedicineDetailConfig(draft);
    const s = JSON.stringify(payload);
    if (lastSerialized.current === s) return;
    lastSerialized.current = s;
    onChangeDataConfig(payload);
  }, [draft, onChangeDataConfig]);

  const fieldBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
  const fieldBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
  const cardBg = isDark ? 'rgba(255,255,255,0.05)' : '#f1f1f3';
  const slotOffBg = isDark ? 'rgba(255,255,255,0.06)' : '#ececef';
  const slotOffBorder = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const slotOffText = isDark ? c.onSurface : '#18181b';

  return (
    <View style={styles.root}>
      <View style={styles.hero}>
        <ThemedText style={[styles.heroTitle, { color: c.onSurface }]}>
          약 복용 <ThemedText style={styles.heroAccent}>플로우 설정</ThemedText>
        </ThemedText>
        <ThemedText style={[styles.heroSub, { color: c.onVariant }]}>
          건강한 하루를 위해 복용할 약과 시간을 정확히 설정해 주세요.
        </ThemedText>
      </View>

      <View style={styles.block}>
        <ThemedText style={[styles.sectionHeading, { color: c.onSurface }]}>약 이름 입력</ThemedText>
        <View style={[styles.nameField, { backgroundColor: fieldBg, borderColor: fieldBorder }]}>
          <TextInput
            value={draft.doseLabel}
            onChangeText={(t) => setDraft((prev) => ({ ...prev, doseLabel: t }))}
            placeholder="예: 타이레놀 500mg"
            placeholderTextColor={c.outline}
            style={[styles.nameInput, { color: c.onSurface }]}
          />
          <View style={styles.nameIcon}>
            <IconSymbol name="cross.case.fill" size={26} color={PRIMARY} />
          </View>
        </View>
      </View>

      <View style={styles.block}>
        <ThemedText style={[styles.sectionHeading, { color: c.onSurface }]}>복용 시간 설정</ThemedText>
        <View style={styles.slotGrid}>
          {SLOT_GRID.map((slot) => {
            const on = slotOn(draft, slot.key);
            return (
              <Pressable
                key={slot.key}
                onPress={() => setDraft((prev) => setSlot(prev, slot.key, !slotOn(prev, slot.key)))}
                style={[
                  styles.slotCell,
                  on
                    ? styles.slotCellOn
                    : [styles.slotCellOff, { backgroundColor: slotOffBg, borderColor: slotOffBorder }],
                  on && { shadowColor: PRIMARY },
                ]}>
                <IconSymbol name={slot.icon} size={26} color={on ? '#fff' : PRIMARY} />
                <ThemedText style={[styles.slotLabel, { color: on ? '#fff' : slotOffText }]}>
                  {slot.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.block}>
        <ThemedText style={[styles.sectionHeading, { color: c.onSurface }]}>상세 시간 커스텀</ThemedText>
        <View style={styles.customList}>
          {SLOT_GRID.map((slot) => {
            if (!slotOn(draft, slot.key)) return null;
            return (
              <View
                key={slot.key}
                style={[styles.customCard, { backgroundColor: cardBg, borderColor: fieldBorder }]}>
                <View style={[styles.customAccent, { backgroundColor: PRIMARY }]} />
                <View style={styles.customMain}>
                  <View style={[styles.customIconWrap, { backgroundColor: `${PRIMARY}22` }]}>
                    <IconSymbol name={slot.icon} size={22} color="#fff" />
                  </View>
                  <View style={styles.customTextCol}>
                    <ThemedText style={[styles.customMicro, { color: c.onVariant }]}>
                      {slot.cardSub}
                    </ThemedText>
                    <TextInput
                      value={timeField(draft, slot.key)}
                      onChangeText={(t) => setDraft((prev) => withTime(prev, slot.key, t))}
                      onBlur={() =>
                        setDraft((prev) => withTime(prev, slot.key, timeField(prev, slot.key)))
                      }
                      keyboardType="numbers-and-punctuation"
                      placeholder="08:30"
                      placeholderTextColor={c.outline}
                      style={[styles.customTimeInput, { color: c.onSurface }]}
                      {...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums' as const] } : {})}
                    />
                  </View>
                </View>
                <IconSymbol name="pencil" size={18} color={PRIMARY} />
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.notifyCard, { backgroundColor: cardBg, borderColor: fieldBorder }]}>
        <View style={[styles.notifyIcon, { backgroundColor: 'rgba(0,0,0,0.12)' }]}>
          <IconSymbol name="bell.fill" size={22} color={PRIMARY} />
        </View>
        <View style={styles.notifyTextCol}>
          <ThemedText style={[styles.notifyTitle, { color: c.onSurface }]}>복용 알림</ThemedText>
          <ThemedText style={[styles.notifySub, { color: c.onVariant }]}>
            지정된 시간에 푸시 알림을 보냅니다.
          </ThemedText>
        </View>
        <Switch
          value={draft.medicationNotify}
          onValueChange={(v) => setDraft((prev) => normalizeMedicineDetailConfig({ ...prev, medicationNotify: v }))}
          trackColor={{ true: PRIMARY, false: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)' }}
          thumbColor="#fff"
        />
      </View>

      <ThemedText style={[styles.footerHint, { color: c.outline }]}>
        아래 「설정 완료」를 누르면 저장되고 플로우가 이어져요.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 28 },
  hero: { gap: 8 },
  heroTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -0.8, lineHeight: 34 },
  heroAccent: { color: PRIMARY, fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  heroSub: { fontSize: 14, fontWeight: '600', lineHeight: 21 },
  block: { gap: 12 },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginLeft: 4,
  },
  nameField: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 14,
    minHeight: 56,
  },
  nameInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  nameIcon: { paddingVertical: 4 },
  slotGrid: { flexDirection: 'row', gap: 12 },
  slotCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  slotCellOff: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  slotCellOn: {
    backgroundColor: PRIMARY,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  slotLabel: { fontSize: 14, fontWeight: '800' },
  customList: { gap: 12 },
  customCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    overflow: 'hidden',
  },
  customAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  customMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 },
  customIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTextCol: { flex: 1, gap: 4, minWidth: 0 },
  customMicro: { fontSize: 12, fontWeight: '700', letterSpacing: -0.1 },
  customTimeInput: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.5,
    padding: 0,
    minWidth: 0,
  },
  notifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 14,
  },
  notifyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifyTextCol: { flex: 1, gap: 4, minWidth: 0 },
  notifyTitle: { fontSize: 15, fontWeight: '800' },
  notifySub: { fontSize: 12, fontWeight: '600', lineHeight: 16 },
  footerHint: { fontSize: 12, fontWeight: '600', lineHeight: 18, textAlign: 'center', marginTop: -8 },
});
