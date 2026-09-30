/**
 * 루틴 「중요도 표시」— 형광펜 대표색 마커 (파스텔 포스트잇과 구분).
 * id 는 저장 호환용(mint/peach/lavender)이며, 표시색은 초록·주황·파랑 형광에 가깝다.
 * 저장 키 `priorityCategoryImportance` — 루틴 목록·오늘 담기에서 같은 마커를 공유한다.
 */

export const PRIORITY_MARK_COLOR_IDS = [
  'yellow',
  'softYellow',
  'mint',
  'softGreen',
  'lime',
  'turquoise',
  'lavender',
  'softBlue',
  'violet',
  'pink',
  'softPink',
  'magenta',
  'peach',
  'coral',
  'red',
] as const;

export type PriorityMarkColorId = (typeof PRIORITY_MARK_COLOR_IDS)[number];

/** 순환: 없음 → … → 없음 */
export const PRIORITY_MARK_COLOR_CYCLE: readonly (PriorityMarkColorId | null)[] = [
  null,
  ...PRIORITY_MARK_COLOR_IDS,
] as const;

type MarkPreset = {
  id: PriorityMarkColorId;
  /** 칩·스와치 면 */
  face: string;
  faceDark: string;
  /** 타이틀 형광펜 — 스와치와 같은 채도, 높은 불투명도 */
  highlight: string;
  highlightDark: string;
};

export const PRIORITY_MARK_COLOR_PRESETS: readonly MarkPreset[] = [
  {
    id: 'yellow',
    face: '#FFE600',
    faceDark: '#A89400',
    highlight: 'rgba(255, 230, 0, 0.9)',
    highlightDark: 'rgba(255, 230, 0, 0.55)',
  },
  {
    id: 'softYellow',
    face: '#FFE99A',
    faceDark: '#8A7828',
    highlight: 'rgba(255, 233, 154, 0.92)',
    highlightDark: 'rgba(255, 233, 154, 0.5)',
  },
  {
    id: 'mint',
    face: '#7CFF00',
    faceDark: '#3A7A00',
    highlight: 'rgba(124, 255, 0, 0.88)',
    highlightDark: 'rgba(124, 255, 0, 0.5)',
  },
  {
    id: 'softGreen',
    face: '#C6FF7A',
    faceDark: '#4A6B28',
    highlight: 'rgba(198, 255, 122, 0.9)',
    highlightDark: 'rgba(198, 255, 122, 0.5)',
  },
  {
    id: 'lime',
    face: '#B8F000',
    faceDark: '#5A7000',
    highlight: 'rgba(184, 240, 0, 0.9)',
    highlightDark: 'rgba(184, 240, 0, 0.5)',
  },
  {
    id: 'turquoise',
    face: '#00E0C8',
    faceDark: '#008A7A',
    highlight: 'rgba(0, 224, 200, 0.85)',
    highlightDark: 'rgba(0, 224, 200, 0.48)',
  },
  {
    id: 'lavender',
    face: '#3DB8FF',
    faceDark: '#185A8A',
    highlight: 'rgba(61, 184, 255, 0.85)',
    highlightDark: 'rgba(61, 184, 255, 0.48)',
  },
  {
    id: 'softBlue',
    face: '#9AD4FF',
    faceDark: '#2A5A8A',
    highlight: 'rgba(154, 212, 255, 0.9)',
    highlightDark: 'rgba(154, 212, 255, 0.5)',
  },
  {
    id: 'violet',
    face: '#B47CFF',
    faceDark: '#5A388A',
    highlight: 'rgba(180, 124, 255, 0.85)',
    highlightDark: 'rgba(180, 124, 255, 0.48)',
  },
  {
    id: 'pink',
    face: '#FF2D8A',
    faceDark: '#8A1848',
    highlight: 'rgba(255, 45, 138, 0.82)',
    highlightDark: 'rgba(255, 45, 138, 0.48)',
  },
  {
    id: 'softPink',
    face: '#FFB0D4',
    faceDark: '#7A3A58',
    highlight: 'rgba(255, 176, 212, 0.9)',
    highlightDark: 'rgba(255, 176, 212, 0.5)',
  },
  {
    id: 'magenta',
    face: '#FF4DFF',
    faceDark: '#8A288A',
    highlight: 'rgba(255, 77, 255, 0.82)',
    highlightDark: 'rgba(255, 77, 255, 0.48)',
  },
  {
    id: 'peach',
    face: '#FF8A00',
    faceDark: '#8A4A00',
    highlight: 'rgba(255, 138, 0, 0.88)',
    highlightDark: 'rgba(255, 138, 0, 0.5)',
  },
  {
    id: 'coral',
    face: '#FF6B4A',
    faceDark: '#8A3828',
    highlight: 'rgba(255, 107, 74, 0.88)',
    highlightDark: 'rgba(255, 107, 74, 0.5)',
  },
  {
    id: 'red',
    face: '#FF3B30',
    faceDark: '#8A1E18',
    highlight: 'rgba(255, 59, 48, 0.85)',
    highlightDark: 'rgba(255, 59, 48, 0.48)',
  },
] as const;

export function isPriorityMarkColorId(value: unknown): value is PriorityMarkColorId {
  return (
    typeof value === 'string' &&
    (PRIORITY_MARK_COLOR_IDS as readonly string[]).includes(value)
  );
}

/** 레거시 high/medium/low → 색 (medium = 표시 없음) */
export function migrateLegacyImportanceToMarkColor(
  raw: unknown,
): PriorityMarkColorId | null {
  if (isPriorityMarkColorId(raw)) return raw;
  if (raw === 'high') return 'pink';
  if (raw === 'low') return 'yellow';
  return null;
}

export function normalizePriorityMarkColor(raw: unknown): PriorityMarkColorId | null {
  return migrateLegacyImportanceToMarkColor(raw);
}

export function cyclePriorityMarkColor(
  current: PriorityMarkColorId | null,
): PriorityMarkColorId | null {
  const idx = PRIORITY_MARK_COLOR_CYCLE.findIndex((id) => id === current);
  const nextIdx = idx < 0 ? 1 : (idx + 1) % PRIORITY_MARK_COLOR_CYCLE.length;
  return PRIORITY_MARK_COLOR_CYCLE[nextIdx] ?? null;
}

export function resolveCategoryMarkColor(
  map: Readonly<Record<string, PriorityMarkColorId>>,
  categoryKey: string,
): PriorityMarkColorId | null {
  const key = categoryKey.trim();
  if (!key) return null;
  return map[key] ?? null;
}

export function getPriorityMarkPreset(
  id: PriorityMarkColorId | null | undefined,
): MarkPreset | null {
  if (!id) return null;
  return PRIORITY_MARK_COLOR_PRESETS.find((row) => row.id === id) ?? null;
}

export function priorityMarkTitleHighlight(
  id: PriorityMarkColorId | null | undefined,
  isDark: boolean,
): string | undefined {
  const preset = getPriorityMarkPreset(id);
  if (!preset) return undefined;
  return isDark ? preset.highlightDark : preset.highlight;
}

export function priorityMarkFaceColor(
  id: PriorityMarkColorId | null | undefined,
  isDark: boolean,
): string | undefined {
  const preset = getPriorityMarkPreset(id);
  if (!preset) return undefined;
  return isDark ? preset.faceDark : preset.face;
}
