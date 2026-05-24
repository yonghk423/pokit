/** 분 단위를 한글 표기 (단식·휴식 등) */
export function formatDurationMinKo(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m === 0) return '0분';
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (r === 0) return `${h}시간`;
    return `${h}시간 ${r}분`;
  }
  return `${m}분`;
}
