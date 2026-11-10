"""Recompute text ink colors from each fullbleed-v2 calendar grid cell."""
from pathlib import Path
from PIL import Image, ImageStat
import json

root = Path(__file__).resolve().parents[1]
asset_root = Path('/Users/yonghee/Documents/Codex/yourday/calendar-illustrations/fullbleed-v2')
manifest = json.loads((asset_root / 'manifest.json').read_text())

def luminance(rgb):
    channels = []
    for value in rgb:
        value /= 255
        channels.append(value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4)
    return sum(value * weight for value, weight in zip(channels, (.2126, .7152, .0722)))

def ink(image, box):
    width, height = image.size
    coords = tuple(round(value * (width if axis % 2 == 0 else height)) for axis, value in enumerate(box))
    rgb = ImageStat.Stat(image.crop(coords)).mean
    light = luminance(rgb)
    dark_ratio = (light + .05) / (.018 + .05)
    light_ratio = (1.0 + .05) / (light + .05)
    return '#28231D' if dark_ratio >= light_ratio else '#FFF8E8'

result = {}
for theme, data in manifest['layouts'].items():
    image = Image.open(asset_root / theme / 'background.webp').convert('RGB')
    left, top, width, height = data['grid']
    row_height = height / 6
    dates = []
    for slot in range(42):
        row, col = divmod(slot, 7)
        cell_width = width / 7
        cx = left + (col + .5) * cell_width
        cy = top + row * row_height
        dates.append(ink(image, (cx - cell_width * .25, cy + row_height * .08, cx + cell_width * .25, cy + row_height * .72)))
    weekday_top = top - row_height * .904
    weekdays = []
    for col in range(7):
        cx = left + (col + .5) * width / 7
        weekdays.append(ink(image, (cx - width / 7 * .32, weekday_top + row_height * .08, cx + width / 7 * .32, weekday_top + row_height * .66)))
    title_top = max(0, top - row_height * 2.16)
    title = ink(image, (left + width * .2, title_top + row_height * .06, left + width * .8, title_top + row_height * .76))
    result[theme] = {'dates': dates, 'weekdays': weekdays, 'title': title}

output = root / 'src/pages/day-plan/lib/illustrationCalendarContrast.ts'
output.write_text('/** Generated from per-cell pixel samples of fullbleed-v2 calendar artworks. */\nexport const CALENDAR_CONTRAST: Record<string, { dates: string[]; weekdays: string[]; title: string }> = ' + json.dumps(result, separators=(',', ':')) + ';\n')
print(f'calibrated {len(result)} themes; {sum(len(set(v["dates"])) > 1 for v in result.values())} themes mix date ink colors')
