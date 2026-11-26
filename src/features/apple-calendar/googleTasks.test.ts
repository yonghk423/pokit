jest.mock('./calendarProAccess', () => ({ hasGoogleCalendarAccess: jest.fn(() => true) }));
import { googleTasks } from './googleTasks';
import { googleSdk } from '../googleSignin';
import { eventsOnDay } from './calendarDates';

jest.mock('../googleSignin', () => ({ googleSdk: jest.fn() }));

it('reads all pages and places a dated task on its local calendar day only', async () => {
  const sdk = {
    signInSilently: async () => ({ type: 'success', data: { user: { email: 'test@example.com' } } }),
    getTokens: async () => ({ accessToken: 'test' }),
  };
  jest.mocked(googleSdk).mockReturnValue(sdk as unknown as ReturnType<typeof googleSdk>);
  const mockFetch = jest.spyOn(global, 'fetch');
  const pages = [
    { items: [], nextPageToken: 'lists2' },
    { items: [{ id: 'personal', title: 'Personal' }] },
    { items: [{ id: 'undated' }], nextPageToken: 'tasks2' },
    { items: [{ id: 'today', title: 'Test', due: '2026-11-17T00:00:00Z' }, { id: 'next', due: '2026-12-01T00:00:00Z' }] },
  ];
  for (const page of pages) mockFetch.mockResolvedValueOnce({ ok: true, json: async () => page } as Response);
  try {
    const events = await googleTasks('test@example.com', new Date(2026, 10, 1), new Date(2026, 11, 1));
    expect(events).toHaveLength(1);
    expect(eventsOnDay(events, new Date(2026, 10, 17))).toHaveLength(1);
    expect(eventsOnDay(events, new Date(2026, 10, 18))).toHaveLength(0);
    expect(mockFetch.mock.calls[3][0]).toContain('pageToken=tasks2');
  } finally {
    mockFetch.mockRestore();
  }
});
