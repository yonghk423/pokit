import { View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';
import type { DriveStorageQuota } from './drive';

function capacity(bytes: number) {
  const units = ['MB', 'GB'];
  let value = Math.max(0, bytes) / 1024 ** 2;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${Number(value.toFixed(1))} ${units[unit]}`;
}

export function DriveStorageMeter({ quota, ink, muted, dark }: { quota: DriveStorageQuota; ink: string; muted: string; dark: boolean }) {
  const { t } = useTranslation();
  const limited = quota.limit !== null && quota.limit > 0;
  const percent = limited ? Math.min(100, Math.max(0, quota.usage / quota.limit! * 100)) : 0;
  const displayPercent = String(Number(percent.toFixed(1))); 
  const color = percent >= 90 ? '#BC5946' : dark ? '#B5C8A6' : '#718468';
  return <View style={{ gap: 10 }}>
    <ThemedText style={{ color: ink, fontSize: 24, lineHeight: 34 }}>{limited ? t('drive.storage.remaining', { size: capacity(Math.max(0, quota.limit! - quota.usage)) }) : t('drive.storage.used', { size: capacity(quota.usage) })}</ThemedText>
    {limited ? <>
      <View accessibilityRole="progressbar" accessibilityLabel={t('drive.storage.usage')} accessibilityValue={{ min: 0, max: 100, now: percent, text: t('drive.storage.percent', { percent: displayPercent }) }} style={{ height: 12, borderRadius: 6, backgroundColor: dark ? '#424840' : '#E2E5DD', overflow: 'hidden' }}>
        <View style={{ height: '100%', width: `${percent}%`, backgroundColor: color, borderRadius: 6 }} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4 }}>
        <ThemedText style={{ color: muted, fontSize: 13 }}>{t('drive.storage.used', { size: capacity(quota.usage) })}</ThemedText>
        <ThemedText style={{ color: muted, fontSize: 13 }}>{t('drive.storage.total', { size: capacity(quota.limit!) })}</ThemedText>
      </View>
    </> : <ThemedText style={{ color: muted, fontSize: 13 }}>{t('drive.storage.noLimit')}</ThemedText>}
  </View>;
}
