import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

const PRIMARY = 'rgb(249, 115, 22)';
const PRIMARY_DARK = '#eb7000';

const PACE_PRESETS: { label: string; min: number; sec: number }[] = [
  { label: '7:00', min: 7, sec: 0 },
  { label: '5:30', min: 5, sec: 30 },
  { label: '4:15', min: 4, sec: 15 },
  { label: '3:30', min: 3, sec: 30 },
];

function palette(isDark: boolean) {
  if (isDark) {
    return {
      bg: '#09090b',
      surface: '#18181b',
      card: '#27272a',
      onSurface: '#fafafa',
      onVariant: '#a1a1aa',
      outline: '#71717a',
      border: 'rgba(255,255,255,0.08)',
      previewFrame: '#1c1917',
      chipIdle: '#27272a',
      chipActive: PRIMARY,
    };
  }
  return {
    bg: '#fafafa',
    surface: '#f4f4f5',
    card: '#ffffff',
    onSurface: '#18181b',
    onVariant: '#52525b',
    outline: '#a1a1aa',
    border: 'rgba(0,0,0,0.08)',
    previewFrame: '#e7e5e4',
    chipIdle: '#e4e4e7',
    chipActive: PRIMARY,
  };
}

function formatPace(min: number, sec: number): string {
  return `${min}'${String(sec).padStart(2, '0')}"`;
}

export function GoalDetailSettingsPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const c = useMemo(() => palette(isDark), [isDark]);

  const params = useLocalSearchParams<{ rhythmTitle?: string }>();
  const rhythmTitle =
    typeof params.rhythmTitle === 'string' && params.rhythmTitle.trim()
      ? params.rhythmTitle.trim()
      : '러닝 플로';

  const [distanceStr, setDistanceStr] = useState('5.0');
  const [paceMinStr, setPaceMinStr] = useState('5');
  const [paceSecStr, setPaceSecStr] = useState('30');
  const [caloriesStr, setCaloriesStr] = useState('350');
  const [showDistance, setShowDistance] = useState(true);
  const [showPace, setShowPace] = useState(true);
  const [showCalories, setShowCalories] = useState(false);

  const paceMin = Math.max(0, parseInt(paceMinStr, 10) || 0);
  const paceSec = Math.min(59, Math.max(0, parseInt(paceSecStr, 10) || 0));
  const distanceVal = parseFloat(distanceStr.replace(',', '.')) || 0;
  const caloriesVal = Math.max(0, parseInt(caloriesStr, 10) || 0);

  const previewDistance = distanceStr.includes('.') ? distanceStr : String(distanceVal);
  const previewPace = formatPace(paceMin, paceSec);
  const previewCalories = String(caloriesVal);

  const applyPreset = (min: number, sec: number) => {
    setPaceMinStr(String(min));
    setPaceSecStr(String(sec));
  };

  const isPresetActive = (min: number, sec: number) => paceMin === min && paceSec === sec;

  const onDone = () => {
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={[styles.screen, { backgroundColor: c.bg }]} darkColor={c.bg} lightColor={c.bg}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={[styles.header, { backgroundColor: isDark ? 'rgba(9,9,11,0.92)' : 'rgba(255,255,255,0.92)', borderBottomColor: c.border }]}>
          <Pressable onPress={() => router.back()} style={styles.headerBtn} hitSlop={8}>
            <IconSymbol name="chevron.left" size={22} color={c.onSurface} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: c.onSurface }]}>목표 상세 설정</ThemedText>
          <Pressable
            onPress={() => router.push('/widget-settings')}
            style={styles.headerBtn}
            hitSlop={8}>
            <IconSymbol name="gearshape" size={20} color={c.onVariant} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          <View style={[styles.previewSection, { backgroundColor: c.card }]}>
            <View style={styles.previewSectionHead}>
              <ThemedText style={[styles.previewTitle, { color: c.onSurface }]}>실시간 미리보기</ThemedText>
              <View style={styles.badge}>
                <ThemedText style={styles.badgeText}>LOCK SCREEN WIDGET</ThemedText>
              </View>
            </View>

            <View style={[styles.previewFrame, { backgroundColor: c.previewFrame }]}>
              <View style={styles.previewGlass}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewHeaderLeft}>
                    <View style={styles.previewIconCircle}>
                      <IconSymbol name="figure.run" size={14} color="#fff" weight="semibold" />
                    </View>
                    <View>
                      <ThemedText style={styles.previewAppName} numberOfLines={1}>
                        {rhythmTitle}
                      </ThemedText>
                      <ThemedText style={styles.previewKicker}>목표 트래킹 모드</ThemedText>
                    </View>
                  </View>
                  <View style={styles.readyPill}>
                    <ThemedText style={styles.readyPillText}>READY</ThemedText>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: '0%' }]} />
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metricCol}>
                    <ThemedText style={styles.metricLabel}>목표 거리</ThemedText>
                    <View style={styles.metricValueRow}>
                      <ThemedText style={styles.metricValue}>{previewDistance}</ThemedText>
                      <ThemedText style={styles.metricUnit}>km</ThemedText>
                    </View>
                  </View>
                  <View style={[styles.metricCol, { alignItems: 'center' }]}>
                    <ThemedText style={styles.metricLabel}>목표 페이스</ThemedText>
                    <ThemedText style={styles.metricPace}>{previewPace}</ThemedText>
                  </View>
                  <View style={[styles.metricCol, { alignItems: 'flex-end' }]}>
                    <ThemedText style={styles.metricLabel}>목표 칼로리</ThemedText>
                    <View style={styles.metricValueRow}>
                      <ThemedText style={styles.metricValue}>{previewCalories}</ThemedText>
                      <ThemedText style={styles.metricUnit}>kcal</ThemedText>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.padded}>
            <View style={styles.inputSection}>
              <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>목표 거리</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: c.onVariant }]}>어디까지 달릴 예정인가요?</ThemedText>
              <View style={[styles.inputWrap, { backgroundColor: c.card, borderColor: c.border }]}>
                <TextInput
                  value={distanceStr}
                  onChangeText={setDistanceStr}
                  placeholder="0.0"
                  placeholderTextColor={c.outline}
                  keyboardType="decimal-pad"
                  style={[styles.inputBig, { color: c.onSurface }]}
                />
                <ThemedText style={[styles.inputSuffix, { color: c.onVariant }]}>km</ThemedText>
              </View>
            </View>

            <View style={styles.inputSection}>
              <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>목표 페이스</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: c.onVariant }]}>
                목표로 하는 평균 속도입니다.
              </ThemedText>
              <View style={styles.paceRow}>
                <View style={[styles.inputWrap, styles.paceInput, { backgroundColor: c.card, borderColor: c.border }]}>
                  <TextInput
                    value={paceMinStr}
                    onChangeText={setPaceMinStr}
                    placeholder="00"
                    placeholderTextColor={c.outline}
                    keyboardType="number-pad"
                    style={[styles.inputBig, { color: c.onSurface }]}
                  />
                  <ThemedText style={[styles.paceMicro, { color: c.outline }]}>분(min)</ThemedText>
                </View>
                <View style={[styles.inputWrap, styles.paceInput, { backgroundColor: c.card, borderColor: c.border }]}>
                  <TextInput
                    value={paceSecStr}
                    onChangeText={setPaceSecStr}
                    placeholder="00"
                    placeholderTextColor={c.outline}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={[styles.inputBig, { color: c.onSurface }]}
                  />
                  <ThemedText style={[styles.paceMicro, { color: c.outline }]}>초(sec)</ThemedText>
                </View>
              </View>
              <View style={styles.presetRow}>
                {PACE_PRESETS.map((p) => {
                  const active = isPresetActive(p.min, p.sec);
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => applyPreset(p.min, p.sec)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: active ? PRIMARY : c.chipIdle,
                          borderColor: active ? PRIMARY : 'transparent',
                        },
                      ]}>
                      <ThemedText
                        style={[styles.presetChipText, { color: active ? '#fff' : c.onVariant }]}>
                        {p.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputSection}>
              <ThemedText style={[styles.sectionTitle, { color: c.onSurface }]}>목표 칼로리</ThemedText>
              <ThemedText style={[styles.sectionHint, { color: c.onVariant }]}>
                소모하고 싶은 에너지량입니다.
              </ThemedText>
              <View style={[styles.inputWrap, { backgroundColor: c.card, borderColor: c.border }]}>
                <TextInput
                  value={caloriesStr}
                  onChangeText={setCaloriesStr}
                  placeholder="0"
                  placeholderTextColor={c.outline}
                  keyboardType="number-pad"
                  style={[styles.inputBig, { color: c.onSurface }]}
                />
                <ThemedText style={[styles.inputSuffix, { color: c.onVariant }]}>kcal</ThemedText>
              </View>
            </View>

            <View style={[styles.lockSection, { backgroundColor: c.surface }]}>
              <View style={styles.lockSectionHead}>
                <View style={[styles.lockIconWrap, { backgroundColor: c.card }]}>
                  <IconSymbol name="dot.radiowaves.left.and.right" size={22} color={PRIMARY} />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.lockTitle, { color: c.onSurface }]}>잠금화면 데이터 구성</ThemedText>
                  <ThemedText style={[styles.lockSub, { color: c.onVariant }]}>
                    표시할 목표 지표를 선택하세요.
                  </ThemedText>
                </View>
              </View>

              <LockToggleRow
                icon="flag.fill"
                title="목표 거리"
                subtitle="실시간 거리 달성률 표시"
                checked={showDistance}
                onToggle={() => setShowDistance((v) => !v)}
                c={c}
              />
              <LockToggleRow
                icon="speedometer"
                title="목표 페이스"
                subtitle="페이스 가이드 링 표시"
                checked={showPace}
                onToggle={() => setShowPace((v) => !v)}
                c={c}
              />
              <LockToggleRow
                icon="flame.fill"
                title="목표 칼로리"
                subtitle="버닝 진행도 표시"
                checked={showCalories}
                onToggle={() => setShowCalories((v) => !v)}
                c={c}
              />
            </View>

            <Pressable style={styles.cta} onPress={onDone}>
              <ThemedText style={styles.ctaText}>설정 완료 및 시작</ThemedText>
            </Pressable>
            <ThemedText style={[styles.ctaFootnote, { color: c.outline }]}>
              설정한 목표는 LockFlow 추적에 반영할 수 있어요.
            </ThemedText>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

type Pal = ReturnType<typeof palette>;

function LockToggleRow({
  icon,
  title,
  subtitle,
  checked,
  onToggle,
  c,
}: {
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  title: string;
  subtitle: string;
  checked: boolean;
  onToggle: () => void;
  c: Pal;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [
        styles.toggleRow,
        {
          backgroundColor: c.card,
          borderColor: checked ? `${PRIMARY}33` : 'transparent',
          opacity: pressed ? 0.92 : 1,
        },
      ]}>
      <View style={styles.toggleRowLeft}>
        <IconSymbol name={icon} size={22} color={checked ? PRIMARY : c.onVariant} />
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.toggleTitle, { color: c.onSurface }]}>{title}</ThemedText>
          <ThemedText style={[styles.toggleSub, { color: c.onVariant }]}>{subtitle}</ThemedText>
        </View>
      </View>
      <View
        style={[
          styles.checkCircle,
          {
            borderColor: checked ? PRIMARY : c.outline,
            backgroundColor: checked ? PRIMARY : 'transparent',
          },
        ]}>
        {checked ? <IconSymbol name="checkmark" size={14} color="#fff" weight="bold" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  scrollContent: { paddingBottom: 48 },
  previewSection: {
    marginHorizontal: 0,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 28,
  },
  previewSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  previewTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: PRIMARY,
    letterSpacing: 0.6,
  },
  previewFrame: {
    borderRadius: 28,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  previewGlass: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  previewHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  previewIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PRIMARY_DARK,
  },
  previewAppName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  previewKicker: {
    color: '#a3a3a3',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  readyPill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  readyPillText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metricCol: { flex: 1 },
  metricLabel: {
    color: '#a3a3a3',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  metricValue: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  metricUnit: { color: '#a3a3a3', fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
  metricPace: { color: '#FF9F45', fontSize: 18, fontWeight: '900', letterSpacing: -0.5 },
  padded: { paddingHorizontal: 24, gap: 36, marginTop: 8 },
  inputSection: { gap: 12 },
  sectionTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  sectionHint: { fontSize: 14, lineHeight: 20 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  inputBig: {
    flex: 1,
    fontSize: 36,
    fontWeight: '900',
    padding: 0,
    letterSpacing: -1,
    minWidth: 0,
  },
  inputSuffix: { fontSize: 18, fontWeight: '800', marginLeft: 8 },
  paceRow: { flexDirection: 'row', gap: 14 },
  paceInput: { flex: 1, flexDirection: 'column', alignItems: 'stretch', paddingBottom: 10 },
  paceMicro: { fontSize: 10, fontWeight: '800', alignSelf: 'flex-end', marginTop: 4, textTransform: 'uppercase' },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  presetChip: {
    flexGrow: 1,
    minWidth: '21%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  presetChipText: { fontSize: 11, fontWeight: '800' },
  lockSection: {
    borderRadius: 26,
    padding: 22,
    gap: 12,
    overflow: 'hidden',
  },
  lockSectionHead: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 },
  lockIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  lockSub: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  toggleRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1, marginRight: 12 },
  toggleTitle: { fontSize: 14, fontWeight: '800' },
  toggleSub: { fontSize: 10, marginTop: 4, lineHeight: 14 },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    paddingVertical: 18,
    borderRadius: 999,
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  ctaText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  ctaFootnote: { textAlign: 'center', fontSize: 12, marginTop: -16, lineHeight: 18 },
});
