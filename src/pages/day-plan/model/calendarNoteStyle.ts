export type CalendarNoteStyle = { id?: string; paper: string; ink: string; rule: string; accent: string; binding: 'linen' | 'stripe' | 'spiral' | 'clip' | 'stitch' | 'plain'; titleSize: number; titleTracking: number; titleWeight: '400' | '600'; lineSpacing: number; headingRuleWidth: number; pattern?: 'ruled' | 'dotted' | 'grid'; headerPaper?: string; headerInk?: string };
const style = (paper: string, ink: string, rule: string, accent: string, binding: CalendarNoteStyle['binding']): CalendarNoteStyle => ({
  paper, ink, rule, accent, binding,
  titleSize: binding === 'clip' ? 24 : binding === 'linen' ? 23 : 22,
  titleTracking: binding === 'stripe' ? .7 : 0,
  titleWeight: binding === 'clip' || binding === 'stripe' ? '600' : '400',
  lineSpacing: binding === 'stitch' || binding === 'plain' ? 36 : binding === 'linen' ? 34 : 32,
  headingRuleWidth: binding === 'clip' ? 1.5 : binding === 'stripe' ? 1 : .5,
});
const themes: Record<string, CalendarNoteStyle> = {
  city: style('#FFF0D8', '#624428', '#DCC6A5', '#BD8A48', 'linen'),
  everyday: style('#F7F2E8', '#33312E', '#D3CCC0', '#AC5636', 'stripe'),
  sepia: style('#F2E4CC', '#534838', '#CFC0A3', '#7A7B48', 'linen'),
  citypop: style('#FFF8E6', '#315B59', '#BBD4CD', '#DF856B', 'stripe'),
  watercolor: style('#FAF4E9', '#385E68', '#C4DADB', '#80B4BD', 'plain'),
  spring: style('#FAF7EC', '#4A6350', '#D4DDC5', '#A9BB96', 'stitch'),
  summer: style('#FFF9ED', '#356A70', '#C4DFDF', '#6BAEB6', 'stripe'),
  autumn: style('#F9EEDC', '#704D37', '#E2C9AD', '#96544A', 'linen'),
  winter: style('#F7F8FA', '#4D6075', '#D3DDE6', '#A6BBCB', 'stitch'),
  'pink-puppy': style('#FBE5E9', '#68454D', '#E5C4CB', '#C997A6', 'stitch'),
  'cream-kitten': style('#F7EFE1', '#5F574B', '#D9CEBC', '#B4A38A', 'stitch'),
  'pink-vinyl': style('#F6E1E9', '#453440', '#DCB9C9', '#A76383', 'stripe'),
  'mono-cafe': style('#353638', '#FAF3E7', '#626366', '#AAA49B', 'linen'),
  'sunshine-yellow': style('#FFFBE8', '#45402A', '#E7DBA9', '#F0C82E', 'stripe'),
  'lemon-slice': style('#FFFEF2', '#5F6036', '#E2DFA7', '#D6C639', 'plain'),
  'kissing-shadows': style('#FAEBCB', '#684A2C', '#DDC39B', '#C39440', 'plain'),
  'daylight-cassette': style('#E8F3FA', '#345B70', '#BFD5E1', '#80B3CC', 'stripe'),
  'mint-sneakers': style('#F5F6EB', '#42685E', '#C9DCD1', '#9CC6B8', 'stitch'),
  bold: style('#FEFEFC', '#252525', '#D7D7D2', '#333333', 'clip'),
  photo: style('#FFFDF8', '#4B4C47', '#DDDED6', '#B6A16F', 'plain'),
  weather: style('#FBFCFD', '#536370', '#D8E0E7', '#91BDD2', 'plain'),
  'soft-mint': style('#EAF0F2', '#4D6264', '#CDD9DC', '#AAC9C1', 'stitch'),
  'spiral-plan': style('#F6F5F0', '#424441', '#D5D5CC', '#424441', 'spiral'),
  'kraft-clip': style('#EEE1CB', '#644E38', '#CEB99A', '#957C5F', 'clip'),
  'ivory-paper': style('#F8EFE5', '#6C5849', '#E1CFC2', '#C6AD97', 'plain'),
};
// Each collection has its own editorial treatment; artwork is never duplicated.
const treatments: Record<string, Partial<CalendarNoteStyle>> = {
  city: { paper: '#F7F4EB', ink: '#343835', rule: '#D8D8CE', accent: '#8D9B85', headerPaper: '#F7F4EB', headerInk: '#343835', titleSize: 24, titleTracking: 0, lineSpacing: 36, headingRuleWidth: 1 },
  everyday: { headerPaper: '#30302E', headerInk: '#FAF5EB', titleTracking: 1.2, lineSpacing: 30, headingRuleWidth: 3 },
  sepia: { headerPaper: '#E6D9BA', titleSize: 24, lineSpacing: 37, headingRuleWidth: 2 },
  citypop: { headerPaper: '#DCEDE4', headerInk: '#245D59', titleTracking: 1.6, headingRuleWidth: 3, lineSpacing: 33 },
  watercolor: { titleSize: 25, lineSpacing: 40, headingRuleWidth: .5, pattern: 'dotted' },
  spring: { headerPaper: '#EDF0DE', lineSpacing: 38, titleTracking: .3 },
  summer: { headerPaper: '#DCEFF0', lineSpacing: 36, headingRuleWidth: 2 },
  autumn: { headerPaper: '#EAD4B8', headerInk: '#733F32', lineSpacing: 35, titleSize: 24 },
  winter: { headerPaper: '#E8EEF5', lineSpacing: 34, pattern: 'dotted', titleTracking: 1 },
  'pink-puppy': { headerPaper: '#F2D2DB', titleSize: 24, lineSpacing: 38 },
  'cream-kitten': { headerPaper: '#EDE2CE', titleSize: 25, lineSpacing: 39 },
  'pink-vinyl': { headerPaper: '#3E303A', headerInk: '#F8DDE8', titleTracking: 1.5, lineSpacing: 32, headingRuleWidth: 3 },
  'mono-cafe': { headerPaper: '#292A2B', headerInk: '#FAF3E7', titleSize: 24, lineSpacing: 36 },
  'sunshine-yellow': { headerPaper: '#F1D14B', titleWeight: '600', titleSize: 25, lineSpacing: 34 },
  'lemon-slice': { headerPaper: '#F5F0BD', pattern: 'dotted', lineSpacing: 36 },
  'kissing-shadows': { headerPaper: '#EBD29E', titleSize: 25, lineSpacing: 40 },
  'daylight-cassette': { headerPaper: '#C9E2EF', pattern: 'grid', lineSpacing: 32, titleTracking: 1.2 },
  'mint-sneakers': { headerPaper: '#DAE9DC', pattern: 'dotted', lineSpacing: 34, titleWeight: '600' },
  bold: { headerPaper: '#252525', headerInk: '#FFFFFF', titleSize: 26, titleWeight: '600', headingRuleWidth: 3, lineSpacing: 32 },
  photo: { titleSize: 24, lineSpacing: 40, headingRuleWidth: .5 },
  weather: { headerPaper: '#EDF4F8', pattern: 'dotted', lineSpacing: 32, titleTracking: .5 },
  'soft-mint': { headerPaper: '#D7E5E1', lineSpacing: 37, titleSize: 23 },
  'spiral-plan': { pattern: 'grid', lineSpacing: 30, titleWeight: '600', headingRuleWidth: 2 },
  'kraft-clip': { headerPaper: '#DCC6A4', lineSpacing: 34, titleSize: 24, headingRuleWidth: 2 },
  'ivory-paper': { headerPaper: '#F2E6D8', lineSpacing: 38, titleTracking: .6, titleSize: 25 },
};
Object.entries(treatments).forEach(([id, treatment]) => Object.assign(themes[id], treatment));
Object.entries(themes).forEach(([id, theme]) => { theme.id = id; });

export function calendarNoteStyle(design: string): CalendarNoteStyle {
  if (themes[design]) return themes[design];
  if (design.startsWith('city-animation-everyday')) return themes.everyday;
  if (design.startsWith('warm-sepia')) return themes.sepia;
  if (design.startsWith('citypop-retro')) return themes.citypop;
  if (design.startsWith('textured-watercolor')) return themes.watercolor;
  for (const season of ['spring', 'summer', 'autumn', 'winter']) if (design.startsWith(`season-${season}`)) return themes[season];
  return themes.city;
}
