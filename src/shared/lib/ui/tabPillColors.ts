/** 하단 탭·프리셋·저장 등 공통 pill 톤 (라이트 / 다크) */
export function tabPillColors(isDark: boolean) {
  if (isDark) {
    return {
      activeBg: '#3f3f46',
      activeBorder: '#fafafa',
      activeIcon: '#fafafa',
      inactiveBg: '#18181b',
      inactiveBorder: 'rgba(255, 255, 255, 0.14)',
      inactiveIcon: '#a1a1aa',
    };
  }
  return {
    activeBg: '#EDEDED',
    activeBorder: '#000000',
    activeIcon: '#000000',
    inactiveBg: '#FFFFFF',
    inactiveBorder: '#E0E0E0',
    inactiveIcon: '#666666',
  };
}
