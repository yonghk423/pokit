import { WARM_SEPIA_OPEN_PANEL_THEMES } from '../model/warmSepiaThemes';
import { WARM_SEPIA_OPEN_PANEL_LAYOUTS } from './warmSepiaLayouts';
import { WARM_SEPIA_OPEN_PANEL_FILES } from '../../../../supabase/functions/calendar-theme/warmSepiaFiles';
import * as template from '../../../../docs/design/photo-diary/city-calendar-template.json';

it('keeps all 100 gallery choices, download filenames and calibrated layouts in sync', () => {
  const themes = WARM_SEPIA_OPEN_PANEL_THEMES;
  expect(themes).toHaveLength(100);
  const ids = themes.map(theme => theme.themeId);
  expect(new Set(ids).size).toBe(100);
  expect(Object.keys(WARM_SEPIA_OPEN_PANEL_LAYOUTS).sort()).toEqual([...ids].sort());
  expect(Object.keys(WARM_SEPIA_OPEN_PANEL_FILES).sort()).toEqual([...ids].sort());
  themes.forEach((theme, index) => {
    expect(theme.design).toBe(`warm-sepia-open-panel-${String(index + 1).padStart(2, '0')}`);
    expect(WARM_SEPIA_OPEN_PANEL_FILES[theme.themeId]).toBe(theme.themeId.replace('warm-sepia-open-panel-', '') + '.webp');
    const layout = WARM_SEPIA_OPEN_PANEL_LAYOUTS[theme.themeId];
    expect(layout.md5).toMatch(/^[a-f0-9]{32}$/);
    expect(layout.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(layout.size).toEqual(template.size);
    for (const area of ['month', 'weekdays', 'grid'] as const) {
      expect(layout[area]).toEqual(template[area].map((value, i) => value / template.size[i % 2]));
    }
  });
});
