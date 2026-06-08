import { SYSTEM_CATALOG_GROUP_LABEL_KO, isSystemCatalogGroupKey } from '@entities/day-plan';
import { listCustomCatalogGroups, listCustomFlowCatalogEntries } from '@shared/lib/storage';

export type WeeklyAxisRow = {
  key: string;
  label: string;
  value: number;
};

export type WeeklyAxisScore = WeeklyAxisRow & {
  percent: number;
};

// ──────────────────────────────────────────────────────────────────────────
// 카탈로그 그룹 기반 집계
// ──────────────────────────────────────────────────────────────────────────

const HEALTH_KEYS = new Set([
  'water', 'medicine', 'vitamins', 'fasting', 'stretching', 'straightenBack', 'neckPosture',
  'posture', 'meditation', 'workout', 'walking', 'yoga', 'sleep', 'breathing', 'skincare', 'eyerest',
]);
const PRODUCTIVITY_KEYS = new Set([
  'reading', 'study', 'planning', 'writing', 'language', 'creative', 'deepwork',
  'journal', 'pomodoro', 'review', 'news', 'organize', 'podcast', 'inbox', 'work', 'coding',
]);

/**
 * categoryKey → 소속 그룹 키를 반환.
 * customFlow 항목은 저장된 groupKey로, 표준 항목은 시스템 그룹 매핑으로 결정.
 */
function resolveCategoryGroup(categoryKey: string): string {
  if (categoryKey.startsWith('customFlow:')) {
    const entries = listCustomFlowCatalogEntries();
    const entry = entries.find((e) => e.id === categoryKey);
    return entry?.groupKey ?? 'productivity';
  }
  if (HEALTH_KEYS.has(categoryKey)) return 'health';
  return 'productivity';
}

/**
 * 주간 카테고리 완료 맵(categoryKey→count)을 카탈로그 그룹별로 집계.
 * 0회 그룹도 포함(시스템 그룹은 항상 반환, 사용자 그룹은 활동 있을 때만).
 */
export function buildWeeklyGroupRows(weeklyCategoryCompletions: Record<string, number>): WeeklyAxisRow[] {
  const groupTotals = new Map<string, number>();
  groupTotals.set('health', 0);
  groupTotals.set('productivity', 0);

  const customGroups = listCustomCatalogGroups();
  for (const g of customGroups) {
    groupTotals.set(g.key, 0);
  }

  for (const [categoryKey, count] of Object.entries(weeklyCategoryCompletions)) {
    if (count <= 0) continue;
    const groupKey = resolveCategoryGroup(categoryKey);
    groupTotals.set(groupKey, (groupTotals.get(groupKey) ?? 0) + count);
  }

  const labelMap = new Map<string, string>();
  labelMap.set('health', SYSTEM_CATALOG_GROUP_LABEL_KO.health);
  labelMap.set('productivity', SYSTEM_CATALOG_GROUP_LABEL_KO.productivity);
  for (const g of customGroups) {
    labelMap.set(g.key, g.label);
  }

  const rows: WeeklyAxisRow[] = [];
  for (const [key, value] of groupTotals) {
    const label = labelMap.get(key) ?? key;
    rows.push({ key, label, value });
  }

  return rows.filter((r) => r.value > 0 || isSystemCatalogGroupKey(r.key));
}

// ──────────────────────────────────────────────────────────────────────────
// 점수 계산 (도넛·인사이트 공용)
// ──────────────────────────────────────────────────────────────────────────

/** 각 축의 상대 비율 0~100 계산 (최대값 대비) */
export function buildWeeklyAxisScores(rows: WeeklyAxisRow[]): WeeklyAxisScore[] {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return rows.map((row) => {
    const raw = Math.round((row.value / max) * 100);
    const percent = row.value > 0 ? Math.max(18, raw) : 0;
    return { ...row, percent };
  });
}

/** 밸런스 점수: 그룹별 완료량이 고를수록 높음 (0~100) */
export function computeBalanceScore(rows: WeeklyAxisRow[]): number {
  const total = rows.reduce((sum, row) => sum + row.value, 0);
  if (total <= 0) return 0;
  const activeRows = rows.filter((r) => r.value > 0);
  if (activeRows.length <= 1) return activeRows.length === 1 ? 20 : 0;
  const mean = total / activeRows.length;
  const variance = activeRows.reduce((sum, r) => sum + (r.value - mean) ** 2, 0) / activeRows.length;
  const normalized = Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / Math.max(mean + 1, 1)));
  return Math.round(normalized * 100);
}

// ──────────────────────────────────────────────────────────────────────────
// 에디토리얼 인사이트 (도넛용 — 강한 축 / 약한 축)
// ──────────────────────────────────────────────────────────────────────────

export function buildWeeklyEditorialInsight(
  scores: WeeklyAxisScore[],
  streak: number,
): {
  title: string;
  body: string;
  recommendPriority: boolean;
} {
  if (scores.every((s) => s.percent === 0)) {
    return {
      title: '이번 주 기록을 시작해 보세요.',
      body: '플로우를 하나만 완료해도 주간 밸런스 차트가 채워지기 시작해요.',
      recommendPriority: false,
    };
  }
  const sorted = [...scores].sort((a, b) => a.percent - b.percent);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  const title =
    high && high.percent >= 70
      ? `${high.label} 영역에서 균형이 잘 잡혔어요.`
      : '공백은 다음 집중 방향을 정하는 시간이에요.';
  const body = low
    ? `이번 주 ${low.label} 영역이 상대적으로 비어 있어요. 다음 우선순위에 ${low.label} 관련 플로우를 하나 넣어 보세요. 연속 ${streak}일 기록 중이에요.`
    : `이번 주 완료 패턴이 고르게 분포되어 있어요. 연속 ${streak}일 기록을 이어가면 정렬도가 더 안정돼요.`;
  return {
    title,
    body,
    recommendPriority: Boolean(low && low.percent < 45),
  };
}

export function getIsoWeekLabel(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
  return `${week}주차`;
}

// ──────────────────────────────────────────────────────────────────────────
// 레거시 레이더 유틸 (현재 사용 안 하지만 InsightsHistoryView 빌드 호환)
// ──────────────────────────────────────────────────────────────────────────

export function buildRadarPolygonPoints(scores: WeeklyAxisScore[], size = 100, maxRadius = 40): string {
  const cx = size / 2;
  const cy = size / 2;
  const n = scores.length;
  const points: string[] = [];
  for (let i = 0; i < n; i += 1) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (scores[i]?.percent ?? 0) / 100;
    const x = cx + maxRadius * r * Math.cos(angle);
    const y = cy + maxRadius * r * Math.sin(angle);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return points.join(' ');
}

export function buildRadarAxisLines(size = 100, maxRadius = 40): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const cx = size / 2;
  const cy = size / 2;
  const n = 5;
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < n; i += 1) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    lines.push({
      x1: cx,
      y1: cy,
      x2: cx + maxRadius * Math.cos(angle),
      y2: cy + maxRadius * Math.sin(angle),
    });
  }
  return lines;
}

export type RadarLabelAnchor = {
  key: string;
  label: string;
  percent: number;
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
};

export function buildRadarLabelAnchors(scores: WeeklyAxisScore[], size = 100, labelRadius = 48): RadarLabelAnchor[] {
  const cx = size / 2;
  const cy = size / 2;
  const n = scores.length;
  return scores.map((row, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const x = cx + labelRadius * Math.cos(angle);
    const y = cy + labelRadius * Math.sin(angle);
    let anchor: 'start' | 'middle' | 'end' = 'middle';
    if (x > cx + 5) anchor = 'start';
    else if (x < cx - 5) anchor = 'end';
    return { key: row.key, label: row.label, percent: row.percent, x, y, anchor };
  });
}
