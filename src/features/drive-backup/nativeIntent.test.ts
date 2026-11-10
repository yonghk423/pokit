import { redirectSystemPath } from '../../../app/+native-intent';
const previous = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
afterEach(() => { if (previous === undefined) delete process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID; else process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = previous; });
it('keeps an active Google callback out of navigation and strips callback parameters on cold launch', () => {
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '123-example.apps.googleusercontent.com';
  const path = 'com.googleusercontent.apps.123-example:/oauthredirect?code=private-code';
  expect(redirectSystemPath({ path, initial: false })).toBeNull();
  expect(redirectSystemPath({ path, initial: true })).toBe('/settings');
});
it('preserves normal app links and does not match a different Google client', () => {
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = '123-example.apps.googleusercontent.com';
  expect(redirectSystemPath({ path: 'pokit://settings', initial: false })).toBe('pokit://settings');
  expect(redirectSystemPath({ path: 'com.googleusercontent.apps.other:/oauthredirect', initial: false })).toBe('com.googleusercontent.apps.other:/oauthredirect');
  expect(redirectSystemPath({ path: null, initial: true })).toBeNull();
});

it.each([true, false])('opens widget links directly in the calendar tab (initial=%s)', initial => {
  expect(redirectSystemPath({ path: 'pokit://comic-day?calendarWidget=1', initial })).toBe('/(tabs)?calendarWidget=1');
  expect(redirectSystemPath({ path: '/comic-day?calendarWidget=1', initial })).toBe('/(tabs)?calendarWidget=1');
});
