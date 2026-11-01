export const HERO_CARD_CAPTION_HEIGHT = 120;

// The deck reports its measured card bounds; captions consume part of that height.
let cardSize: { width: number; height: number } | null = null;
export function rememberHeroGenerationCardSize(width: number, height: number) {
  if (width > 0 && height > 0) cardSize = { width, height };
}
export function getHeroGenerationAspectRatio(_memo: string): number {
  if (!cardSize) return 0.8;
  const captionHeight = HERO_CARD_CAPTION_HEIGHT;
  return Math.max(0.25, Math.min(4, cardSize.width / Math.max(1, cardSize.height - captionHeight)));
}
