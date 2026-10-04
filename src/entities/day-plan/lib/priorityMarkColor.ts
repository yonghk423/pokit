/**
 * 루틴 「중요도 표시」— 형광펜 대표색 마커 (파스텔 포스트잇과 구분).
 * id 는 저장 호환용(mint/peach/lavender)이며, 표시색은 초록·주황·파랑 형광에 가깝다.
 * 저장 키 `priorityCategoryImportance` — 루틴 목록·오늘 담기에서 같은 마커를 공유한다.
 */

export const PRIORITY_MARK_COLOR_IDS = [
  'yellow',
  'softYellow',
  'amber',
  'gold',
  'mint',
  'softGreen',
  'lime',
  'chartreuse',
  'emerald',
  'turquoise',
  'seafoam',
  'cyan',
  'lavender',
  'softBlue',
  'sky',
  'electric',
  'violet',
  'purple',
  'indigo',
  'grape',
  'pink',
  'softPink',
  'hotPink',
  'magenta',
  'rose',
  'peach',
  'tangerine',
  'coral',
  'vermilion',
  'red',
  'brick',
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
    id: 'amber',
    face: '#FFC400',
    faceDark: '#8A6A00',
    highlight: 'rgba(255, 196, 0, 0.9)',
    highlightDark: 'rgba(255, 196, 0, 0.52)',
  },
  {
    id: 'gold',
    face: '#FFB300',
    faceDark: '#8A6200',
    highlight: 'rgba(255, 179, 0, 0.9)',
    highlightDark: 'rgba(255, 179, 0, 0.52)',
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
    id: 'chartreuse',
    face: '#D4FF00',
    faceDark: '#6A7A00',
    highlight: 'rgba(212, 255, 0, 0.9)',
    highlightDark: 'rgba(212, 255, 0, 0.5)',
  },
  {
    id: 'emerald',
    face: '#00E676',
    faceDark: '#007A3E',
    highlight: 'rgba(0, 230, 118, 0.88)',
    highlightDark: 'rgba(0, 230, 118, 0.48)',
  },
  {
    id: 'turquoise',
    face: '#00E0C8',
    faceDark: '#008A7A',
    highlight: 'rgba(0, 224, 200, 0.85)',
    highlightDark: 'rgba(0, 224, 200, 0.48)',
  },
  {
    id: 'seafoam',
    face: '#64FFDA',
    faceDark: '#2A8A72',
    highlight: 'rgba(100, 255, 218, 0.88)',
    highlightDark: 'rgba(100, 255, 218, 0.48)',
  },
  {
    id: 'cyan',
    face: '#00E5FF',
    faceDark: '#007A8A',
    highlight: 'rgba(0, 229, 255, 0.85)',
    highlightDark: 'rgba(0, 229, 255, 0.48)',
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
    id: 'sky',
    face: '#40C4FF',
    faceDark: '#186A8A',
    highlight: 'rgba(64, 196, 255, 0.88)',
    highlightDark: 'rgba(64, 196, 255, 0.48)',
  },
  {
    id: 'electric',
    face: '#2979FF',
    faceDark: '#14408A',
    highlight: 'rgba(41, 121, 255, 0.85)',
    highlightDark: 'rgba(41, 121, 255, 0.48)',
  },
  {
    id: 'violet',
    face: '#B47CFF',
    faceDark: '#5A388A',
    highlight: 'rgba(180, 124, 255, 0.85)',
    highlightDark: 'rgba(180, 124, 255, 0.48)',
  },
  {
    id: 'purple',
    face: '#9C27FF',
    faceDark: '#4A148A',
    highlight: 'rgba(156, 39, 255, 0.85)',
    highlightDark: 'rgba(156, 39, 255, 0.48)',
  },
  {
    id: 'indigo',
    face: '#7C4DFF',
    faceDark: '#3A208A',
    highlight: 'rgba(124, 77, 255, 0.85)',
    highlightDark: 'rgba(124, 77, 255, 0.48)',
  },
  {
    id: 'grape',
    face: '#E040FB',
    faceDark: '#7A208A',
    highlight: 'rgba(224, 64, 251, 0.85)',
    highlightDark: 'rgba(224, 64, 251, 0.48)',
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
    id: 'hotPink',
    face: '#FF1493',
    faceDark: '#8A0C50',
    highlight: 'rgba(255, 20, 147, 0.85)',
    highlightDark: 'rgba(255, 20, 147, 0.48)',
  },
  {
    id: 'magenta',
    face: '#FF4DFF',
    faceDark: '#8A288A',
    highlight: 'rgba(255, 77, 255, 0.82)',
    highlightDark: 'rgba(255, 77, 255, 0.48)',
  },
  {
    id: 'rose',
    face: '#FF6F91',
    faceDark: '#8A3048',
    highlight: 'rgba(255, 111, 145, 0.88)',
    highlightDark: 'rgba(255, 111, 145, 0.5)',
  },
  {
    id: 'peach',
    face: '#FF8A00',
    faceDark: '#8A4A00',
    highlight: 'rgba(255, 138, 0, 0.88)',
    highlightDark: 'rgba(255, 138, 0, 0.5)',
  },
  {
    id: 'tangerine',
    face: '#FF6D00',
    faceDark: '#8A3A00',
    highlight: 'rgba(255, 109, 0, 0.88)',
    highlightDark: 'rgba(255, 109, 0, 0.5)',
  },
  {
    id: 'coral',
    face: '#FF6B4A',
    faceDark: '#8A3828',
    highlight: 'rgba(255, 107, 74, 0.88)',
    highlightDark: 'rgba(255, 107, 74, 0.5)',
  },
  {
    id: 'vermilion',
    face: '#FF3D00',
    faceDark: '#8A2200',
    highlight: 'rgba(255, 61, 0, 0.88)',
    highlightDark: 'rgba(255, 61, 0, 0.5)',
  },
  {
    id: 'red',
    face: '#FF3B30',
    faceDark: '#8A1E18',
    highlight: 'rgba(255, 59, 48, 0.85)',
    highlightDark: 'rgba(255, 59, 48, 0.48)',
  },
  {
    id: 'brick',
    face: '#E53935',
    faceDark: '#7A1C1A',
    highlight: 'rgba(229, 57, 53, 0.88)',
    highlightDark: 'rgba(229, 57, 53, 0.5)',
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
