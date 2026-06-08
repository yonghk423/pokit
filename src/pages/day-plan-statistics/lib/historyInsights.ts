import { buildWeeklyAxisScores, type WeeklyAxisRow } from './weeklyBalanceRadar';

export type InsightDimension = {
  scope: 'daily' | 'weekly' | 'monthly';
  scopeLabel: string;
  score: number;
  caption: string;
};

export type InsightBullet = {
  kind: 'strength' | 'weakness';
  title: string;
  detail: string;
};

export type HistoryInsightsReport = {
  hasData: boolean;
  overallScore: number;
  overallTitle: string;
  overallCaption: string;
  dimensions: InsightDimension[];
  strengths: InsightBullet[];
  weaknesses: InsightBullet[];
  nextStep: string;
};

function pct(rate: number): number {
  return Math.round(Math.max(0, Math.min(1, rate)) * 100);
}

export function buildHistoryInsights(input: {
  todayCompletionRate: number;
  todayCompletedCount: number;
  sameWeekdayAverageScore: number;
  weeklyBalanceScore: number;
  weeklyBalanceRows: WeeklyAxisRow[];
  monthlyRate: number;
  previousMonthlyRate: number;
  activeDaysInMonth: number;
  streak: number;
  weekCompletionDelta: number;
}): HistoryInsightsReport {
  const dailyScore = pct(input.todayCompletionRate);
  const weeklyScore = Math.max(0, Math.min(100, input.weeklyBalanceScore));
  const monthlyScore = pct(input.monthlyRate);

  const axisScores = buildWeeklyAxisScores(input.weeklyBalanceRows);
  const sortedAxis = [...axisScores].sort((a, b) => b.percent - a.percent);
  const strongAxis = sortedAxis[0];
  const weakAxis = sortedAxis[sortedAxis.length - 1];

  const weekdayDelta = dailyScore - input.sameWeekdayAverageScore;
  const monthRateDelta = pct(input.monthlyRate) - pct(input.previousMonthlyRate);

  const hasData =
    input.todayCompletedCount > 0 ||
    input.weeklyBalanceRows.some((r) => r.value > 0) ||
    input.activeDaysInMonth > 0;

  const dimensions: InsightDimension[] = [
    {
      scope: 'daily',
      scopeLabel: '데일리',
      score: dailyScore,
      caption:
        input.todayCompletedCount <= 0
          ? '오늘 완료 기록 없음'
          : weekdayDelta >= 5
            ? `동일 요일 평균보다 +${weekdayDelta}%p`
            : weekdayDelta <= -5
              ? `동일 요일 평균보다 ${weekdayDelta}%p`
              : '동일 요일 평균과 비슷',
    },
    {
      scope: 'weekly',
      scopeLabel: '위클리',
      score: weeklyScore,
      caption:
        strongAxis && strongAxis.percent > 0
          ? `${strongAxis.label} 영역이 가장 두터움`
          : '이번 주간 완료가 아직 적음',
    },
    {
      scope: 'monthly',
      scopeLabel: '먼슬리',
      score: monthlyScore,
      caption:
        monthRateDelta >= 8
          ? `전 기간 대비 +${monthRateDelta}%p`
          : monthRateDelta <= -8
            ? `전 기간 대비 ${monthRateDelta}%p`
            : `활동일 ${input.activeDaysInMonth}일`,
    },
  ];

  const strengths: InsightBullet[] = [];
  const weaknesses: InsightBullet[] = [];

  if (input.streak >= 7) {
    strengths.push({
      kind: 'strength',
      title: '연속 기록이 안정적이에요',
      detail: `최근 ${input.streak}일 연속으로 완료 흐름을 이어가고 있어요.`,
    });
  } else if (input.streak >= 3) {
    strengths.push({
      kind: 'strength',
      title: '기록 습관이 자리 잡는 중',
      detail: `연속 ${input.streak}일 — 조금만 더 이어가면 페이스가 굳어져요.`,
    });
  }

  if (strongAxis && strongAxis.percent >= 45) {
    strengths.push({
      kind: 'strength',
      title: `${strongAxis.label} 영역이 강점`,
      detail: `위클리 밸런스에서 ${strongAxis.label} 완료 비중이 가장 높아요.`,
    });
  }

  if (input.weekCompletionDelta > 0) {
    strengths.push({
      kind: 'strength',
      title: '위클리 완료가 늘었어요',
      detail: `지난 주간보다 완료가 ${input.weekCompletionDelta}개 많아요.`,
    });
  }

  if (monthlyScore >= 70) {
    strengths.push({
      kind: 'strength',
      title: '먼슬리 달성률이 높아요',
      detail: `최근 30일 평균 완료율이 ${monthlyScore}%예요.`,
    });
  }

  if (weekdayDelta >= 8 && input.todayCompletedCount > 0) {
    strengths.push({
      kind: 'strength',
      title: '오늘 페이스가 평소보다 좋아요',
      detail: '같은 요일 평균보다 완료율이 높게 나왔어요.',
    });
  }

  if (input.todayCompletedCount <= 0) {
    weaknesses.push({
      kind: 'weakness',
      title: '데일리 기록이 비어 있어요',
      detail: '오늘은 완료 1개만 있어도 데일리 점수와 종합 평가가 살아나요.',
    });
  }

  if (weakAxis && weakAxis.percent === 0 && input.weeklyBalanceRows.some((r) => r.value > 0)) {
    weaknesses.push({
      kind: 'weakness',
      title: `${weakAxis.label} 영역이 비어 있어요`,
      detail: '위클리 밸런스에서 가장 오래 비어 있는 축이에요.',
    });
  } else if (weakAxis && strongAxis && weakAxis.key !== strongAxis.key && weakAxis.percent < 25) {
    weaknesses.push({
      kind: 'weakness',
      title: `${weakAxis.label} 비중이 낮아요`,
      detail: '다른 영역 대비 완료가 적어 균형이 한쪽으로 기울었어요.',
    });
  }

  if (input.weekCompletionDelta < 0) {
    weaknesses.push({
      kind: 'weakness',
      title: '위클리 완료가 줄었어요',
      detail: `지난 주간보다 ${Math.abs(input.weekCompletionDelta)}개 적어요.`,
    });
  }

  if (weeklyScore > 0 && weeklyScore < 45) {
    weaknesses.push({
      kind: 'weakness',
      title: '위클리 정렬도가 낮아요',
      detail: '여러 영역 중 일부만 몰려 있어요. 한 축씩 번갈아 채워 보세요.',
    });
  }

  if (monthRateDelta <= -10 && monthlyScore > 0) {
    weaknesses.push({
      kind: 'weakness',
      title: '먼슬리 완료율이 내려갔어요',
      detail: `이전 30일 대비 완료율이 ${Math.abs(monthRateDelta)}%p 낮아요.`,
    });
  }

  const trimmedStrengths = strengths.slice(0, 3);
  const trimmedWeaknesses = weaknesses.slice(0, 3);

  const dimensionScores = dimensions.map((d) => d.score).filter((s) => s > 0);
  const overallScore =
    dimensionScores.length > 0
      ? Math.round(dimensionScores.reduce((a, b) => a + b, 0) / dimensionScores.length)
      : 0;

  let overallTitle = '기록을 쌓는 중';
  let overallCaption = '데일리 · 위클리 · 먼슬리를 함께 보면 강점과 보완점이 보여요.';
  if (!hasData) {
    overallTitle = '아직 평가할 기록이 적어요';
    overallCaption = '플로우를 완료하면 종합 인사이트가 채워져요.';
  } else if (overallScore >= 80) {
    overallTitle = '전반적으로 잘하고 있어요';
    overallCaption = '세 기간 모두에서 안정적인 패턴이 보여요.';
  } else if (overallScore >= 55) {
    overallTitle = '균형을 맞추는 중이에요';
    overallCaption = '강점은 유지하고, 비어 있는 영역만 채우면 좋아요.';
  } else {
    overallTitle = '다시 페이스를 잡을 시점';
    overallCaption = '작은 완료부터 데일리 → 위클리 순으로 쌓아 보세요.';
  }

  const firstWeak = trimmedWeaknesses[0];
  const nextStep = !hasData
    ? '가장 부담 없는 플로우 1개를 오늘 완료해 보세요.'
    : firstWeak
      ? firstWeak.title.includes('비어')
        ? `${weakAxis?.label ?? '비어 있는'} 관련 플로우를 이번 주에 2회 넣어 보세요.`
        : '아쉬운 영역을 내일 첫 순서에 배치해 보세요.'
      : '지금 강점 영역을 유지하며 같은 페이스로 이어가면 돼요.';

  return {
    hasData,
    overallScore,
    overallTitle,
    overallCaption,
    dimensions,
    strengths: trimmedStrengths,
    weaknesses: trimmedWeaknesses,
    nextStep,
  };
}
