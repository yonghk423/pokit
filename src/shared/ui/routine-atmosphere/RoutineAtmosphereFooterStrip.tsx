import { memo } from 'react';

import type { RoutineAtmosphereVariant } from './routineAtmosphereAssets';

type Props = {
  variant: RoutineAtmosphereVariant;
  isDark?: boolean;
  /** 여백이 큰 화면(템플릿 등)에서 타일을 키워 빈 공간을 채움 */
  density?: 'default' | 'rich';
};

/**
 * 리스트 하단 스크랩북 스트립.
 * 탭 전환 버벅임 확인용으로 이미지 렌더를 임시 비활성화.
 */
function RoutineAtmosphereFooterStripBase(_props: Props) {
  return null;
}

export const RoutineAtmosphereFooterStrip = memo(RoutineAtmosphereFooterStripBase);
