import { completionCopy, notifyCompletion } from './notify';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
function store(states: string[]) {
  let claimed = false;
  const updates: Record<string, unknown>[] = [];
  return { updates, client: { from: (table: string) => table === 'hero_ai_outputs' ? {
    select: () => ({ eq: async () => ({ data: states.map(state => ({ state })) }) }),
  } : {
    update: (values: Record<string, unknown>) => {
      updates.push(values);
      if (values.claimed_at) return { eq: () => ({ is: () => ({ select: async () => {
        if (claimed) return { data: [] };
        claimed = true; return { data: [{ push_token: 'ExponentPushToken[device]', locale: 'ko' }] };
      } }) }) };
      return { eq: async () => ({}) };
    },
  } } };
}
it('only sends one completion across concurrent workers and includes the recovery job', async () => {
  const db = store(['completed', 'completed']);
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { id: 'ticket', status: 'ok' } }) });
  await Promise.all([notifyCompletion(db.client as never, 'hero-test-123'), notifyCompletion(db.client as never, 'hero-test-123')]);
  expect(global.fetch).toHaveBeenCalledTimes(1);
  const message = JSON.parse(jest.mocked(global.fetch).mock.calls[0][1]!.body as string);
  expect(message.body).toContain('2');
  expect(message.data).toEqual({ type: 'hero-ai-complete', jobId: 'hero-test-123' });
  expect(db.updates).toContainEqual({ ticket_id: 'ticket', error: null });
});
it.each([['completed', 'processing'], ['failed', 'uncertain']])('does not report an unfinished or entirely failed job as ready: %s', async (...states) => {
  const db = store(states);
  global.fetch = jest.fn();
  await notifyCompletion(db.client as never, 'hero-test-123');
  expect(global.fetch).not.toHaveBeenCalled();
});
it('localizes the completion message', () => {
  expect(completionCopy('en', 2)[1]).toContain('2 images');
  expect(completionCopy('unknown', 1)).toEqual(completionCopy('en', 1));
});
