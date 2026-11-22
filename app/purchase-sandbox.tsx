import { useState } from 'react';
import { Button, ScrollView, Text } from 'react-native';
import Purchases from 'react-native-purchases';
import { useSubscriptionStore, getActiveProEntitlement } from '@features/subscriptions';
import { invokeDownload } from '@features/subscriptions/lib/downloadClient';

export default function PurchaseSandbox() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (process.env.EXPO_PUBLIC_DOWNLOAD_ENVIRONMENT !== 'Sandbox') return null;
  const run = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try { setMessage(JSON.stringify(await action())); }
    catch { setMessage('처리하지 못했습니다. 계정과 구독 상태를 확인해 주세요.'); }
    finally { setBusy(false); }
  };
  const refresh = async () => {
    await Purchases.invalidateCustomerInfoCache();
    const info = await Purchases.getCustomerInfo();
    useSubscriptionStore.getState().applyCustomerInfo(info);
    const entitlement = getActiveProEntitlement(info);
    return { pro: !!entitlement, sandbox: entitlement?.isSandbox, expires: entitlement?.expirationDate };
  };
  return <ScrollView contentContainerStyle={{ padding: 30, gap: 24 }}>
    <Text>Sandbox 구매 검증</Text>
    <Text>테스트 구독의 만료·환불 후 Pro 상태와 신규 다운로드 거부를 확인합니다.</Text>
    <Button title="구독 상태 새로고침" disabled={busy} onPress={() => void run(refresh)} />
    <Button title="Sandbox 환불 요청" disabled={busy} onPress={() => void run(async () => {
      await Purchases.invalidateCustomerInfoCache();
      const entitlement = getActiveProEntitlement(await Purchases.getCustomerInfo());
      if (!entitlement?.isSandbox) throw new Error('sandbox_required');
      return Purchases.beginRefundRequestForEntitlement(entitlement);
    })} />
    <Button title="유료 다운로드 권한 확인" disabled={busy} onPress={() => void run(async () => {
      const result = await invokeDownload('store-download', { body: { id: 'kissing-shadows', format: 2 } });
      if (result.error) return { allowed: false, ...await result.error.context.json() };
      return { allowed: true };
    })} />
    <Text selectable>{busy ? '확인 중…' : message}</Text>
  </ScrollView>;
}
