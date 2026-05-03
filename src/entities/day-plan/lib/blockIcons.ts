import type { SymbolViewProps } from 'expo-symbols';

import type { DayPlanBlock } from '@entities/day-plan/model/types';

export function getBlockTimelineIcon(block: DayPlanBlock): SymbolViewProps['name'] {
  if (block.title.includes('취침')) return 'moon.stars.fill';
  if (block.title.includes('기상')) return 'sun.max.fill';
  if (block.category === '건강') return 'heart.fill';
  if (block.category === '딥워크') return 'bolt.fill';
  if (block.category === '생산성') return 'bag.fill';
  return 'clock.fill';
}
