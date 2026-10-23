import { AppAlert as Alert } from '@shared/lib/app-alert';
import { useEffect, useRef } from 'react';
import { DevSettings } from 'react-native';

import { clearConceptMock, seedConceptMock, type ConceptMockSeedResult } from './devConceptMockSeed';

const SEED_HINT =
  '책읽기 목록, 영양 챙기기, 체중 관리, 할 일, 푸쉬업, 노트, 빠른 메모, 만화 일기, 통계를 채워요.';

function formatSeedAlert(result: ConceptMockSeedResult): string {
  return `${SEED_HINT}\n\n로케일 ${result.locale} · 루틴 ${result.routines}개 · 읽는 중 ${result.readingTitles}권 · 만화 ${result.scenes}장 · 달력 ${result.scheduledDates}일 · 통계 ${result.historyDays}일`;
}

/**
 * __DEV__ 전용. 리뉴얼된 오늘 탭 카드·노트·책읽기·통계에 맞는 목업.
 */
export function useDevSeedMenu(): void {
  const seedRef = useRef(seedConceptMock);
  seedRef.current = seedConceptMock;
  const clearRef = useRef(clearConceptMock);
  clearRef.current = clearConceptMock;

  useEffect(() => {
    if (!__DEV__) return;

    DevSettings.addMenuItem('[Seed] 오늘 목업', () => {
      void (async () => {
        const result = await seedRef.current();
        Alert.alert('Seed 완료', formatSeedAlert(result));
      })();
    });

    DevSettings.addMenuItem('[Clear] 목업 데이터', () => {
      void (async () => {
        await clearRef.current();
        Alert.alert('Clear 완료', '목업으로 덮었던 책읽기·영양 챙기기·체중 관리·노트와 추가 루틴을 원래대로 되돌렸어요.');
      })();
    });
  }, []);
}
