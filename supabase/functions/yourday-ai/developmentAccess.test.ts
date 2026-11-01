import { hasDevelopmentAccess } from './developmentAccess';

const secret = 'a'.repeat(64);
const request = (token?: string) => new Request('https://example.test/health', {
  headers: token ? { 'x-yourday-dev-token': token } : {},
});
it('does not trust a dev flag, a missing server secret, or an incorrect credential', () => {
  expect(hasDevelopmentAccess(request(), secret)).toBe(false);
  expect(hasDevelopmentAccess(request('true'), secret)).toBe(false);
  expect(hasDevelopmentAccess(request('b'.repeat(64)), secret)).toBe(false);
  expect(hasDevelopmentAccess(request(secret), undefined)).toBe(false);
});
it('accepts only the configured developer credential', () => {
  expect(hasDevelopmentAccess(request(secret), secret)).toBe(true);
});
