import { act, create } from 'react-test-renderer';
import { PremiumCalendarPaper } from './PremiumCalendarPaper';
import { CalendarPlannerNotes } from './CalendarPlannerNotes';
import { premiumPapers, type PremiumPaper } from '../model/premiumCalendarPapers';

jest.mock('./CalendarPlannerNotes', () => ({ CalendarPlannerNotes: () => null }));
jest.mock('./HeroCalendarPhoto', () => ({ HeroCalendarPhoto: () => null }));

const props = { month: new Date(2026, 10, 1), today: new Date(2026, 10, 12), diaries: [], eventDates: [], width: 330, height: 330, miniature: false };
it.each(Object.keys(premiumPapers) as PremiumPaper[])('hides notes and checklist in the small %s widget', design => {
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<PremiumCalendarPaper {...props} design={design} widgetSize="small" />); });
  expect(tree.root.findAllByType(CalendarPlannerNotes)).toHaveLength(0);
  act(() => tree.unmount());
});
it.each(['mint-planner', 'spiral-plan'] as const)('preserves planner content in the large %s widget', design => {
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<PremiumCalendarPaper {...props} height={346} design={design} widgetSize="large" />); });
  expect(tree.root.findAllByType(CalendarPlannerNotes)).toHaveLength(1);
  expect(tree.root.findByType(CalendarPlannerNotes).props.readOnly).toBe(true);
  act(() => tree.unmount());
});

it.each(Object.keys(premiumPapers) as PremiumPaper[])('excludes diary photos from both %s widget sizes while retaining them in the app', design => {
  const { HeroCalendarPhoto } = require('./HeroCalendarPhoto');
  const diaries = [{ id: 'photo-day', date: '2026-11-09', createdAt: 1, scenes: [{ id: 'photo', artworkUri: 'file:///saved.jpg' }] }] as any;
  for (const widgetSize of [undefined, 'small', 'large'] as const) {
    let tree!: ReturnType<typeof create>;
    act(() => { tree = create(<PremiumCalendarPaper {...props} diaries={diaries} design={design} widgetSize={widgetSize} />); });
    expect(tree.root.findAllByType(HeroCalendarPhoto)).toHaveLength(widgetSize ? 0 : 1);
    act(() => tree.unmount());
  }
});
