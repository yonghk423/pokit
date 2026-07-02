export type InsightDimension = {
  scope: 'daily';
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
  streak: number;
  weekCompletionDelta: number;
}): HistoryInsightsReport {
  const dailyScore = pct(input.todayCompletionRate);
  const weekdayDelta = dailyScore - input.sameWeekdayAverageScore;

  const hasData = input.todayCompletedCount > 0 || input.streak > 0;

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

  if (input.weekCompletionDelta > 0) {
    strengths.push({
      kind: 'strength',
      title: '이번 주 완료가 늘었어요',
      detail: `지난 주보다 완료가 ${input.weekCompletionDelta}회 많아요.`,
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
      detail: '오늘은 완료 1회만 있어도 데일리 점수와 종합 평가가 살아나요.',
    });
  }

  if (input.weekCompletionDelta < 0) {
    weaknesses.push({
      kind: 'weakness',
      title: '이번 주 완료가 줄었어요',
      detail: `지난 주보다 ${Math.abs(input.weekCompletionDelta)}회 적어요.`,
    });
  }

  if (weekdayDelta <= -8 && input.todayCompletedCount > 0) {
    weaknesses.push({
      kind: 'weakness',
      title: '오늘 페이스가 평소보다 낮아요',
      detail: '같은 요일 평균보다 완료율이 낮게 나왔어요.',
    });
  }

  const trimmedStrengths = strengths.slice(0, 3);
  const trimmedWeaknesses = weaknesses.slice(0, 3);

  const overallScore = dailyScore;

  let overallTitle = '기록을 쌓는 중';
  let overallCaption = '데일리 완료 기록을 바탕으로 강점과 보완점을 정리해요.';
  if (!hasData) {
    overallTitle = '아직 평가할 기록이 적어요';
    overallCaption = '플로우를 완료하면 종합 인사이트가 채워져요.';
  } else if (overallScore >= 80) {
    overallTitle = '오늘 페이스가 좋아요';
    overallCaption = '완료 흐름이 안정적으로 이어지고 있어요.';
  } else if (overallScore >= 55) {
    overallTitle = '균형을 맞추는 중이에요';
    overallCaption = '지금 페이스를 유지하며 빈 구간만 채우면 좋아요.';
  } else {
    overallTitle = '다시 페이스를 잡을 시점';
    overallCaption = '작은 완료부터 하나씩 쌓아 보세요.';
  }

  const firstWeak = trimmedWeaknesses[0];
  const nextStep = !hasData
    ? '가장 부담 없는 플로우 1개를 오늘 완료해 보세요.'
    : firstWeak
      ? '아쉬운 영역을 내일 첫 순서에 배치해 보세요.'
      : '지금 페이스를 유지하며 같은 리듬으로 이어가면 돼요.';

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
