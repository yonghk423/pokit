import { Platform } from 'react-native';

import {
  buildExactLocalNotificationTrigger,
  REMINDER_NOTIFICATION_CHANNEL_ID,
} from './buildExactLocalNotificationTrigger';

jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date', CALENDAR: 'calendar' },
}));

describe('buildExactLocalNotificationTrigger', () => {
  const triggerAt = new Date(2026, 7, 24, 12, 15, 0);

  it('uses a one-shot calendar trigger on iOS so the clock time is kept', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'ios' });

    expect(buildExactLocalNotificationTrigger(triggerAt)).toEqual({
      type: 'calendar',
      repeats: false,
      year: 2026,
      month: 8,
      day: 24,
      hour: 12,
      minute: 15,
      second: 0,
    });
  });

  it('uses a DATE trigger with the reminder channel on Android', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, get: () => 'android' });

    expect(buildExactLocalNotificationTrigger(triggerAt)).toEqual({
      type: 'date',
      date: triggerAt,
      channelId: REMINDER_NOTIFICATION_CHANNEL_ID,
    });
  });
});
