import { selectIsPro, useSubscriptionStore } from '@features/subscriptions/model/subscriptionStore';

export function hasCalendarProAccess() {
  return selectIsPro(useSubscriptionStore.getState());
}
