import { inspectFace } from './faceValidation';
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
function answer(result: string) { return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ result }) } }] }) } as Response; }
it.each(['face_missing', 'face_multiple', 'face_unclear'])('rejects %s before generation', async code => {
  global.fetch = jest.fn().mockResolvedValue(answer(code));
  await expect(inspectFace('jpeg', 'test-key')).rejects.toThrow(code);
});
it('accepts exactly one usable face and requests strict image analysis without storing it', async () => {
  global.fetch = jest.fn().mockResolvedValue(answer('ok'));
  await expect(inspectFace('jpeg', 'test-key')).resolves.toBeUndefined();
  const body = JSON.parse(jest.mocked(global.fetch).mock.calls[0][1]!.body as string);
  expect(body.store).toBe(false);
  expect(body.response_format.json_schema.strict).toBe(true);
  expect(body.messages[1].content[0].image_url.url).toBe('data:image/jpeg;base64,jpeg');
});
it.each(['malformed', 'network', 'refused'])('fails closed for %s checks', async reason => {
  global.fetch = jest.fn();
  if (reason === 'network') jest.mocked(global.fetch).mockRejectedValue(new Error('timeout'));
  else if (reason === 'refused') jest.mocked(global.fetch).mockResolvedValue({ ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { refusal: 'no' } }] }) } as Response);
  else jest.mocked(global.fetch).mockResolvedValue(answer('maybe'));
  await expect(inspectFace('jpeg', 'test-key')).rejects.toThrow('face_check_unavailable');
});
