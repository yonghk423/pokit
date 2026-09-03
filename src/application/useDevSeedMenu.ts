import { useEffect } from 'react';
import { Alert, DevSettings } from 'react-native';

import { getAppLocale } from '@shared/lib/i18n';
import type { HistorySeedProfile } from '@shared/lib/storage/seedHistoryData';

import {
  formatDevMockSeedAlertMessage,
  formatDevMockSeedProfileAlertMessage,
  runDevMockClearWithStoreSync,
  runDevMockSeedProfileWithStoreSync,
  runScreenshotDemoSeedWithStoreSync,
} from './devMockSeedRunner';

const HISTORY_SEED_MENU_ITEMS: ReadonlyArray<{ profile: HistorySeedProfile; label: string; hint: string }> = [
  {
    profile: 'mixed',
    label: '[Seed] 목업 — 혼합',
    hint: '고·중·저·빈 날이 섞여 있어요. 달력을 돌리며 다양한 UI를 볼 수 있어요.',
  },
  {
    profile: 'low',
    label: '[Seed] 목업 — 저달성',
    hint: '최근 2주가 저조해요. 오늘·이번 주·이번 달 달성률이 낮은 UI를 확인하세요.',
  },
  {
    profile: 'strong',
    label: '[Seed] 목업 — 고달성',
    hint: '목표를 잘 세운 경우예요. 기존 고달성 데모와 같아요.',
  },
];

/**
 * __DEV__ 전용: React Native Dev Menu에 목업 추가·제거 버튼 등록.
 * 스크린샷/호라이즌 문구는 현재 앱 로케일(ko/en/ja)에 맞춰 채워진다.
 */
export function useDevSeedMenu(): void {
  useEffect(() => {
    if (!__DEV__) return;

    DevSettings.addMenuItem('[Seed] 스크린샷 데모 (locale)', () => {
      void (async () => {
        const locale = getAppLocale();
        const result = await runScreenshotDemoSeedWithStoreSync();
        Alert.alert(
          'Seed 완료',
          `${formatDevMockSeedAlertMessage(result)}\n\n문구 로케일: ${locale}\n담기·시간대·타임라인·메모·투두·서재·노트·통계가 채워졌어요.\n히스토리 주간이 오늘만 보이면 ◀ 로 지난주를 열어 보세요.`,
        );
      })();
    });

    for (const item of HISTORY_SEED_MENU_ITEMS) {
      DevSettings.addMenuItem(item.label, () => {
        void (async () => {
          const result = await runDevMockSeedProfileWithStoreSync(item.profile);
          Alert.alert('Seed 완료', `${formatDevMockSeedProfileAlertMessage(item.profile, result)}\n\n${item.hint}`);
        })();
      });
    }

    DevSettings.addMenuItem('[Clear] 목업 데이터 전체', () => {
      void (async () => {
        await runDevMockClearWithStoreSync();
        Alert.alert(
          'Clear 완료',
          '목업 데이터를 모두 제거했어요.\n통계·스크린샷 데모(루틴·투두·도서·노트)가 비어 있어야 정상이에요.',
        );
      })();
    });
  }, []);
}
