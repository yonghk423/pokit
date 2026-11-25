import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { CalendarPaper } from './HeroCalendarDesigns';
import { HeroDiaryCalendar } from './HeroDiaryCalendar';
import { PHOTO_CALENDARS } from '../model/freePhotoCalendars';
import { newComicScene } from '../lib/heroDayStorage';
import type { PremiumPaper } from '../model/premiumCalendarPapers';

jest.mock('react-native-purchases', () => ({}));
jest.mock('react-native-purchases-ui', () => ({}));
jest.mock('@shared/ui/app-modal', () => ({ AppModal: jest.requireActual('react-native').View }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../model/heroCanvasEvents', () => ({ useCanvasEventDates: () => ['2026-11-24', '2026-11-25'] }));
jest.mock('@features/apple-calendar/useDeviceEvents', () => ({ useDeviceEvents: () => ({ events: [
  { id: 'a', title: 'Linked', startDate: '2026-11-25T12:00', endDate: '2026-11-25T13:00' },
  { id: 'b', title: 'Linked', startDate: '2026-11-27T12:00', endDate: '2026-11-27T13:00' },
] }) }));
const dates = ['2026-11-24', '2026-11-25', '2026-11-27'];
const diaries = [{ id: 'diary', date: dates[1], title: 'Diary', characterId: 'protagonist-1', createdAt: 1, updatedAt: 1, scenes: [{ ...newComicScene('Photo'), artworkUri: 'file:///photo.jpg' }] }];
const papers: PremiumPaper[] = ['soft-mint', 'spiral-plan', 'kraft-clip', 'ivory-paper'];
function checkDots(tree: ReactTestRenderer) {
  for (const date of dates) expect(tree.root.findAll(node => typeof node.type === 'string' && node.props.testID === `calendar-event-dot-${date}`)).toHaveLength(1);
  expect(tree.root.findAllByProps({ testID: 'calendar-event-dot-2026-11-26' })).toHaveLength(0);
}
it.each([...PHOTO_CALENDARS.map(t => t.id), ...papers])('marks scheduled dates including today with a photo in %s', design => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<CalendarPaper design={design} month={new Date(2026, 10, 1)} today={new Date(2026, 10, 25)} diaries={diaries} eventDates={dates} layoutWidth={390} layoutHeight={750} />); });
  try { checkDots(tree); } finally { act(() => tree.unmount()); }
});
it('merges local and linked dates in the record picker', () => {
  let tree!: ReactTestRenderer;
  act(() => { tree = create(<HeroDiaryCalendar diaries={diaries} today={dates[1]} ink="#222" muted="#888" isDark={false} onClose={jest.fn()} onOpen={jest.fn()} />); });
  try { checkDots(tree); } finally { act(() => tree.unmount()); }
});
