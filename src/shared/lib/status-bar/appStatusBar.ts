/** 다크 모드: 상태 표시줄을 항상 라이트(화이트 아이콘)로 고정. 라이트 모드: 어두운 아이콘. */
export function resolveStatusBarStyle(isDark: boolean): 'light' | 'dark' {
  return isDark ? 'light' : 'dark';
}

/** @deprecated 선언형 AppStatusBar만 사용한다. 하위 호환용 no-op. */
export function syncAppStatusBar(_isDark: boolean) {}

/** @deprecated 선언형 AppStatusBar만 사용한다. 하위 호환용 no-op. */
export function resetAppStatusBarCache() {}
