import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

import { SessionProgressRing } from './SessionProgressRing';

const PRIMARY = 'rgb(249, 115, 22)';
const RING_SIZE = 232;
const RING_STROKE = 14;

/** 목업: 45분 세션 중 약 42% 진행 */
const DEMO_SESSION_TOTAL_SEC = 45 * 60;
const DEMO_PROGRESS = 0.42;
const DEMO_REMAINING_SEC = Math.round(DEMO_SESSION_TOTAL_SEC * (1 - DEMO_PROGRESS));

function pickParam(value: string | string[] | undefined, fallback: string): string {
  if (typeof value === 'string' && value.length > 0) return value;
  if (Array.isArray(value) && value[0]) return value[0];
  return fallback;
}

/** mm:ss */
function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

export function ActivitySessionPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    category?: string;
    nextTitle?: string;
    nextTime?: string;
  }>();

  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const activityTitle = pickParam(params.title, '아침 조깅');
  const categoryLabel = pickParam(params.category, '건강');
  const nextTitle = pickParam(params.nextTitle, '딥워크 세션');
  const nextTime = pickParam(params.nextTime, '오전 9:00 — 오전 10:30');

  const bg = isDark ? '#0f172a' : '#f8fafc';
  const surface = isDark ? '#1e293b' : '#ffffff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const muted = isDark ? '#94a3b8' : '#64748b';
  const text = isDark ? '#f1f5f9' : '#0f172a';
  const chipSoftBg = isDark ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.12)';
  const ringTrack = isDark ? '#334155' : '#e2e8f0';

  const [isPaused, setIsPaused] = useState(false);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: bg }]}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: border }]}>
          <Pressable
            accessibilityRole="button"
            style={styles.headerIconBtn}
            onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={22} color={text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <ThemedText style={[styles.kicker, { color: PRIMARY }]}>현재 활동</ThemedText>
            <ThemedText style={[styles.headerTitle, { color: text }]} numberOfLines={1}>
              {activityTitle}
            </ThemedText>
            <View style={[styles.categoryChip, { backgroundColor: chipSoftBg }]}>
              <ThemedText style={[styles.categoryChipText, { color: PRIMARY }]}>
                {categoryLabel}
              </ThemedText>
            </View>
          </View>
          <Pressable accessibilityRole="button" style={styles.headerIconBtn}>
            <IconSymbol name="gearshape" size={22} color={text} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.bodyMain}>
            <View style={styles.ringBlock}>
              <SessionProgressRing
                size={RING_SIZE}
                strokeWidth={RING_STROKE}
                progress={DEMO_PROGRESS}
                trackColor={ringTrack}
                accentColor={PRIMARY}
              />
              <View style={styles.ringCenter} pointerEvents="none">
                <ThemedText style={[styles.timeLarge, { color: text }]}>
                  {formatClock(DEMO_REMAINING_SEC)}
                </ThemedText>
                <ThemedText style={[styles.timeHint, { color: muted }]}>남은 시간</ThemedText>
                {isPaused ? (
                  <View style={[styles.pauseBadge, { backgroundColor: chipSoftBg }]}>
                    <ThemedText style={[styles.pauseBadgeText, { color: PRIMARY }]}>
                      일시정지됨
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              style={[styles.primaryBtn, { backgroundColor: PRIMARY }]}
              onPress={() => router.back()}>
              <IconSymbol name="stop.fill" size={20} color="#fff" />
              <ThemedText style={styles.primaryBtnText}>활동 종료</ThemedText>
            </Pressable>

            <View style={styles.secondaryRow}>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.secondaryBtn,
                  { borderColor: border, backgroundColor: surface },
                ]}
                onPress={() => setIsPaused((p) => !p)}>
                <IconSymbol
                  name={isPaused ? 'play.fill' : 'pause.fill'}
                  size={18}
                  color={text}
                />
                <ThemedText style={[styles.secondaryBtnText, { color: text }]}>
                  {isPaused ? '계속하기' : '일시정지'}
                </ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.secondaryBtn,
                  { borderColor: border, backgroundColor: surface },
                ]}>
                <IconSymbol name="forward.fill" size={18} color={muted} />
                <ThemedText style={[styles.secondaryBtnText, { color: muted }]}>건너뛰기</ThemedText>
              </Pressable>
            </View>
          </View>

          <View style={[styles.nextCard, { backgroundColor: surface, borderColor: border }]}>
            <ThemedText style={[styles.nextKicker, { color: muted }]}>다음 단계</ThemedText>
            <View style={styles.nextRow}>
              <View style={[styles.nextIconWrap, { backgroundColor: chipSoftBg }]}>
                <IconSymbol name="bolt.fill" size={22} color={PRIMARY} />
              </View>
              <View style={styles.nextTextCol}>
                <ThemedText style={[styles.nextTitle, { color: text }]}>{nextTitle}</ThemedText>
                <ThemedText style={[styles.nextMeta, { color: PRIMARY }]}>{nextTime}</ThemedText>
              </View>
              <IconSymbol name="chevron.right" size={18} color={muted} />
            </View>
          </View>
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
    paddingBottom: 12,
    paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  kicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerTitle: {
    marginTop: 4,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryChip: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 16,
  },
  bodyMain: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    minHeight: 0,
  },
  ringBlock: {
    alignSelf: 'center',
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: RING_STROKE * 2,
  },
  timeLarge: {
    fontSize: 44,
    lineHeight: 50,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  timeHint: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  pauseBadge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pauseBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: PRIMARY,
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 10 },
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontWeight: '700',
    fontSize: 15,
  },
  nextCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  nextKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTextCol: {
    flex: 1,
    gap: 4,
  },
  nextTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  nextMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
});
