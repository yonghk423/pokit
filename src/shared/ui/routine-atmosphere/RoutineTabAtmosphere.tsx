import { memo } from 'react';

import type { RoutineAtmosphereVariant } from './routineAtmosphereAssets';

type Props = {
  variant: RoutineAtmosphereVariant;
  isDark?: boolean;
};

/**
 * 탭 뒤쪽 시티팝 콜라주.
 * 탭 전환 버벅임 확인용으로 이미지 렌더를 임시 비활성화.
 */
function RoutineTabAtmosphereBase(_props: Props) {
  return null;
}

export const RoutineTabAtmosphere = memo(RoutineTabAtmosphereBase);
