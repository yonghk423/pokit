import { getYourdayAiDevelopmentHeaders } from './yourdayAi';

const devGlobal = globalThis as unknown as { __DEV__: boolean };
const originalDev = devGlobal.__DEV__;
const originalToken = process.env.EXPO_PUBLIC_YOURDAY_AI_DEV_TOKEN;
const originalUnlimited = process.env.EXPO_PUBLIC_YOURDAY_AI_UNLIMITED;
afterEach(() => {
  devGlobal.__DEV__ = originalDev;
  if (originalToken == null) delete process.env.EXPO_PUBLIC_YOURDAY_AI_DEV_TOKEN;
  else process.env.EXPO_PUBLIC_YOURDAY_AI_DEV_TOKEN = originalToken;
  if (originalUnlimited == null) delete process.env.EXPO_PUBLIC_YOURDAY_AI_UNLIMITED;
  else process.env.EXPO_PUBLIC_YOURDAY_AI_UNLIMITED = originalUnlimited;
});

it('never sends the developer credential in a release build even when configured locally', () => {
  process.env.EXPO_PUBLIC_YOURDAY_AI_DEV_TOKEN = 'developer-test-credential';
  process.env.EXPO_PUBLIC_YOURDAY_AI_UNLIMITED = 'true';
  devGlobal.__DEV__ = false;
  expect(getYourdayAiDevelopmentHeaders()).toEqual({});
});
it('only sends a configured credential in development', () => {
  devGlobal.__DEV__ = true;
  process.env.EXPO_PUBLIC_YOURDAY_AI_UNLIMITED = 'true';
  delete process.env.EXPO_PUBLIC_YOURDAY_AI_DEV_TOKEN;
  expect(getYourdayAiDevelopmentHeaders()).toEqual({});
  process.env.EXPO_PUBLIC_YOURDAY_AI_DEV_TOKEN = 'developer-test-credential';
  expect(getYourdayAiDevelopmentHeaders()).toEqual({ 'x-yourday-dev-token': 'developer-test-credential' });
});
it('uses normal user quota by default even with a developer token', () => {
  devGlobal.__DEV__ = true;
  process.env.EXPO_PUBLIC_YOURDAY_AI_DEV_TOKEN = 'developer-test-credential';
  delete process.env.EXPO_PUBLIC_YOURDAY_AI_UNLIMITED;
  expect(getYourdayAiDevelopmentHeaders()).toEqual({});
  process.env.EXPO_PUBLIC_YOURDAY_AI_UNLIMITED = 'false';
  expect(getYourdayAiDevelopmentHeaders()).toEqual({});
});
