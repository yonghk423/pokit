import { useEffect } from 'react';
import { Alert, DevSettings } from 'react-native';

import {
  formatDevMockSeedAlertMessage,
  runDevMockClearWithStoreSync,
  runDevMockSeedWithStoreSync,
} from './devMockSeedRunner';

/**
 * __DEV__ 전용: React Native Dev Menu에 목업 추가·제거 버튼 등록.
 */
export function useDevSeedMenu(): void {
  useEffect(() => {
    if (!__DEV__) return;

    DevSettings.addMenuItem('[Seed] 목업 데이터 전체', () => {
      void (async () => {
        const result = await runDevMockSeedWithStoreSync();
        Alert.alert('Seed 완료', formatDevMockSeedAlertMessage(result));
      })();
    });

    DevSettings.addMenuItem('[Clear] 목업 데이터 전체', () => {
      void (async () => {
        await runDevMockClearWithStoreSync();
        Alert.alert('Clear 완료', '목업 데이터를 모두 제거했어요.\n통계 탭이 비어 있어야 정상이에요.');
      })();
    });
  }, []);
}
