export type HorizonGoalDetail = {
  /** 큰 타이틀 — 주·월 목표의 핵심 한 줄 */
  mainTitle: string;
  /** 작은 타이틀 — 보조 설명·부제 */
  subTitle: string;
  /** 상세 — 체크리스트·메모 등 */
  body: string;
};

export const EMPTY_HORIZON_GOAL: HorizonGoalDetail = {
  mainTitle: '',
  subTitle: '',
  body: '',
};

export function parseHorizonGoalStored(raw: unknown): HorizonGoalDetail {
  if (typeof raw === 'string') {
    return { ...EMPTY_HORIZON_GOAL, body: raw };
  }
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_HORIZON_GOAL };
  }
  const o = raw as Record<string, unknown>;
  return {
    mainTitle: typeof o.mainTitle === 'string' ? o.mainTitle : '',
    subTitle: typeof o.subTitle === 'string' ? o.subTitle : '',
    body: typeof o.body === 'string' ? o.body : '',
  };
}

export function horizonGoalHasContent(goal: HorizonGoalDetail): boolean {
  return Boolean(goal.mainTitle.trim() || goal.subTitle.trim() || goal.body.trim());
}

/** 진행률·검색용 전체 텍스트 */
export function horizonGoalToPlainText(goal: HorizonGoalDetail): string {
  return [goal.mainTitle, goal.subTitle, goal.body].filter((s) => s.trim().length > 0).join('\n');
}
