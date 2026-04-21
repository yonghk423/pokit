import type {
  FastingDetailDataConfig,
  MedicineDetailDataConfig,
  MeditationDetailDataConfig,
  OtherDetailDataConfig,
  WaterDetailDataConfig,
  WorkDetailDataConfig,
  YogaDetailDataConfig,
} from '@entities/day-plan';
import { CategoryImmersionTheme as T } from '@shared/config/categoryImmersionTheme';
import { StyleSheet, Text, View } from 'react-native';

import {
  BentoGap,
  BentoHalfMetric,
  BentoRow,
  BentoWideMetric,
  BentoWideText,
  EditorialCategoryHeader,
  EditorialSimpleHeader,
  formatDurationMinKo,
  HeroTimerBlock,
  SessionEditorialShell,
  type SessionHeroProps,
} from './sessionCardShared';
import { IconSymbol } from '@shared/ui/icon-symbol';

/** 수분 — 목표 상세 시안과 동일 시안 */
const WATER_CYAN = T.water.accent;
const WATER_SOFT = T.water.accentSoft;

export type { SessionHeroProps };

export function WorkSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: WorkDetailDataConfig }) {
  const planProg = data.planMin > 0 ? Math.min(1, data.doneMin / data.planMin) : 0;
  return (
    <SessionEditorialShell leftAccentColor={T.work.accent}>
      <EditorialSimpleHeader
        title="작업 몰입"
        subtitle="집중 플랜과 할 일을 세션 화면에서 바로 확인해요."
      />
      <HeroTimerBlock {...hero} surface="light" accent="ember" />
      <BentoGap>
        <BentoWideMetric
          featured
          surface="light"
          accentColor={T.work.accent}
          icon="desktopcomputer"
          label="집중 플랜"
          badge="목표"
          value={String(data.planMin)}
          unit="분"
          trackProgress01={Math.max(planProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric
            surface="light"
            accentColor={T.work.accent}
            icon="clock.arrow.circlepath"
            label="기록 진행"
            value={String(data.doneMin)}
            unit="분"
          />
          <BentoHalfMetric
            surface="light"
            accentColor={T.work.accent}
            icon="gauge.with.dots.needle.67percent"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionEditorialShell>
  );
}

export function MeditationSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: MeditationDetailDataConfig }) {
  const goalProg = data.sessionMin > 0 ? Math.min(1, data.elapsedMin / data.sessionMin) : 0;
  return (
    <SessionEditorialShell>
      <EditorialSimpleHeader title="명상 세션" subtitle="한 세션 길이와 누적 호흡을 분 단위로 맞춰요." />
      <HeroTimerBlock {...hero} surface="light" accent="ember" />
      <BentoGap>
        <BentoWideMetric
          featured
          surface="light"
          icon="leaf.fill"
          label="명상 세션"
          badge="목표"
          value={String(data.sessionMin)}
          unit="분"
          trackProgress01={Math.max(goalProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric surface="light" icon="timer" label="누적 호흡" value={String(data.elapsedMin)} unit="분" />
          <BentoHalfMetric
            surface="light"
            icon="waveform.path"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionEditorialShell>
  );
}

export function YogaSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: YogaDetailDataConfig }) {
  const goalProg = data.sessionMin > 0 ? Math.min(1, data.elapsedMin / data.sessionMin) : 0;
  return (
    <SessionEditorialShell>
      <EditorialSimpleHeader title="요가 세션" subtitle="오늘의 플로우 이름과 세션 길이를 함께 봐요." />
      <HeroTimerBlock {...hero} surface="light" accent="ember" />
      <BentoGap>
        <BentoWideMetric
          featured
          surface="light"
          icon="figure.yoga"
          label={data.flowLabel || '요가 플로우'}
          badge="세션"
          value={String(data.sessionMin)}
          unit="분"
          trackProgress01={Math.max(goalProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric surface="light" icon="flame" label="진행 시간" value={String(data.elapsedMin)} unit="분" />
          <BentoHalfMetric
            surface="light"
            icon="circle.circle"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionEditorialShell>
  );
}

export function FastingSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: FastingDetailDataConfig }) {
  const goalProg = data.fastingMin > 0 ? Math.min(1, data.elapsedMin / data.fastingMin) : 0;
  return (
    <SessionEditorialShell leftAccentColor={T.fasting.accent}>
      <EditorialCategoryHeader brand={T.fasting.brand} aboutKicker={T.fasting.aboutKicker} />
      <HeroTimerBlock {...hero} surface="light" accent="ember" />
      <BentoGap>
        <BentoWideMetric
          featured
          surface="light"
          accentColor={T.fasting.accent}
          icon="clock.badge.checkmark"
          label="목표 단식"
          badge="금식"
          value={formatDurationMinKo(data.fastingMin)}
          trackProgress01={Math.max(goalProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric
            surface="light"
            accentColor={T.fasting.accent}
            icon="hourglass"
            label="경과"
            value={formatDurationMinKo(data.elapsedMin)}
          />
          <BentoHalfMetric
            surface="light"
            accentColor={T.fasting.accent}
            icon="chart.line.uptrend.xyaxis"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionEditorialShell>
  );
}

export function WaterSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: WaterDetailDataConfig }) {
  const drinkProg = data.goalMl > 0 ? Math.min(1, data.drankMl / data.goalMl) : 0;
  const track01 = Math.max(drinkProg, hero.progress01);
  const remainingMl = Math.max(0, data.goalMl - data.drankMl);
  const goalL = (data.goalMl / 1000).toFixed(1);
  const remL = (remainingMl / 1000).toFixed(1);
  const sessionPct = Math.round(hero.progress01 * 100);

  return (
    <SessionEditorialShell leftAccentColor={WATER_CYAN}>
      <EditorialCategoryHeader brand={T.water.brand} aboutKicker={T.water.aboutKicker} />
      <HeroTimerBlock {...hero} surface="light" accent="aqua" progressFillColor={WATER_CYAN} />
      <BentoGap>
        <View style={[waterCardStyles.cardWide, waterCardStyles.glass, waterCardStyles.cardFeatured]}>
          <View style={waterCardStyles.cardTopRow}>
            <View style={waterCardStyles.cardTopLeft}>
              <IconSymbol name="drop.fill" size={22} color={WATER_CYAN} />
              <Text style={waterCardStyles.labelUpper}>하루 물 목표</Text>
            </View>
            <View style={waterCardStyles.badge}>
              <Text style={waterCardStyles.badgeText}>오늘</Text>
            </View>
          </View>
          <View style={waterCardStyles.metricBigRow}>
            <Text style={waterCardStyles.metricHuge}>{goalL}</Text>
            <Text style={waterCardStyles.metricUnit}>L</Text>
          </View>
          <Text style={waterCardStyles.goalSub}>
            {data.goalMl}ml 기준 · 세션 {sessionPct}%
          </Text>
          <View style={waterCardStyles.subTrack}>
            <View style={[waterCardStyles.subFill, { width: `${Math.round(track01 * 100)}%` }]} />
          </View>
        </View>

        <BentoRow>
          <View style={[waterCardStyles.cardHalf, waterCardStyles.glass]}>
            <IconSymbol name="cup.and.saucer.fill" size={20} color={WATER_CYAN} />
            <Text style={[waterCardStyles.labelUpper, { marginTop: 8 }]}>섭취량</Text>
            <View style={waterCardStyles.halfMetricRow}>
              <Text style={waterCardStyles.halfValue}>{String(data.drankMl)}</Text>
              <Text style={waterCardStyles.halfUnit}>ml</Text>
            </View>
          </View>
          <View style={[waterCardStyles.cardHalf, waterCardStyles.glass]}>
            <IconSymbol name="arrow.down.circle.fill" size={20} color={WATER_CYAN} />
            <Text style={[waterCardStyles.labelUpper, { marginTop: 8 }]}>남은 양</Text>
            <View style={waterCardStyles.halfMetricRow}>
              <Text style={waterCardStyles.halfValue}>{remL}</Text>
              <Text style={waterCardStyles.halfUnit}>L</Text>
            </View>
          </View>
        </BentoRow>
      </BentoGap>
    </SessionEditorialShell>
  );
}

const waterCardStyles = StyleSheet.create({
  glass: {
    backgroundColor: T.editorial.glassBg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: T.water.border,
    borderRadius: 16,
  },
  cardWide: { padding: 18 },
  cardFeatured: {
    borderLeftWidth: 3,
    borderLeftColor: WATER_CYAN,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTopLeft: { gap: 8, flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0 },
  badge: {
    backgroundColor: WATER_SOFT,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    color: WATER_CYAN,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  labelUpper: {
    color: T.water.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  metricBigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 18,
  },
  metricHuge: {
    color: T.water.onSurface,
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  metricUnit: {
    color: T.water.muted,
    fontSize: 20,
    fontWeight: '600',
  },
  goalSub: {
    marginTop: 8,
    color: T.water.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  subTrack: {
    marginTop: 14,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  subFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: WATER_CYAN,
    opacity: 0.45,
  },
  cardHalf: {
    flex: 1,
    padding: 16,
    minHeight: 112,
  },
  halfMetricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 10,
  },
  halfValue: {
    color: T.water.onSurface,
    fontSize: 26,
    fontWeight: '800',
  },
  halfUnit: {
    color: T.water.muted,
    fontSize: 12,
    fontWeight: '700',
  },
});

export function MedicineSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: MedicineDetailDataConfig }) {
  const doseProg = data.dosesPerDay > 0 ? Math.min(1, data.takenCount / data.dosesPerDay) : 0;
  return (
    <SessionEditorialShell leftAccentColor={T.medicine.accent}>
      <EditorialCategoryHeader brand={T.medicine.brand} aboutKicker={T.medicine.aboutKicker} />
      <HeroTimerBlock {...hero} surface="light" accent="ember" />
      <BentoGap>
        <BentoWideText
          surface="light"
          icon="cross.case.fill"
          label="복용 항목"
          badge="지금"
          body={data.doseLabel.trim() || '목표 상세에서 약 이름을 적어 주세요.'}
        />
        <BentoWideMetric
          featured
          surface="light"
          accentColor={T.medicine.accent}
          icon="pill.fill"
          label="오늘 복용"
          badge="진행"
          value={`${data.takenCount} / ${data.dosesPerDay}`}
          unit="회"
          trackProgress01={Math.max(doseProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric
            surface="light"
            accentColor={T.medicine.accent}
            icon="calendar"
            label="하루 횟수"
            value={String(data.dosesPerDay)}
            unit="회"
          />
          <BentoHalfMetric
            surface="light"
            accentColor={T.medicine.accent}
            icon="checkmark.seal.fill"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionEditorialShell>
  );
}

export function OtherSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: OtherDetailDataConfig }) {
  const doneCount = data.checklist.filter((x) => x.done).length;
  const pendingCount = data.checklist.length - doneCount;
  const checklistTop = data.checklist
    .slice(0, 3)
    .map((x) => `${x.done ? '✓' : '•'} ${x.text}`)
    .join('\n');
  return (
    <SessionEditorialShell leftAccentColor={T.other.accent}>
      <EditorialCategoryHeader brand={T.other.brand} aboutKicker={T.other.aboutKicker} />
      <HeroTimerBlock {...hero} surface="light" accent="ember" />
      <BentoGap>
        <BentoWideText
          surface="light"
          icon="star.fill"
          label="플로우 체크리스트"
          badge="맞춤 플로우"
          body={checklistTop || '목표 상세에서 체크리스트를 입력해 주세요.'}
        />
        <BentoRow>
          <BentoHalfMetric surface="light" icon="checkmark.seal.fill" label="완료" value={String(doneCount)} unit="개" />
          <BentoHalfMetric surface="light" icon="list.bullet" label="남은 작업" value={String(Math.max(0, pendingCount))} unit="개" />
        </BentoRow>
      </BentoGap>
    </SessionEditorialShell>
  );
}
