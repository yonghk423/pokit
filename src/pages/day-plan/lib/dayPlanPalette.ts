export type DayPlanPalette = {
  bg: string;
  headerBg: string;
  border: string;
  onSurface: string;
  onVariant: string;
  outline: string;
  containerLowest: string;
  containerLow: string;
  containerHigh: string;
  shadow: string;
  trackOff: string;
  catBorderIdle: string;
};

export function palette(isDark: boolean): DayPlanPalette {
  if (isDark) {
    return {
      bg: '#09090b',
      headerBg: 'rgba(9,9,11,0.82)',
      border: 'rgba(255,255,255,0.06)',
      onSurface: '#fafafa',
      onVariant: '#a1a1aa',
      outline: '#71717a',
      containerLowest: '#18181b',
      containerLow: '#27272a',
      containerHigh: '#3f3f46',
      shadow: '#000',
      trackOff: '#3f3f46',
      catBorderIdle: 'rgba(255,255,255,0.08)',
    };
  }
  return {
    bg: '#fafafa',
    headerBg: 'rgba(255,255,255,0.82)',
    border: 'rgba(0,0,0,0.06)',
    onSurface: '#18181b',
    onVariant: '#52525b',
    outline: '#a1a1aa',
    containerLowest: '#f4f4f5',
    containerLow: '#e4e4e7',
    containerHigh: '#d4d4d8',
    shadow: 'rgba(45,47,47,0.08)',
    trackOff: '#d4d4d8',
    catBorderIdle: 'rgba(0,0,0,0.08)',
  };
}
