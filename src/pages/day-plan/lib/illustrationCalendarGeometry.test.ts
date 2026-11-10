import { CALENDAR_ARTWORK_LAYOUTS } from './illustrationCalendarLayouts';
import { CALENDAR_ARTWORK_SIZES, fitCalendarArtwork, calendarCellContents } from './illustrationCalendarGeometry';
import { illustrationCellFrame, illustrationMonthCells } from '../ui/HeroIllustrationCalendar';
jest.mock('./illustrationCalendarAssets', () => ({}));

it('registers all 50 bundled calendar artworks explicitly', () => {
  const fs = require('fs');
  const folders = fs.readdirSync('assets/calendar-illustrations/city-animation').filter((name: string) => fs.existsSync(`assets/calendar-illustrations/city-animation/${name}/background.webp`));
  expect(Object.keys(CALENDAR_ARTWORK_SIZES).sort()).toEqual(folders.sort());
  expect(folders).toHaveLength(50);
});
it.each([[320,568,20,90],[375,667,20,90],[390,844,59,110],[430,932,59,110],[440,956,62,110]])('fills the screen while keeping all 50 calendar grids above the tab bar: %s × %s', (width,height,top,bottom) => {
  for (const [theme, [sw,sh]] of Object.entries(CALENDAR_ARTWORK_SIZES)) {
    const frame = fitCalendarArtwork(theme,width,height,top,bottom);
    expect(frame.width/frame.height).toBeCloseTo(sw/sh,8);
    expect(frame.left).toBeLessThanOrEqual(.001);
    expect(frame.left+frame.width).toBeGreaterThanOrEqual(width-.001);
    expect(frame.top).toBeLessThanOrEqual(.001);
    expect(frame.top+frame.height).toBeGreaterThanOrEqual(height-.001);
    for (const region of ['month', 'weekdays', 'grid'] as const) {
      const [x,y,w,h] = CALENDAR_ARTWORK_LAYOUTS[theme][region];
      expect(frame.left+x*frame.width).toBeGreaterThanOrEqual(-.05);
      expect(frame.left+(x+w)*frame.width).toBeLessThanOrEqual(width+.05);
      expect(frame.top+y*frame.height).toBeGreaterThanOrEqual(top+8-.05);
      expect(frame.top+(y+h)*frame.height).toBeLessThanOrEqual(height-bottom-8+.05);
    }
    const cells = Array.from({length:42},(_,slot)=>illustrationCellFrame(theme,slot,frame.width,frame.height));
    cells.forEach((cell,i)=>{
      const content = calendarCellContents(cell.width, cell.height);
      expect(content.photoTop).toBeGreaterThan(content.numberTop+content.numberHeight);
      expect(content.photoTop+content.photoHeight).toBeLessThan(cell.height);
      expect(cell.width).toBeGreaterThan(0);
      expect(cell.height).toBeGreaterThan(0);
      expect(cell.left+cell.width).toBeLessThanOrEqual(frame.width+.001);
      expect(cell.top+cell.height).toBeLessThanOrEqual(frame.height+.001);
      if(i<35) expect(cell.top+cell.height).toBeLessThanOrEqual(cells[i+7].top+.001);
    });
  }
});
it('keeps every date in its correct Monday-first column for all months, including leap years',()=>{
  for(let y=2026;y<=2032;y++) for(let m=0;m<12;m++) {
    const cells=illustrationMonthCells(new Date(y,m,1));
    expect(cells.filter(Boolean)).toHaveLength(new Date(y,m+1,0).getDate());
    cells.forEach((date,slot)=>{if(date) expect(slot%7).toBe((date.getDay()+6)%7);});
  }
});

it('provides independently sampled contrast for every date and weekday on every artwork', () => {
  const { CALENDAR_CONTRAST } = require('./illustrationCalendarContrast');
  expect(Object.keys(CALENDAR_CONTRAST).sort()).toEqual(Object.keys(CALENDAR_ARTWORK_SIZES).sort());
  for (const palette of Object.values(CALENDAR_CONTRAST) as any[]) {
    expect(palette.dates).toHaveLength(42);
    expect(palette.weekdays).toHaveLength(7);
    expect([...palette.dates, ...palette.weekdays, palette.title].every(c => ['#28231D','#FFF8E8'].includes(c))).toBe(true);
  }
  expect(CALENDAR_CONTRAST['49-winter-snow-play'].dates).toContain('#28231D');
  expect(CALENDAR_CONTRAST['33-exam-results-joy'].dates).toContain('#FFF8E8');
});
