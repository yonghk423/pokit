import { parseAladinResponse, stripAladinHtml } from './parseAladinResponse';

describe('parseAladinResponse', () => {
  it('parses JSONP callback payloads', async () => {
    const payload = { totalResults: 1, item: [{ itemId: 1, title: '책' }] };
    const response = new Response(`callback(${JSON.stringify(payload)});`);

    await expect(parseAladinResponse<typeof payload>(response)).resolves.toEqual(payload);
  });

  it('parses plain JSON payloads', async () => {
    const payload = { totalResults: 0 };
    const response = new Response(JSON.stringify(payload));

    await expect(parseAladinResponse<typeof payload>(response)).resolves.toEqual(payload);
  });
});

describe('stripAladinHtml', () => {
  it('removes HTML tags from titles', () => {
    expect(stripAladinHtml('<b>POKIT</b> 가이드')).toBe('POKIT 가이드');
  });
});
