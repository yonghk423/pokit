import { StyleSheet, Text, View } from 'react-native';

import type { RunDetailDataConfig } from '@entities/day-plan';
import { IconSymbol } from '@shared/ui/icon-symbol';

import {
  BentoGap,
  HeroTimerBlock,
  ORANGE,
  ORANGE_SOFT,
  GLASS_BG,
  GLASS_BORDER,
  META,
  SessionDarkShell,
  type SessionHeroProps,
} from './sessionCardShared';

function formatKm(n: number): string {
  const x = Math.max(0, n);
  return (Math.round(x * 10) / 10).toFixed(1);
}

type Props = { dataConfig: RunDetailDataConfig } & SessionHeroProps;

export function RunningSessionCard({
  dataConfig,
  ...hero
}: Props) {
  const { progress01, isWaitingToStart = false } = hero;
  const p = isWaitingToStart ? 0 : Math.min(1, Math.max(0, progress01));

  const placeName = typeof dataConfig.placeName === 'string' ? dataConfig.placeName : '';
  const placeSub = typeof dataConfig.placeSub === 'string' ? dataConfig.placeSub : '';
  const placeTitle = placeName.trim().length > 0 ? placeName.trim() : '코스 미정';
  const placeSubtitle =
    placeSub.trim().length > 0 ? placeSub.trim() : '목표 상세에서 위치를 입력해 주세요';

  return (
    <SessionDarkShell accent="ember">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <View style={[styles.cardWide, styles.glass, styles.placeCard]}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopLeft}>
              <IconSymbol name="mappin.and.ellipse" size={22} color={ORANGE} />
              <Text style={styles.labelUpper}>코스 · 장소</Text>
            </View>
          </View>
          <Text style={styles.placeTitle} numberOfLines={2}>
            {placeTitle}
          </Text>
          <Text style={styles.placeSub} numberOfLines={2}>
            {placeSubtitle}
          </Text>
        </View>

        <View style={[styles.cardWide, styles.glass]}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopLeft}>
              <IconSymbol name="figure.run" size={22} color={ORANGE} />
              <Text style={styles.labelUpper}>목표 거리</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>고정 목표</Text>
            </View>
          </View>
          <View style={styles.metricBigRow}>
            <Text style={styles.metricHuge}>{formatKm(dataConfig.targetKm)}</Text>
            <Text style={styles.metricUnit}>km</Text>
          </View>
          <View style={styles.subTrack}>
            <View style={[styles.subFill, { width: `${Math.round(p * 100)}%` }]} />
          </View>
        </View>

        <View style={[styles.cardWide, styles.glass, styles.kcalCard]}>
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopLeft}>
              <IconSymbol name="flame.fill" size={22} color={ORANGE} />
              <Text style={styles.labelUpper}>목표 칼로리</Text>
            </View>
          </View>
          <View style={styles.kcalRow}>
            <Text style={styles.kcalValueLarge}>{Math.round(dataConfig.caloriesGoalKcal)}</Text>
            <Text style={styles.kcalUnitLarge}>kcal</Text>
          </View>
        </View>
      </BentoGap>
    </SessionDarkShell>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: GLASS_BG,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: GLASS_BORDER,
    borderRadius: 14,
  },
  cardWide: {
    padding: 18,
    gap: 0,
  },
  placeCard: {
    gap: 8,
    paddingBottom: 16,
  },
  placeTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 12,
  },
  placeSub: {
    color: META,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  kcalCard: {
    paddingBottom: 20,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTopLeft: { gap: 6, flex: 1, minWidth: 0 },
  badge: {
    backgroundColor: ORANGE_SOFT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    color: ORANGE,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  labelUpper: {
    color: META,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  metricBigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 18,
  },
  metricHuge: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  metricUnit: {
    color: META,
    fontSize: 20,
    fontWeight: '600',
  },
  subTrack: {
    marginTop: 14,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  subFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: ORANGE,
    opacity: 0.45,
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 16,
  },
  kcalValueLarge: { color: '#fff', fontSize: 44, fontWeight: '800', letterSpacing: -0.5 },
  kcalUnitLarge: { color: META, fontSize: 20, fontWeight: '600', textTransform: 'uppercase' },
});
