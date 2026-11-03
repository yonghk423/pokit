/** Equivalent positions in the middle copy make the three-copy rail seamless. */
export function wrapHeroRailOffset(offset: number, span: number): number {
  'worklet';
  if (span <= 0) return 0;
  return span + ((offset - span) % span + span) % span;
}
