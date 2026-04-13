import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

const PRIMARY = 'rgb(0, 0, 0)';
const BG = '#09090b';
const SURFACE = '#151518';
const SURFACE_CARD = '#1e1e23';
const TEXT_MUTED = '#9ca3af';

const STYLES = [
  { key: 'data-rich', title: 'Data Rich', description: '활동 통계를 크게 표시' },
  { key: 'minimal-timer', title: 'Minimal Timer', description: '시간 정보에 집중' },
  { key: 'image-focus', title: 'Image Focus', description: '배경 이미지 중심' },
  { key: 'circular-focus', title: 'Circular Focus', description: '원형 진행률 강조' },
  { key: 'bold-type', title: 'Bold Typography', description: '강한 타이포그래피' },
  { key: 'habit-streak', title: 'Habit Streak', description: '연속 기록 강조' },
  { key: 'zen-gradient', title: 'Zen Gradient', description: '부드러운 그라디언트' },
  { key: 'analog-clock', title: 'Analog Clock', description: '클래식 시계 표현' },
  { key: 'checklist', title: 'Checklist', description: '체크리스트형 레이아웃' },
  { key: 'ai-message', title: 'AI Message', description: '코칭 메시지 중심' },
  { key: 'retro-pixel', title: 'Retro Pixel', description: '레트로 픽셀 감성' },
  { key: 'kinetic-glass', title: 'Kinetic Glass', description: '깊이감 있는 글래스' },
];

export function WidgetSettingsPage() {
  const router = useRouter();
  const [selectedStyle, setSelectedStyle] = useState('data-rich');
  const [kineticTransition, setKineticTransition] = useState(true);

  return (
    <ThemedView style={styles.screen} darkColor={BG} lightColor={BG}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Pressable onPress={() => router.back()} style={styles.iconTap}>
              <IconSymbol name="arrow.backward" size={20} color={PRIMARY} />
            </Pressable>
            <ThemedText style={styles.topTitle}>LockFlow 맞춤 설정</ThemedText>
          </View>
          <Pressable style={styles.saveTopButton}>
            <ThemedText style={styles.saveTopText}>저장</ThemedText>
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.previewSection}>
            <View style={styles.phoneShell}>
              <View style={styles.wallpaper} />
              <View style={styles.lockContent}>
                <ThemedText style={styles.dateText}>MONDAY, JUNE 12</ThemedText>
                <ThemedText style={styles.timeText}>09:41</ThemedText>

                <View style={styles.liveWidget}>
                  <View style={styles.widgetHead}>
                    <ThemedText style={styles.widgetKicker}>Morning Jog</ThemedText>
                    <IconSymbol name="figure.run" size={14} color="#fff" />
                  </View>
                  <View style={styles.widgetBottom}>
                    <View>
                      <ThemedText style={styles.kmText}>4.2km</ThemedText>
                      <ThemedText style={styles.paceText}>Pace: 5'12"/km</ThemedText>
                    </View>
                    <View style={styles.percentCircle}>
                      <ThemedText style={styles.percentText}>75%</ThemedText>
                    </View>
                  </View>
                </View>

                <View style={styles.bottomIndicators}>
                  <View style={styles.indicatorBtn}>
                    <IconSymbol name="flashlight.off.fill" size={18} color="#fff" />
                  </View>
                  <View style={styles.indicatorBtn}>
                    <IconSymbol name="camera.fill" size={18} color="#fff" />
                  </View>
                </View>
              </View>
              <View style={styles.homeBar} />
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <View>
              <ThemedText style={styles.customizationKicker}>CUSTOMIZATION</ThemedText>
              <ThemedText style={styles.sectionTitle}>위젯 스타일 선택</ThemedText>
            </View>
            <View style={styles.counterPill}>
              <ThemedText style={styles.counterText}>
                {STYLES.findIndex((s) => s.key === selectedStyle) + 1} / {STYLES.length}
              </ThemedText>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.styleRow}>
            {STYLES.map((item) => {
              const active = item.key === selectedStyle;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setSelectedStyle(item.key)}
                  style={[styles.styleCard, active && styles.styleCardActive]}>
                  <View style={[styles.mockCard, active && styles.mockCardActive]} />
                  <ThemedText style={styles.styleTitle}>{item.title}</ThemedText>
                  <ThemedText style={styles.styleDesc}>{item.description}</ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.settingBox}>
            <View>
              <ThemedText style={styles.settingTitle}>Kinetic Transition</ThemedText>
              <ThemedText style={styles.settingDescription}>
                업데이트 시 역동적인 모션 블러 효과 사용
              </ThemedText>
            </View>
            <Switch
              trackColor={{ true: PRIMARY, false: '#3f3f46' }}
              thumbColor="#fff"
              value={kineticTransition}
              onValueChange={setKineticTransition}
            />
          </View>

          <Pressable style={styles.saveButton}>
            <IconSymbol name="checkmark.circle.fill" size={18} color="#fff" />
            <ThemedText style={styles.saveButtonText}>설정 저장</ThemedText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0b0b0e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconTap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  topTitle: { color: '#f3f4f6', fontSize: 18, fontWeight: '800' },
  saveTopButton: { paddingHorizontal: 8, paddingVertical: 6 },
  saveTopText: { color: PRIMARY, fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 16, paddingBottom: 36 },
  previewSection: { marginTop: 18, alignItems: 'center' },
  phoneShell: {
    width: 280,
    height: 580,
    borderRadius: 42,
    backgroundColor: '#000',
    borderWidth: 8,
    borderColor: '#3f3f46',
    overflow: 'hidden',
  },
  wallpaper: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#223047',
    opacity: 0.92,
  },
  lockContent: { flex: 1, alignItems: 'center', paddingTop: 54 },
  dateText: { color: 'rgba(255,255,255,0.82)', fontSize: 12, letterSpacing: 2, fontWeight: '600' },
  timeText: { marginTop: 8, color: '#fff', fontSize: 68, fontWeight: '300', letterSpacing: -1.2 },
  liveWidget: {
    marginTop: 26,
    width: 240,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    padding: 12,
  },
  widgetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  widgetKicker: { color: PRIMARY, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  widgetBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  kmText: { color: '#fff', fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  paceText: { color: 'rgba(255,255,255,0.75)', fontSize: 10 },
  percentCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  bottomIndicators: {
    marginTop: 'auto',
    marginBottom: 40,
    flexDirection: 'row',
    gap: 44,
  },
  indicatorBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBar: {
    position: 'absolute',
    bottom: 8,
    left: '50%',
    marginLeft: -64,
    width: 128,
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  sectionHeaderRow: {
    marginTop: 26,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  customizationKicker: {
    color: PRIMARY,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  sectionTitle: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.8 },
  counterPill: {
    borderRadius: 999,
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  counterText: { color: '#f3f4f6', fontSize: 13, fontWeight: '700' },
  styleRow: { gap: 12, paddingHorizontal: 8, paddingTop: 18, paddingBottom: 14 },
  styleCard: {
    width: 160,
    borderRadius: 12,
    backgroundColor: SURFACE_CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 14,
  },
  styleCardActive: {
    backgroundColor: '#fff',
    borderColor: PRIMARY,
    borderWidth: 2,
  },
  mockCard: {
    height: 94,
    borderRadius: 10,
    backgroundColor: '#2f2f34',
    marginBottom: 10,
  },
  mockCardActive: {
    backgroundColor: '#f3f4f6',
  },
  styleTitle: { color: '#111827', fontSize: 14, fontWeight: '800' },
  styleDesc: { color: '#4b5563', fontSize: 10, marginTop: 4, lineHeight: 14 },
  settingBox: {
    marginHorizontal: 8,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: SURFACE_CARD,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  settingTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  settingDescription: { color: TEXT_MUTED, fontSize: 12, marginTop: 4, maxWidth: 220 },
  saveButton: {
    marginHorizontal: 8,
    marginTop: 16,
    borderRadius: 999,
    height: 56,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  saveButtonText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});
