import { containsHangul, resolveBookSearchProvider } from './resolveBookSearchProvider';

describe('resolveBookSearchProvider', () => {
  it('routes hangul queries to aladin', () => {
    expect(resolveBookSearchProvider('해리포터')).toBe('aladin');
    expect(containsHangul('Harry 포터')).toBe(true);
  });

  it('routes latin queries to openlibrary', () => {
    expect(resolveBookSearchProvider('Harry Potter')).toBe('openlibrary');
    expect(containsHangul('Harry Potter')).toBe(false);
  });
});
