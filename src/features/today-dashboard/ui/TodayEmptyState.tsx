import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@shared/ui/themed-text';
import { ThemedView } from '@shared/ui/themed-view';

type Props = {
  onStartBuilding: () => void;
  dateLabel?: string;
  /** 루틴이 이미 있을 때 메인 카드 제목 (기본: 첫 루틴 만들기) */
  mainCtaTitle?: string;
  /** 루틴이 이미 있을 때 메인 카드 설명 */
  mainCtaDescription?: string;
  /** 메인 CTA 버튼 라벨 (기본: 시작하기) */
  primaryButtonLabel?: string;
};

const DEFAULT_MAIN_TITLE = '첫 루틴 만들기';
const DEFAULT_MAIN_DESC =
  '집중과 균형을 위한 습관 순서를 설계해 보세요.';
const DEFAULT_PRIMARY_LABEL = '시작하기';

export function TodayEmptyState({
  onStartBuilding,
  dateLabel = '내일',
  mainCtaTitle = DEFAULT_MAIN_TITLE,
  mainCtaDescription = DEFAULT_MAIN_DESC,
  primaryButtonLabel = DEFAULT_PRIMARY_LABEL,
}: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.welcome}>
        <ThemedText type="title" style={styles.welcomeTitle}>
          LockFlow에 오신 것을 환영해요!
        </ThemedText>
        <ThemedText style={styles.welcomeSub}>
          첫 루틴을 시작해서 흐름을 찾아보세요.
        </ThemedText>
      </View>

      <View style={styles.grid}>
        <ThemedView style={[styles.card, styles.mainCtaCard]}>
          <View style={styles.cardBody}>
            <View style={styles.iconBadge}>
              <ThemedText type="defaultSemiBold" style={styles.iconBadgeText}>
                +
              </ThemedText>
            </View>
            <ThemedText type="subtitle" style={styles.mainTitle}>
              {mainCtaTitle}
            </ThemedText>
            <ThemedText style={styles.mainDesc}>{mainCtaDescription}</ThemedText>
          </View>

          <Pressable style={styles.mainBtn} onPress={onStartBuilding}>
            <ThemedText type="defaultSemiBold" style={styles.mainBtnText}>
              {primaryButtonLabel}
            </ThemedText>
            <ThemedText style={styles.mainBtnArrow}>→</ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={[styles.card, styles.sideCard]}>
          <View style={styles.sideHeader}>
            <ThemedText style={styles.sideHeaderLabel}>인사이트</ThemedText>
          </View>
          <View style={styles.sideCenter}>
            <View style={[styles.skeletonLine, { width: 64 }]} />
            <View style={[styles.skeletonLine, { width: 48, marginTop: 8 }]} />
            <ThemedText style={styles.sideHint}>
              아직 데이터가 없어요. 첫 루틴을 완료하면 통계를 볼 수 있어요.
            </ThemedText>
          </View>
        </ThemedView>

        <View style={styles.timeline}>
          <View style={styles.timelineHeader}>
            <ThemedText style={styles.timelineTitle}>오늘 타임라인</ThemedText>
            <ThemedText style={styles.timelineDate}>{dateLabel}</ThemedText>
          </View>

          <ThemedView style={[styles.card, styles.slot, styles.slotStrong]}>
            <View style={styles.dotCol}>
              <View style={styles.dot} />
              <View style={styles.line} />
            </View>
            <View style={styles.slotBox}>
              <ThemedText style={styles.slotLabel}>오전 슬롯 비어 있음</ThemedText>
            </View>
          </ThemedView>

          <ThemedView style={[styles.card, styles.slot, styles.slotMid]}>
            <View style={styles.dotCol}>
              <View style={styles.dot} />
              <View style={styles.line} />
            </View>
            <View style={styles.slotBox}>
              <ThemedText style={styles.slotLabel}>오후 슬롯 비어 있음</ThemedText>
            </View>
          </ThemedView>

          <ThemedView style={[styles.card, styles.slot, styles.slotLow]}>
            <View style={styles.dotCol}>
              <View style={styles.dot} />
            </View>
            <View style={styles.slotBox}>
              <ThemedText style={styles.slotLabel}>저녁 슬롯 비어 있음</ThemedText>
            </View>
          </ThemedView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 16,
  },
  welcome: {
    gap: 6,
  },
  welcomeTitle: {
    fontSize: 24,
    lineHeight: 28,
  },
  welcomeSub: {
    opacity: 0.7,
  },

  grid: {
    gap: 12,
  },

  card: {
    borderRadius: 18,
    padding: 16,
    overflow: 'hidden',
  },

  mainCtaCard: {
    minHeight: 260,
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150,150,150,0.25)',
    backgroundColor: 'rgba(250,250,250,1)',
  },
  cardBody: {
    gap: 10,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(249,115,22,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeText: {
    fontSize: 26,
    color: 'rgba(249,115,22,0.95)',
  },
  mainTitle: {
    marginTop: 6,
  },
  mainDesc: {
    opacity: 0.75,
    lineHeight: 20,
  },
  mainBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(249,115,22,0.95)',
  },
  mainBtnText: {
    color: '#fff',
  },
  mainBtnArrow: {
    color: '#fff',
    opacity: 0.95,
    fontSize: 16,
  },

  sideCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150,150,150,0.25)',
    backgroundColor: 'rgba(250,250,250,1)',
  },
  sideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sideHeaderLabel: {
    fontSize: 12,
    letterSpacing: 2,
    opacity: 0.5,
  },
  sideCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 6,
  },
  skeletonLine: {
    height: 6,
    borderRadius: 99,
    backgroundColor: 'rgba(120,120,120,0.18)',
  },
  sideHint: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.65,
    fontStyle: 'italic',
  },

  timeline: {
    gap: 10,
    marginTop: 4,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineTitle: {
    fontSize: 12,
    letterSpacing: 2,
    opacity: 0.65,
  },
  timelineDate: {
    fontSize: 12,
    opacity: 0.5,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150,150,150,0.25)',
    backgroundColor: 'rgba(250,250,250,1)',
  },
  slotStrong: { opacity: 0.65 },
  slotMid: { opacity: 0.45 },
  slotLow: { opacity: 0.28 },
  dotCol: {
    width: 16,
    alignItems: 'center',
    paddingTop: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(160,160,160,0.5)',
    backgroundColor: 'transparent',
  },
  line: {
    width: 1,
    flex: 1,
    marginTop: 6,
    backgroundColor: 'rgba(180,180,180,0.3)',
  },
  slotBox: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(150,150,150,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  slotLabel: {
    fontSize: 12,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
});

