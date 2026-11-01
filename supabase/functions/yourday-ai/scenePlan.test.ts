import { planDiaryScene } from './scenePlan';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
it('sends title and body together, enables optional search and extracts the scene brief', async () => {
  const mock = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'completed', output: [
    { type: 'web_search_call' },
    { type: 'message', content: [{ type: 'output_text', text: 'Full-body person in an office corridor, frustrated after a meeting.' }] },
  ] }) });
  global.fetch = mock;
  const result = await planDiaryScene({ title: '회사에서', text: '팀장의 리더십이 아쉽다', source: 'character' }, 'test', new AbortController().signal);
  const request = JSON.parse(mock.mock.calls[0][1].body);
  expect(JSON.parse(request.input)).toEqual({ title: '회사에서', body: '팀장의 리더십이 아쉽다' });
  expect(request.tools).toEqual([{ type: 'web_search' }]);
  expect(request.store).toBe(false);
  expect(result).toContain('office corridor');
});
it.each([
  { status: 'incomplete', output: [{ type: 'message', content: [{ type: 'output_text', text: 'partial' }] }] },
  { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] },
])('rejects unusable planner output before image generation', async payload => {
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload });
  await expect(planDiaryScene({ text: 'story', source: 'character' }, 'test', new AbortController().signal)).rejects.toThrow('generation_failed');
});
it('surfaces provider quota errors without retrying', async () => {
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 });
  await expect(planDiaryScene({ text: 'story', source: 'character' }, 'test', new AbortController().signal)).rejects.toThrow('api_quota');
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
