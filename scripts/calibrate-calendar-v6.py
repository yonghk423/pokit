"""Compile measured v6 artwork regions; never modifies or regenerates the artwork."""
from pathlib import Path
from PIL import Image, ImageStat
import json, hashlib
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets/calendar-illustrations/upload-candidate-v6'
MEASURE=ROOT/'docs/design/photo-diary/calendar-v6-measurements.json'

def ink(im, box):
    rgb=ImageStat.Stat(im.crop(tuple(round(v) for v in box))).mean[:3]
    linear=[v/255/12.92 if v/255<=.04045 else ((v/255+.055)/1.055)**2.4 for v in rgb]
    lum=sum(a*b for a,b in zip(linear,(.2126,.7152,.0722)))
    return '#28231D' if (lum+.05)/(.018+.05) >= 1.05/(lum+.05) else '#FFF8E8'

def main():
    measured=json.loads(MEASURE.read_text()); layouts={}; palettes={}
    for path in sorted(SOURCE.glob('*/background.webp')):
        theme=path.parent.name; m=measured[theme[:2]]; im=Image.open(path).convert('RGB'); w,h=im.size
        norm=lambda rect: [round(v/(w if i%2==0 else h),8) for i,v in enumerate(rect)]
        x,y,gw,gh=m['grid']; rows=m.get('rows',[y+gh*i/6 for i in range(7)])
        assert all(rows[i]<rows[i+1] for i in range(len(rows)-1))
        layouts[theme]={'size':[w,h],'month':norm(m['month']),'weekdays':norm(m['weekdays']),
                        'grid':norm(m['grid']),'sourceRows':[round(v/h,8) for v in rows],
                        'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
        dates=[]
        for slot in range(42):
            row,col=divmod(slot,7); src=min(row,len(rows)-2); sy0,sy1=rows[src:src+2]
            cx=x+(col+.5)*gw/7; dates.append(ink(im,(cx-gw/28,sy0+(sy1-sy0)*.08,cx+gw/28,sy0+(sy1-sy0)*.38)))
        mx,my,mw,mh=m['month']; wx,wy,ww,wh=m['weekdays']
        palettes[theme]={'dates':dates,'weekdays':[ink(im,(wx+(col+.25)*ww/7,wy+wh*.2,wx+(col+.75)*ww/7,wy+wh*.8)) for col in range(7)],
                         'title':ink(im,(mx+mw*.25,my+mh*.2,mx+mw*.75,my+mh*.8))}
    assert len(layouts)==len(measured)==50
    out=ROOT/'src/pages/day-plan/lib/illustrationCalendarLayouts.ts'
    out.write_text('''/** Measured against the 50 WebPs uploaded on 2026-11-10. Regenerate with scripts/calibrate-calendar-v6.py. */
export type CalendarRegion = readonly [left: number, top: number, width: number, height: number];
export type CalendarArtworkLayout = {
  size: readonly [number, number];
  month: CalendarRegion;
  weekdays: CalendarRegion;
  grid: CalendarRegion;
  /** Actual row boundaries in the source artwork; shorter grids are composed as six rows at runtime. */
  sourceRows: readonly number[];
  sha256: string;
};
export const CALENDAR_ARTWORK_LAYOUTS: Record<string, CalendarArtworkLayout> = '''+json.dumps(layouts,ensure_ascii=False,indent=2)+''';
export const CALENDAR_GRID_LAYOUTS: Record<string, CalendarRegion> = Object.fromEntries(Object.entries(CALENDAR_ARTWORK_LAYOUTS).map(([id, layout]) => [id, layout.grid]));
export const CALENDAR_ARTWORK_SIZES: Record<string, readonly [number, number]> = Object.fromEntries(Object.entries(CALENDAR_ARTWORK_LAYOUTS).map(([id, layout]) => [id, layout.size]));
''')
    (ROOT/'src/pages/day-plan/lib/illustrationCalendarContrast.ts').write_text('/** Sampled from the actual v6 text regions, including composed rows. */\nexport const CALENDAR_CONTRAST: Record<string, { dates: string[]; weekdays: string[]; title: string }> = '+json.dumps(palettes,separators=(',',':'))+';\n')
    (ROOT/'output/calendar-v6-calibration/layouts.json').write_text(json.dumps(layouts,indent=2))
    print(f'Calibrated {len(layouts)} themes; {sum(len(v["sourceRows"])!=7 for v in layouts.values())} grids need six-row composition')
if __name__=='__main__': main()
