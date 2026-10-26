/** Shared timing for spreading cards into an overview and gathering them again. */
export const DECK_OVERVIEW_MOTION = {
  openDuration: 580,
  closeDuration: 420,
  bezier: [0.22, 0.61, 0.36, 1] as const,
  maxDelay: 0.12,
  delayPerCard: 0.025,
};
