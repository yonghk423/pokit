import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { hasGoogleCalendarAccess } from './calendarProAccess';
import { deviceCalendars, deviceEvents, useAppleCalendar } from './appleCalendar';
import { connectGoogleCalendar, googleEvents, useGoogleCalendar } from './googleCalendar';
import { googleTasks } from './googleTasks';
import { googleSdk } from '../googleSignin';
import * as Calendar from 'expo-calendar/legacy';

jest.mock('@features/subscriptions/model/subscriptionStore', () => ({
  useSubscriptionStore: { getState: () => ({}) }, selectIsPro: () => false,
}));
jest.mock('../googleSignin', () => ({ googleSdk: jest.fn() }));
jest.mock('expo-calendar/legacy', () => ({ getCalendarPermissionsAsync: jest.fn(), requestCalendarPermissionsAsync: jest.fn() }));

it('blocks device calendar reads without deleting saved selections or asking for permission', async () => {
  useAppleCalendar.getState().select(['existing']);
  expect(await deviceCalendars(true)).toEqual([]);
  expect(await deviceEvents(['existing'], new Date(), new Date())).toEqual([]);
  expect(Calendar.getCalendarPermissionsAsync).not.toHaveBeenCalled();
  expect(Calendar.requestCalendarPermissionsAsync).not.toHaveBeenCalled();
  expect(useAppleCalendar.getState().ids).toEqual(['existing']);
});
it('allows Google access for non-subscribers while review access is enabled', () => {
  const original = FEATURE_FLAGS.googleCalendarFreeDuringReview;
  FEATURE_FLAGS.googleCalendarFreeDuringReview = true;
  try {
    expect(hasGoogleCalendarAccess()).toBe(true);
  } finally {
    FEATURE_FLAGS.googleCalendarFreeDuringReview = original;
  }
});
it('blocks Google connection, events and tasks when the review flag is off', async () => {
  const original = FEATURE_FLAGS.googleCalendarFreeDuringReview;
  FEATURE_FLAGS.googleCalendarFreeDuringReview = false;
  try {
    useGoogleCalendar.setState({ email: 'saved@example.com', tasksEmail: 'saved@example.com' });
    await expect(connectGoogleCalendar()).rejects.toThrow('subscription_required');
    expect(await googleEvents('saved@example.com', new Date(), new Date())).toEqual([]);
    expect(await googleTasks('saved@example.com', new Date(), new Date())).toEqual([]);
    expect(googleSdk).not.toHaveBeenCalled();
    expect(useGoogleCalendar.getState().email).toBe('saved@example.com');
  } finally {
    FEATURE_FLAGS.googleCalendarFreeDuringReview = original;
  }
});
