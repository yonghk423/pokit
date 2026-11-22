import { selectCanTestProStoreItems, useSubscriptionStore } from '@features/subscriptions';
import { useEffect, useState } from 'react';
import { diaryImages, installDiaryItem } from './calendarStoreDownload';

const paidLegacy = /^(clip-(pink|peach|yellow|mint|sky|lavender|vivid-pink|orange|golden-yellow|emerald|burgundy|purple)|camera-(mini-12|kodak-mini-shot)|trash-(rattan|walnut|leather|steel|pink|charcoal|ash|canvas|vintage))$/;

/** Verify/recover paid originals before rendering; bundled previews are store-only. */
export function useAppliedDiaryImage(id: string, role: string, freeFallback: number) {
  const pro = useSubscriptionStore(selectCanTestProStoreItems);
  const paid = paidLegacy.test(id);
  const [verified, setVerified] = useState<{ id: string; role: string; uri: string }>();
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!paid || !pro) return;
    let live = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    void installDiaryItem(id).then(() => {
      const uri = diaryImages(id)?.[role];
      if (live && uri) setVerified({ id, role, uri });
    }).catch(() => {
      // Retry transient/offline failures without ever substituting a thumbnail.
      if (live) retry = setTimeout(() => setAttempt(value => value + 1), Math.min(60000, 5000 * 2 ** Math.min(attempt, 4)));
    });
    return () => { live = false; clearTimeout(retry); };
  }, [id, role, paid, pro, attempt]);
  if (!paid) return freeFallback;
  if (!pro) return undefined;
  return verified?.id === id && verified.role === role ? { uri: verified.uri } : undefined;
}
