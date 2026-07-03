import { RetroFlatColors } from '@shared/config/retroFlat';

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
  const c = isDark ? RetroFlatColors.dark : RetroFlatColors.light;
  return {
    timeField: {
      onSurface: c.text,
      onVariant: c.textMuted,
      border: c.border,
      containerLowest: c.surface,
    },
    alarm: {
      onSurface: c.text,
      onVariant: c.textMuted,
      trackOff: c.accentMuted,
    },
    cardBg: c.surfaceAlt,
    cardBorder: c.border,
  };
}
