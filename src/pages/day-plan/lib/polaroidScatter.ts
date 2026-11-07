/** Stable positions: photographs keep their places when the overview rerenders. */
export function polaroidScatter(width: number, keys: readonly string[], heights: Record<string, number> = {}, kind: 'photos' | 'packets' = 'photos') {
  const packets = kind === 'packets';
  const patterns = packets ? [
    { x: 0.035, width: 0.275, y: 8, angle: -8 },
    { x: 0.36, width: 0.285, y: 16, angle: 6 },
    { x: 0.685, width: 0.28, y: 8, angle: -6 },
    { x: 0.035, width: 0.275, y: 12, angle: 7 },
    { x: 0.36, width: 0.285, y: 4, angle: -7 },
    { x: 0.685, width: 0.28, y: 14, angle: 8 },
  ] : [
    { x: -0.015, width: 0.195, y: 6, angle: -13 },
    { x: 0.16, width: 0.1875, y: 32, angle: 9 },
    { x: 0.43, width: 0.18375, y: 14, angle: 12 },
    { x: 0.70, width: 0.19875, y: 0, angle: -11 },
    { x: 0.06, width: 0.19875, y: 19, angle: -7 },
    { x: 0.28, width: 0.19125, y: 5, angle: 15 },
    { x: 0.55, width: 0.195, y: 26, angle: -10 },
    { x: 0.76, width: 0.1875, y: 10, angle: 8 },
  ];
  const frames = keys.map((key, index) => {
    const seed = Array.from(key).reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) | 0, 7) >>> 0;
    const pattern = patterns[index % patterns.length];
    const cardWidth = width * pattern.width;
    return {
      left: width * (pattern.x + ((seed % 7) - 3) * 0.004),
      top: (packets ? 16 : 32) + Math.floor(index / (packets ? 3 : 4)) * width * (packets ? 0.46 : 0.235) + pattern.y,
      width: cardWidth,
      height: heights[key] ?? (packets ? cardWidth * 1.45 : cardWidth * 4 / 3 + 45),
      rotation: pattern.angle + seed % 5 - 2,
      zIndex: index + 1,
    };
  });
  const height = frames.reduce((bottom, frame) => {
    const angle = Math.abs(frame.rotation) * Math.PI / 180;
    const rotatedHeight = frame.width * Math.sin(angle) + frame.height * Math.cos(angle);
    return Math.max(bottom, frame.top + frame.height / 2 + rotatedHeight / 2);
  }, 0) + 28;
  return { frames, height };
}
