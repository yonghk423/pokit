import { AppAlert as Alert } from '@shared/lib/app-alert';
import { useEffect, useRef } from 'react';
import { DevSettings } from 'react-native';

import {
  clearConceptMock,
  seedConceptMock,
  type ConceptHistoryProfile,
  type ConceptMockSeedResult,
} from './devConceptMockSeed';

const PROFILE_MENU: ReadonlyArray<{ profile: ConceptHistoryProfile; label: string; hint: string }> = [
  {
    profile: 'mixed',
    label: '[Seed] 오늘 컨셉 — 혼합',
    hint: '만들 수 있는 루틴 카드, 만화 일기, 오늘·다가오는 날짜, 들쭉날쭉한 달성 기록이에요.',
  },
  {
    profile: 'low',
    label: '[Seed] 오늘 컨셉 — 저달성',
    hint: '같은 오늘 화면이고, 최근 2주 달성은 낮게 들어가 있어요.',
  },
  {
    profile: 'strong',
    label: '[Seed] 오늘 컨셉 — 고달성',
    hint: '같은 오늘 화면이고, 거의 매일 채운 달성 기록이에요.',
  },
];

function formatSeedAlert(result: ConceptMockSeedResult, hint: string): string {
  return `${hint}\n\n로케일 ${result.locale} · 루틴 ${result.routines}개 · 만화 ${result.scenes}장 · 달력 ${result.scheduledDates}일 · 통계 ${result.historyDays}일\n만화 일기는 일기 모드를 다시 열면 보여요.`;
}

/**
 * __DEV__ 전용. 현재 오늘 탭(루틴 카드·만화 일기·날짜 담기)과 통계에 맞는 목업.
 */
export function useDevSeedMenu(): void {
  const seedRef = useRef(seedConceptMock);
  seedRef.current = seedConceptMock;
  const clearRef = useRef(clearConceptMock);
  clearRef.current = clearConceptMock;

  useEffect(() => {
    if (!__DEV__) return;

    for (const item of PROFILE_MENU) {
      DevSettings.addMenuItem(item.label, () => {
        void (async () => {
          const result = await seedRef.current(item.profile);
          Alert.alert('Seed 완료', formatSeedAlert(result, item.hint));
        })();
      });
    }

    DevSettings.addMenuItem('[Clear] 목업 데이터', () => {
      void (async () => {
        await clearRef.current();
        Alert.alert('Clear 완료', '추가했던 오늘 루틴·만화 일기·날짜 담기·통계 목업을 지웠어요.');
      })();
    });
  }, []);
}
