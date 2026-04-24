import type { DailyRhythmStyleAlarmRowPalette } from '../ui/DailyRhythmStyleAlarmRow';
import type { SnappedTimePickerFieldPalette } from '../ui/SnappedTimePickerField';

export type ReminderCardSurfacePalette = {
  timeField: SnappedTimePickerFieldPalette;
  alarm: DailyRhythmStyleAlarmRowPalette;
  cardBg: string;
  cardBorder: string;
};

/** `dayPlanPalette` 라이트·다크와 동일 토큰 — pages 간 의존 없이 위젯에서 제공 */
export function paletteForReminderTimeCard(isDark: boolean): ReminderCardSurfacePalette {
  if (isDark) {
    return {
      timeField: {
        onSurface: '#fafafa',
        onVariant: '#a1a1aa',
        border: 'rgba(255,255,255,0.06)',
        containerLowest: '#18181b',
      },
      alarm: {
        onSurface: '#fafafa',
        onVariant: '#a1a1aa',
        trackOff: '#3f3f46',
      },
      cardBg: '#27272a',
      cardBorder: 'rgba(255,255,255,0.06)',
    };
  }
  return {
    timeField: {
      onSurface: '#18181b',
      onVariant: '#52525b',
      border: 'rgba(0,0,0,0.06)',
      containerLowest: '#ffffff',
    },
    alarm: {
      onSurface: '#18181b',
      onVariant: '#52525b',
      trackOff: '#e5e7eb',
    },
    cardBg: '#ffffff',
    cardBorder: 'rgba(0,0,0,0.06)',
  };
}
