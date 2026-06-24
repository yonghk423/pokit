function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace('#', '');
  if (normalized.length === 3) {
    const r = parseInt(normalized[0] + normalized[0], 16);
    const g = parseInt(normalized[1] + normalized[1], 16);
    const b = parseInt(normalized[2] + normalized[2], 16);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { r, g, b };
  }
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** 선명한 hex를 흰색과 블렌드해 차트·기록 UI용 파스텔 톤으로 만든다. */
export function toPastelColor(hex: string, whiteMix = 0.5): string {
  const rgb = parseHex(hex);
  if (!rgb) return hex;

  const mix = (channel: number) => Math.round(channel + (255 - channel) * whiteMix);
  return rgbToHex(mix(rgb.r), mix(rgb.g), mix(rgb.b));
}
