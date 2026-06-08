import type { FixedFlowSet, FixedFlowSetsState } from './fixedFlowSetsStorage';

function items(categoryKeys: string[]) {
  return categoryKeys.map((categoryKey) => ({ categoryKey, enabled: true }));
}

/** 저장소가 비어 있을 때 넣을 기본 나만의 루틴 세트 */
export function createDefaultFixedFlowSetsState(): FixedFlowSetsState {
  const sets: FixedFlowSet[] = [
    {
      id: 'set_daily',
      name: '데일리',
      items: items(['water', 'stretching', 'reading', 'planning']),
    },
    {
      id: 'set_weekend',
      name: '주말',
      items: items(['meditation', 'reading', 'journal', 'writing']),
    },
    {
      id: 'set_weekday_am',
      name: '출근 준비',
      items: items(['water', 'planning', 'deepwork']),
    },
  ];
  return {
    activeSetIds: [],
    sets,
  };
}
