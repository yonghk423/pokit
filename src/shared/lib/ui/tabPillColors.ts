import { RetroFlatColors } from '@shared/config/retroFlat';

/** 하단 탭·프리셋·저장 등 공통 pill 톤 (라이트 / 다크) */
export function tabPillColors(isDark: boolean) {
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    activeBg: c.bgMint,
    activeBorder: c.border,
    activeIcon: c.tertiary,
    inactiveBg: c.surface,
    inactiveBorder: c.border,
    inactiveIcon: c.textMuted,
  };
}
