import type {
  FastingDetailDataConfig,
  MedicineDetailDataConfig,
  MeditationDetailDataConfig,
  OtherDetailDataConfig,
  RestDetailDataConfig,
  StretchDetailDataConfig,
  StudyDetailDataConfig,
  WaterDetailDataConfig,
  WorkDetailDataConfig,
  YogaDetailDataConfig,
} from '@entities/day-plan';

import {
  BentoGap,
  BentoHalfMetric,
  BentoRow,
  BentoWideMetric,
  BentoWideText,
  formatDurationMinKo,
  HeroTimerBlock,
  SessionDarkShell,
  type SessionHeroProps,
} from './sessionCardShared';

export type { SessionHeroProps };

export function WorkSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: WorkDetailDataConfig }) {
  const planProg = data.planMin > 0 ? Math.min(1, data.doneMin / data.planMin) : 0;
  return (
    <SessionDarkShell accent="ember">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <BentoWideMetric
          featured
          icon="desktopcomputer"
          label="집중 플랜"
          badge="목표"
          value={String(data.planMin)}
          unit="분"
          trackProgress01={Math.max(planProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric icon="clock.arrow.circlepath" label="기록 진행" value={String(data.doneMin)} unit="분" />
          <BentoHalfMetric
            icon="gauge.with.dots.needle.67percent"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionDarkShell>
  );
}

export function StudySessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: StudyDetailDataConfig }) {
  const focusPct = Math.round(hero.progress01 * 100);
  return (
    <SessionDarkShell accent="ember">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <BentoWideMetric
          featured
          icon="bolt.fill"
          label="집중 유지 지수"
          badge="이번 세션"
          value={String(focusPct)}
          unit="/ 100"
          trackProgress01={hero.progress01}
        />
        <BentoWideText
          icon="book.closed.fill"
          label="학습 메모"
          badge="목표"
          body={data.goalMemo.trim() || '목표 상세에서 메모를 적어 주세요.'}
        />
      </BentoGap>
    </SessionDarkShell>
  );
}

export function MeditationSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: MeditationDetailDataConfig }) {
  const goalProg = data.sessionMin > 0 ? Math.min(1, data.elapsedMin / data.sessionMin) : 0;
  return (
    <SessionDarkShell accent="forest">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <BentoWideMetric
          featured
          icon="leaf.fill"
          label="명상 세션"
          badge="목표"
          value={String(data.sessionMin)}
          unit="분"
          trackProgress01={Math.max(goalProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric icon="timer" label="누적 호흡" value={String(data.elapsedMin)} unit="분" />
          <BentoHalfMetric
            icon="waveform.path"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionDarkShell>
  );
}

export function YogaSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: YogaDetailDataConfig }) {
  const goalProg = data.sessionMin > 0 ? Math.min(1, data.elapsedMin / data.sessionMin) : 0;
  return (
    <SessionDarkShell accent="forest">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <BentoWideMetric
          featured
          icon="figure.yoga"
          label={data.flowLabel || '요가 플로우'}
          badge="세션"
          value={String(data.sessionMin)}
          unit="분"
          trackProgress01={Math.max(goalProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric icon="flame" label="진행 시간" value={String(data.elapsedMin)} unit="분" />
          <BentoHalfMetric
            icon="circle.circle"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionDarkShell>
  );
}

export function RestSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: RestDetailDataConfig }) {
  const goalProg = data.restMin > 0 ? Math.min(1, data.elapsedMin / data.restMin) : 0;
  return (
    <SessionDarkShell accent="amethyst">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <BentoWideMetric
          featured
          icon="moon.zzz.fill"
          label="휴식 목표"
          badge="릴렉스"
          value={String(data.restMin)}
          unit="분"
          trackProgress01={Math.max(goalProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric icon="bed.double.fill" label="쉬는 중" value={String(data.elapsedMin)} unit="분" />
          <BentoHalfMetric
            icon="heart.fill"
            label="릴렉스 지수"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionDarkShell>
  );
}

export function FastingSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: FastingDetailDataConfig }) {
  const goalProg = data.fastingMin > 0 ? Math.min(1, data.elapsedMin / data.fastingMin) : 0;
  return (
    <SessionDarkShell accent="amethyst">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <BentoWideMetric
          featured
          icon="clock.badge.checkmark"
          label="단식 목표"
          badge="금식"
          value={formatDurationMinKo(data.fastingMin)}
          trackProgress01={Math.max(goalProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric icon="hourglass" label="경과" value={formatDurationMinKo(data.elapsedMin)} />
          <BentoHalfMetric
            icon="chart.line.uptrend.xyaxis"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionDarkShell>
  );
}

export function WaterSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: WaterDetailDataConfig }) {
  const drinkProg = data.goalMl > 0 ? Math.min(1, data.drankMl / data.goalMl) : 0;
  return (
    <SessionDarkShell accent="aqua">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <BentoWideMetric
          featured
          icon="drop.fill"
          label="수분 목표"
          badge="하루"
          value={String(data.goalMl)}
          unit="ml"
          trackProgress01={Math.max(drinkProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric icon="cup.and.saucer.fill" label="섭취량" value={String(data.drankMl)} unit="ml" />
          <BentoHalfMetric
            icon="percent"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionDarkShell>
  );
}

export function MedicineSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: MedicineDetailDataConfig }) {
  const doseProg = data.dosesPerDay > 0 ? Math.min(1, data.takenCount / data.dosesPerDay) : 0;
  return (
    <SessionDarkShell accent="ember">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <BentoWideText
          icon="cross.case.fill"
          label="복용 항목"
          badge="지금"
          body={data.doseLabel.trim() || '목표 상세에서 약 이름을 적어 주세요.'}
        />
        <BentoWideMetric
          featured
          icon="pill.fill"
          label="오늘 복용"
          badge="진행"
          value={`${data.takenCount} / ${data.dosesPerDay}`}
          unit="회"
          trackProgress01={Math.max(doseProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric icon="calendar" label="하루 횟수" value={String(data.dosesPerDay)} unit="회" />
          <BentoHalfMetric
            icon="checkmark.seal.fill"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionDarkShell>
  );
}

export function StretchSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: StretchDetailDataConfig }) {
  const setProg = data.totalSets > 0 ? Math.min(1, data.doneSets / data.totalSets) : 0;
  return (
    <SessionDarkShell accent="ember">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <BentoWideMetric
          featured
          icon="figure.flexibility"
          label="스트레칭 세트"
          badge="목표"
          value={`${data.doneSets} / ${data.totalSets}`}
          unit="세트"
          trackProgress01={Math.max(setProg, hero.progress01)}
        />
        <BentoRow>
          <BentoHalfMetric icon="timer" label="홀드" value={String(data.holdSec)} unit="초" />
          <BentoHalfMetric
            icon="bolt.heart.fill"
            label="세션 진행"
            value={String(Math.round(hero.progress01 * 100))}
            unit="%"
          />
        </BentoRow>
      </BentoGap>
    </SessionDarkShell>
  );
}

export function OtherSessionCard({
  data,
  ...hero
}: SessionHeroProps & { data: OtherDetailDataConfig }) {
  return (
    <SessionDarkShell accent="none">
      <HeroTimerBlock {...hero} />
      <BentoGap>
        <BentoWideText
          icon="star.fill"
          label="플로우 메모"
          badge="사용자"
          body={data.memo.trim() || '목표 상세에서 메모를 적어 주세요.'}
        />
      </BentoGap>
    </SessionDarkShell>
  );
}
