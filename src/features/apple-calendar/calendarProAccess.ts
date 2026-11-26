import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { selectIsPro, useSubscriptionStore } from '@features/subscriptions/model/subscriptionStore';

export function hasCalendarProAccess() {
  return selectIsPro(useSubscriptionStore.getState());
}

export function canUseGoogleCalendar(isPro: boolean) {
  return FEATURE_FLAGS.googleCalendarFreeDuringReview || isPro;
}

export function hasGoogleCalendarAccess() {
  return canUseGoogleCalendar(hasCalendarProAccess());
}
