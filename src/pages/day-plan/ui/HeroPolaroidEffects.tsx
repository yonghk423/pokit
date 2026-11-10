export type PolaroidFilm = 'original' | 'warm' | 'faded' | 'monochrome' | 'cool' | 'sepia' | 'pastel' | 'vivid' | 'rose' | 'cinema' | 'cream' | 'olive' | 'amber' | 'disposable' | 'bluehour' | 'noir';
export const POLAROID_FILMS: { value: PolaroidFilm; label: string }[] = [
  { value: 'original', label: '원본' }, { value: 'warm', label: '따뜻한 필름' },
  { value: 'faded', label: '빛바랜 기억' }, { value: 'monochrome', label: '흑백 감성' },
  { value: 'cool', label: '푸른 공기' }, { value: 'sepia', label: '오래된 사진' },
  { value: 'pastel', label: '파스텔' }, { value: 'vivid', label: '선명한 순간' },
  { value: 'rose', label: '로즈빛' }, { value: 'cinema', label: '시네마' },
  { value: 'cream', label: '크림톤' }, { value: 'olive', label: '올리브' },
  { value: 'amber', label: '앰버' }, { value: 'disposable', label: '일회용 필름' },
  { value: 'bluehour', label: '블루 아워' }, { value: 'noir', label: '강한 흑백' },
];
export const adjustmentKeys = ['brightness', 'contrast', 'saturation', 'highlights', 'shadows', 'temperature', 'fade', 'grain'] as const;
export type AdjustmentKey = typeof adjustmentKeys[number];
export type PolaroidEffects = { film?: PolaroidFilm } & Partial<Record<AdjustmentKey, number>>;
export const hasProPolaroidEffects = (value: PolaroidEffects) =>
  !!(value.film && value.film !== 'original') || adjustmentKeys.some(key => !!value[key]);

/** Pure, deterministic pixel transform. Also serialized into the local Canvas worker. */
export const polaroidPixelScript = `function adjustPolaroidPixels(data, effects) {
  const amount = (key) => Math.max(-1, Math.min(1, Number(effects[key] || 0) / 100));
  const warm = effects.film === 'warm', faded = effects.film === 'faded', noir = effects.film === 'noir', monochrome = effects.film === 'monochrome' || noir;
  const preset = ({ cool: [-0.3, 1.02, 0.94, 0.02, 0, 0], sepia: [0.4, 0.95, 0.35, 0.08, 0, 0], pastel: [0.06, 0.82, 0.78, 0.10, 0.08, 0], vivid: [0.04, 1.18, 1.25, 0, 0.03, 0], rose: [0.10, 0.96, 0.92, 0.04, 0.03, -0.025], cinema: [-0.16, 1.22, 0.78, 0.03, -0.06, 0],
    cream: [0.14, 0.83, 0.85, 0.06, 0.12, 0.006],
    olive: [0.04, 0.95, 0.72, 0.06, -0.02, 0.018],
    amber: [0.42, 1.08, 0.90, 0.03, 0.03, 0.006],
    disposable: [0.10, 1.15, 0.85, 0.06, 0.03, -0.008],
    bluehour: [-0.30, 0.90, 0.65, 0.07, -0.12, 0.008] })[effects.film] || [0, 1, 1, 0, 0, 0];
  const exposure = Math.pow(2, amount('brightness') + preset[4]);
  const contrast = Math.pow(2, amount('contrast')) * (noir ? 1.5 : monochrome ? 1.1 : preset[1]);
  const saturation = monochrome ? 0 : Math.max(0, 1 + amount('saturation') - (faded ? 0.2 : 0)) * preset[2];
  const temperature = amount('temperature') + (warm ? 0.25 : 0) + preset[0];
  const fade = Math.max(0, amount('fade')) * 0.35 + (faded ? 0.12 : noir ? 0 : monochrome ? 0.03 : preset[3]);
  const grain = Math.max(0, amount('grain')) * 0.15 + (effects.film === 'disposable' ? 0.065 : 0);
  const shadows = amount('shadows') * 0.5, highlights = amount('highlights') * 0.5;
  let seed = 123456789;
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const tone = shadows * (1 - luma) * (1 - luma) * (1 - luma) + highlights * luma * luma * luma;
    r = (r + tone) * exposure; g = (g + tone) * exposure; b = (b + tone) * exposure;
    r += temperature * 0.12; b -= temperature * 0.12; g += preset[5];
    // Split toning colors the darker values without washing out highlights.
    if (effects.film === 'olive') b -= 0.035 * (1 - luma);
    if (effects.film === 'amber') g += 0.015 * luma;
    if (effects.film === 'disposable') g += 0.025 * (1 - luma);
    if (effects.film === 'bluehour') { r -= 0.02 * (1 - luma); b += 0.035 * (1 - luma); }
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const noise = (seed / 4294967296 - 0.5) * grain;
    const finish = (v) => (((gray + (v - gray) * saturation - 0.5) * contrast + 0.5) * (1 - fade) + fade * 0.6 + noise) * 255;
    data[i] = finish(r); data[i + 1] = finish(g); data[i + 2] = finish(b);
  }
  return data;
}`;
