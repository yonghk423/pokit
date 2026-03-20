import { useRouter } from 'expo-router';
import { useState } from 'react';
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

export function DayPlanPage() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [newTaskName, setNewTaskName] = useState('');

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const surface = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const chipSoftBg = isDark ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.12)';
  const lineBg = isDark ? '#334155' : '#e2e8f0';

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: border, backgroundColor: bg }]}>
          <Pressable
            accessibilityRole="button"
            style={styles.headerIconBtn}
            onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={22} color={text} />
          </Pressable>
          <ThemedText style={[styles.headerTitle, { color: text }]}>오늘 리듬 구성</ThemedText>
          <Pressable accessibilityRole="button" style={styles.headerIconBtn}>
            <IconSymbol name="ellipsis" size={22} color={text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={styles.section}>
            <View style={styles.progressHeaderRow}>
              <View>
                <ThemedText style={[styles.kicker, { color: PRIMARY }]}>오늘을 위한 계획</ThemedText>
                <ThemedText style={[styles.sectionTitle, { color: text }]}>리듬을 확정하세요</ThemedText>
              </View>
              <View style={styles.progressNums}>
                <ThemedText style={[styles.percentText, { color: text }]}>30%</ThemedText>
                <ThemedText style={[styles.tasksHint, { color: muted }]}>3/10 태스크</ThemedText>
              </View>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: lineBg }]}>
              <View style={[styles.progressFill, { width: '30%' }]} />
            </View>
            <ThemedText style={[styles.helper, { color: muted }]}>
              오늘 약 6시간 분량으로 계획했어요. 시작할까요?
            </ThemedText>
          </View>

          {/* Category chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
            style={styles.chipsScroll}>
            <Pressable style={[styles.chip, styles.chipPrimary]}>
              <IconSymbol name="plus" size={18} color="#fff" />
              <ThemedText style={styles.chipPrimaryText}>새 맞춤</ThemedText>
            </Pressable>
            <Pressable style={[styles.chip, styles.chipOutline, { borderColor: `${PRIMARY}33`, backgroundColor: chipSoftBg }]}>
              <IconSymbol name="heart.fill" size={18} color={PRIMARY} />
              <ThemedText style={[styles.chipOutlineText, { color: PRIMARY }]}>건강</ThemedText>
            </Pressable>
            <Pressable style={[styles.chip, styles.chipOutline, { borderColor: `${PRIMARY}33`, backgroundColor: chipSoftBg }]}>
              <IconSymbol name="sparkles" size={18} color={PRIMARY} />
              <ThemedText style={[styles.chipOutlineText, { color: PRIMARY }]}>습관</ThemedText>
            </Pressable>
            <Pressable style={[styles.chip, styles.chipOutline, { borderColor: `${PRIMARY}33`, backgroundColor: chipSoftBg }]}>
              <IconSymbol name="bolt.fill" size={18} color={PRIMARY} />
              <ThemedText style={[styles.chipOutlineText, { color: PRIMARY }]}>딥워크</ThemedText>
            </Pressable>
          </ScrollView>

          {/* Timeline */}
          <View style={styles.timelineWrap}>
            <View style={[styles.timelineLine, { backgroundColor: lineBg, left: 19 }]} />

            {/* Item 1 */}
            <View style={styles.timelineRow}>
              <View style={styles.dotCol}>
                <View style={[styles.dotFilled, { backgroundColor: PRIMARY }]}>
                  <IconSymbol name="sun.max.fill" size={20} color="#fff" />
                </View>
              </View>
              <View style={[styles.timelineCard, { backgroundColor: surface, borderColor: border }]}>
                <View style={styles.cardRow}>
                  <View>
                    <ThemedText style={[styles.cardTitle, { color: text }]}>기상</ThemedText>
                    <ThemedText style={[styles.cardTime, { color: PRIMARY }]}>오전 7:00</ThemedText>
                  </View>
                  <View style={[styles.badge, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                    <ThemedText style={[styles.badgeText, { color: muted }]}>습관</ThemedText>
                  </View>
                </View>
              </View>
            </View>

            {/* Item 2 */}
            <View style={styles.timelineRow}>
              <View style={styles.dotCol}>
                <View style={[styles.dotRing, { borderColor: PRIMARY, backgroundColor: surface }]}>
                  <IconSymbol name="figure.run" size={20} color={PRIMARY} />
                </View>
              </View>
              <View style={[styles.timelineCard, { backgroundColor: surface, borderColor: border }]}>
                <View style={styles.cardRow}>
                  <View>
                    <ThemedText style={[styles.cardTitle, { color: text }]}>아침 조깅</ThemedText>
                    <ThemedText style={[styles.cardTime, { color: PRIMARY }]}>
                      오전 7:30 — 오전 8:15
                    </ThemedText>
                  </View>
                  <View style={[styles.badge, { backgroundColor: chipSoftBg }]}>
                    <ThemedText style={[styles.badgeText, { color: PRIMARY }]}>건강</ThemedText>
                  </View>
                </View>
              </View>
            </View>

            {/* Add new card */}
            <View style={styles.timelineRow}>
              <View style={styles.dotCol}>
                <View style={[styles.dotDashed, { borderColor: PRIMARY, backgroundColor: chipSoftBg }]}>
                  <IconSymbol name="plus" size={20} color={PRIMARY} />
                </View>
              </View>
              <View style={[styles.editorCard, { borderColor: PRIMARY, backgroundColor: chipSoftBg }]}>
                <ThemedText style={[styles.editorKicker, { color: PRIMARY }]}>새 리듬 추가</ThemedText>
                <ThemedText style={[styles.inputLabel, { color: muted }]}>리듬 이름</ThemedText>
                <TextInput
                  value={newTaskName}
                  onChangeText={setNewTaskName}
                  placeholder="딥워크 세션"
                  placeholderTextColor={muted}
                  style={[
                    styles.input,
                    { color: text, borderColor: border, backgroundColor: surface },
                  ]}
                />
                <View style={styles.timeRow}>
                  <View style={styles.timeCol}>
                    <ThemedText style={[styles.inputLabel, { color: muted }]}>시작 시각</ThemedText>
                    <TextInput
                      defaultValue="09:00"
                      placeholder="09:00"
                      placeholderTextColor={muted}
                      style={[
                        styles.input,
                        { color: text, borderColor: border, backgroundColor: surface },
                      ]}
                    />
                  </View>
                  <View style={styles.timeCol}>
                    <ThemedText style={[styles.inputLabel, { color: muted }]}>카테고리</ThemedText>
                    <View style={[styles.selectLike, { borderColor: border, backgroundColor: surface }]}>
                      <ThemedText style={{ color: text, fontSize: 14 }}>생산성</ThemedText>
                      <IconSymbol name="chevron.down" size={16} color={muted} />
                    </View>
                  </View>
                </View>
                <View style={styles.editorActions}>
                  <Pressable style={[styles.addTaskBtn, { backgroundColor: PRIMARY }]}>
                    <ThemedText style={styles.addTaskBtnText}>태스크 추가</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.cancelBtn,
                      { backgroundColor: isDark ? '#334155' : '#e2e8f0' },
                    ]}>
                    <ThemedText style={[styles.cancelBtnText, { color: text }]}>취소</ThemedText>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Future item */}
            <View style={styles.timelineRow}>
              <View style={styles.dotCol}>
                <View style={[styles.dotMuted, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                  <IconSymbol name="moon.stars.fill" size={20} color={muted} />
                </View>
              </View>
              <View
                style={[
                  styles.timelineCard,
                  styles.timelineCardMuted,
                  { borderColor: border, backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : '#f8fafc' },
                ]}>
                <View style={styles.cardRow}>
                  <View style={{ opacity: 0.65 }}>
                    <ThemedText style={[styles.cardTitle, { color: text }]}>취침</ThemedText>
                    <ThemedText style={[styles.cardTimeMuted, { color: muted }]}>오후 10:30</ThemedText>
                  </View>
                  <IconSymbol name="lock.fill" size={20} color={muted} />
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={[styles.bottomBar, { borderTopColor: border, backgroundColor: bg }]}>
          <SafeAreaView edges={['bottom']}>
            <Pressable
              accessibilityRole="button"
              style={[styles.startDayBtn, { backgroundColor: PRIMARY }]}
              onPress={() =>
                router.push({
                  pathname: '/activity-session',
                  params: {
                    title: '아침 조깅',
                    category: '건강',
                    nextTitle: '딥워크 세션',
                    nextTime: '오전 9:00 — 오전 10:30',
                  },
                })
              }>
              <IconSymbol name="play.fill" size={22} color="#fff" />
              <ThemedText style={styles.startDayText}>하루 시작하기</ThemedText>
            </Pressable>
          </SafeAreaView>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  section: {
    padding: 16,
    gap: 12,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  kicker: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  progressNums: {
    alignItems: 'flex-end',
  },
  percentText: {
    fontSize: 22,
    fontWeight: '700',
  },
  tasksHint: {
    fontSize: 11,
    marginTop: 2,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: PRIMARY,
  },
  helper: {
    fontSize: 14,
    lineHeight: 20,
  },
  chipsScroll: {
    maxHeight: 48,
    marginBottom: 8,
  },
  chipsRow: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  chipPrimary: {
    backgroundColor: PRIMARY,
  },
  chipPrimaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  chipOutline: {
    borderWidth: 1,
  },
  chipOutlineText: {
    fontWeight: '600',
    fontSize: 14,
  },
  timelineWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    top: 24,
    bottom: 48,
    width: 2,
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 28,
  },
  dotCol: {
    width: 40,
    alignItems: 'center',
  },
  dotFilled: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  dotRing: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotDashed: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  dotMuted: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timelineCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  timelineCardMuted: {
    borderStyle: 'dashed',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardTime: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  cardTimeMuted: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  editorCard: {
    flex: 1,
    padding: 18,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 4,
  },
  editorKicker: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    marginLeft: 4,
  },
  input: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 14,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  timeCol: {
    flex: 1,
  },
  selectLike: {
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  addTaskBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: PRIMARY,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  addTaskBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelBtnText: {
    fontWeight: '700',
    fontSize: 14,
  },
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  startDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: PRIMARY,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  startDayText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
