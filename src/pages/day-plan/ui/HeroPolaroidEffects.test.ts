import { polaroidPixelScript, adjustmentKeys, hasProPolaroidEffects } from './HeroPolaroidEffects';
const adjustPolaroidPixels = new Function(`return (${polaroidPixelScript})`)();
const pixel = () => new Uint8ClampedArray([80, 120, 180, 255, 220, 200, 170, 128]);
it('preserves original RGBA exactly at neutral settings', () => {
  expect(adjustPolaroidPixels(pixel(), {})).toEqual(pixel());
});
it.each(adjustmentKeys)('%s changes pixels and requires Pro', key => {
  const effects = { [key]: 60 };
  expect(adjustPolaroidPixels(pixel(), effects)).not.toEqual(pixel());
  expect(hasProPolaroidEffects(effects)).toBe(true);
});
it('preserves alpha and produces identical grain for preview and export', () => {
  const a = adjustPolaroidPixels(pixel(), { grain: 100, brightness: 40 });
  expect(a).toEqual(adjustPolaroidPixels(pixel(), { grain: 100, brightness: 40 }));
  expect([a[3], a[7]]).toEqual([255, 128]);
});
it('desaturates to monochrome and adjusts exposure in both directions', () => {
  const gray = adjustPolaroidPixels(pixel(), { saturation: -100 });
  expect(gray[0]).toBe(gray[1]); expect(gray[1]).toBe(gray[2]);
  expect(adjustPolaroidPixels(pixel(), { brightness: 50 })[0]).toBeGreaterThan(80);
  expect(adjustPolaroidPixels(pixel(), { brightness: -50 })[0]).toBeLessThan(80);
});
it('runs standalone when serialized into the canvas runtime', () => {
  const serialized = new Function(`return (${adjustPolaroidPixels.toString()})`)();
  expect(serialized(pixel(), { film: 'warm', shadows: 40 })).toEqual(adjustPolaroidPixels(pixel(), { film: 'warm', shadows: 40 }));
});

it('renders monochrome film without color even with saturation and temperature adjustments', () => {
  const result = adjustPolaroidPixels(pixel(), { film: 'monochrome', saturation: 100, temperature: 50 });
  for (let i = 0; i < result.length; i += 4) {
    expect(result[i]).toBe(result[i + 1]);
    expect(result[i + 1]).toBe(result[i + 2]);
  }
  expect(result[7]).toBe(128);
  expect(hasProPolaroidEffects({ film: 'monochrome' })).toBe(true);
});

it.each(['cool', 'sepia', 'pastel', 'vivid', 'rose', 'cinema'])('%s film changes color while preserving alpha and deterministic output', film => {
  const result = adjustPolaroidPixels(pixel(), { film });
  expect(result).not.toEqual(pixel());
  expect(result).toEqual(adjustPolaroidPixels(pixel(), { film }));
  expect([result[3], result[7]]).toEqual([255, 128]);
});
