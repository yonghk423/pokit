import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTodayDashboard } from '@features/today-dashboard';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

const BRAND_ORANGE = '#FF7A00';
const BRAND_ORANGE_ALT = '#FF7B04';
const BLUE_ACCENT = '#60a5fa';
const EMERALD_ACCENT = '#34d399';

export function TodayPage() {
  const { routines, addSampleRoutine, startRoutineExecution } = useTodayDashboard();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const onCta = () => {
    if (routines.length === 0) {
      addSampleRoutine();
      return;
    }
    startRoutineExecution(routines[0]);
  };

  const glassSurface = isDark ? styles.glassDark : styles.glassLight;
  const onSurface = isDark ? 'rgba(255,255,255,0.92)' : 'rgba(17,24,28,0.92)';
  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.mainColumn}>
          {/* Top Identity */}
          <View style={styles.identitySection}>
            <View style={styles.identityRow}>
              <View style={styles.kineticIconBadge}>
                <IconSymbol name="lock.open" size={22} color="#fff" />
              </View>
              <ThemedText style={styles.lockFlowTitle}>LockFlow</ThemedText>
            </View>
          </View>

          {/* Routine Cards Stack */}
          <View style={styles.stackSection}>
            {/* 명상 (맨 아래) */}
            <View style={[styles.routineCard, glassSurface, styles.cardMeditation]}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardTitleBlock}>
                  <View style={[styles.iconCircle, styles.blueGlow]}>
                    <IconSymbol name="figure.yoga" size={20} color="#fff" />
                  </View>
                  <View>
                    <ThemedText style={styles.cardTitle}>명상</ThemedText>
                    <ThemedText style={styles.cardSubtitle}>평온한 시작</ThemedText>
                  </View>
                </View>
                <ThemedText style={[styles.cardTime, { color: BLUE_ACCENT }]}>10:00</ThemedText>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.blueGlow, { width: '80%' }]} />
              </View>
            </View>
            {/* 독서 (중간) */}
            <View style={[styles.routineCard, glassSurface, styles.cardReading]}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardTitleBlock}>
                  <View style={[styles.iconCircle, styles.greenGlow]}>
                    <IconSymbol name="book.closed.fill" size={20} color="#fff" />
                  </View>
                  <View>
                    <ThemedText style={styles.cardTitle}>독서</ThemedText>
                    <ThemedText style={styles.cardSubtitle}>지식의 확장</ThemedText>
                  </View>
                </View>
                <ThemedText style={[styles.cardTime, { color: EMERALD_ACCENT }]}>20:00</ThemedText>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.greenGlow, { width: '66.6%' }]} />
              </View>
            </View>
            {/* 조깅 (맨 위) */}
            <View style={[styles.routineCard, glassSurface, styles.cardJogging]}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardTitleBlock}>
                  <View style={[styles.iconCircle, styles.orangeGlow]}>
                    <IconSymbol name="figure.run" size={20} color="#fff" />
                  </View>
                  <View>
                    <ThemedText style={styles.cardTitle}>조깅</ThemedText>
                    <ThemedText style={styles.cardSubtitle}>활기찬 에너지</ThemedText>
                  </View>
                </View>
                <ThemedText style={[styles.cardTime, { color: BRAND_ORANGE_ALT }]}>07:30</ThemedText>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, styles.orangeGlow, { width: '33.3%' }]} />
              </View>
              <View style={styles.joggingMetaRow}>
                <ThemedText style={styles.joggingMetaLeft}>LockFlow Premium</ThemedText>
                <ThemedText style={styles.joggingMetaRight}>목표 시간 45분</ThemedText>
              </View>
            </View>
          </View>

          {/* Marketing */}
          <View style={styles.marketingSection}>
            <ThemedText style={[styles.marketingHeadline, { color: onSurface }]}>
              당신의 flow를 찾으세요.{'\n'}
              <ThemedText style={styles.marketingAccent}>하루를 마스터하세요.</ThemedText>
            </ThemedText>
          </View>

          {/* CTA */}
          <View style={styles.ctaSection}>
            <Pressable style={styles.ctaButton} onPress={onCta}>
              <ThemedText style={styles.ctaButtonText}>flow 시작하기</ThemedText>
              <IconSymbol name="arrow.forward" size={22} color="#fff" />
            </Pressable>
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
  mainColumn: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    justifyContent: 'space-between',
  },
  identitySection: {
    alignItems: 'center',
    paddingTop: 4,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kineticIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: BRAND_ORANGE_ALT,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND_ORANGE_ALT,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  lockFlowTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.8,
    color: BRAND_ORANGE,
  },
  stackSection: {
    position: 'relative',
    flex: 1,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    minHeight: 260,
    marginVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassLight: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1,
  },
  glassDark: {
    backgroundColor: 'rgba(30,30,30,0.45)',
    borderColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
  },
  routineCard: {
    position: 'absolute',
    width: '100%',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    left: 0,
    right: 0,
  },
  cardMeditation: {
    zIndex: 1,
    opacity: 0.8,
    transform: [{ translateY: 72 }, { scale: 0.9 }, { rotate: '-2deg' }],
  },
  cardReading: {
    zIndex: 10,
    opacity: 0.9,
    transform: [{ translateY: 36 }, { scale: 0.95 }, { rotate: '1deg' }],
  },
  cardJogging: {
    zIndex: 20,
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }, { rotate: '0deg' }],
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueGlow: {
    backgroundColor: '#3b82f6',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  greenGlow: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  orangeGlow: {
    backgroundColor: BRAND_ORANGE_ALT,
    shadowColor: BRAND_ORANGE_ALT,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  cardTime: {
    fontSize: 20,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  joggingMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  joggingMetaLeft: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  joggingMetaRight: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  marketingSection: {
    alignItems: 'center',
    paddingHorizontal: 8,
    marginTop: 4,
    flexShrink: 1,
  },
  marketingHeadline: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  marketingAccent: {
    color: BRAND_ORANGE_ALT,
    fontWeight: '800',
  },
  ctaSection: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingTop: 10,
    paddingBottom: 4,
    alignItems: 'center',
    flexShrink: 0,
  },
  ctaButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    backgroundColor: BRAND_ORANGE_ALT,
    shadowColor: BRAND_ORANGE_ALT,
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 16 },
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});
