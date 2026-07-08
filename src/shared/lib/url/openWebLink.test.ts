import { normalizeWebUrl } from './openWebLink';

describe('normalizeWebUrl', () => {
  it('adds https to bare hostnames', () => {
    expect(normalizeWebUrl('www.naver.com')).toBe('https://www.naver.com');
    expect(normalizeWebUrl('naver.com')).toBe('https://naver.com');
  });

  it('keeps explicit schemes', () => {
    expect(normalizeWebUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeWebUrl('http://example.com/path')).toBe('http://example.com/path');
  });

  it('returns null for empty input', () => {
    expect(normalizeWebUrl('')).toBeNull();
    expect(normalizeWebUrl('   ')).toBeNull();
  });
});
