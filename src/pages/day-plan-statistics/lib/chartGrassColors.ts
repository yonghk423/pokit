/** GitHub 잔디·히스토리 막대/추이 차트 공용 팔레트 */
export type ChartGrassPalette = {
  heatGrass: readonly [string, string, string, string];
  barTrack: string;
  barFill: string;
  lineStroke: string;
  areaTop: string;
};

export function getChartGrassPalette(isDark: boolean): ChartGrassPalette {
  const heatGrass = isDark
    ? (['#1b2a21', '#0e4429', '#006d32', '#26a641'] as const)
    : (['#ebedf0', '#9be9a8', '#40c463', '#216e39'] as const);

  return {
    heatGrass,
    barTrack: heatGrass[0],
    barFill: isDark ? heatGrass[3] : heatGrass[2],
    lineStroke: isDark ? heatGrass[3] : heatGrass[3],
    areaTop: isDark ? heatGrass[3] : heatGrass[2],
  };
}
