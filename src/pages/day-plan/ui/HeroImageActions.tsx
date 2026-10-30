import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useRef, useState } from 'react';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';

export function HeroImageActions({ uri, source, compact = false }: { uri?: string; source?: number; compact?: boolean }) {
  const { t } = useTranslation();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const run = async (action: 'save' | 'share') => {
    if (lock.current || (action === 'save' && saved)) return;
    tapHaptic();
    lock.current = true; setBusy(true);
    let temporary: string | undefined;
    try {
      let local = uri;
      if (!local && source != null) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Asset } = require('expo-asset') as typeof import('expo-asset');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { manipulateAsync, SaveFormat } = require('expo-image-manipulator') as typeof import('expo-image-manipulator');
        const asset = Asset.fromModule(source);
        await asset.downloadAsync();
        const converted = await manipulateAsync(asset.localUri ?? asset.uri, [], { format: SaveFormat.PNG, compress: 1 });
        local = converted.uri; temporary = converted.uri;
      }
      if (!local) throw new Error('missing_image');
      if (action === 'save') {
        // Load native actions only on interaction so the preview can still open before a native rebuild.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const media = require('expo-media-library/legacy') as typeof import('expo-media-library/legacy');
        if (Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) < 29)) {
          const permission = await media.requestPermissionsAsync(true);
          if (!permission.granted) {
            Alert.alert(t('comicDay.export.permission'), undefined, [{ text: t('common.cancel'), style: 'cancel' }, { text: t('comicDay.export.settings'), onPress: () => { tapHaptic(); void Linking.openSettings(); } }]);
            return;
          }
        }
        await media.saveToLibraryAsync(local);
        setSaved(true);
        Alert.alert(t('comicDay.export.saved'));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const sharing = require('expo-sharing') as typeof import('expo-sharing');
        if (!await sharing.isAvailableAsync()) { Alert.alert(t('comicDay.export.unavailable')); return; }
        await sharing.shareAsync(local, { mimeType: 'image/png', UTI: 'public.png' });
      }
    } catch { Alert.alert(t('comicDay.export.failed')); }
    finally {
      if (temporary) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const fs = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
        await fs.deleteAsync(temporary, { idempotent: true }).catch(() => undefined);
      }
      lock.current = false; setBusy(false); }
  };
  return <View style={[s.row, compact && s.compactRow]}>
    {(['save', 'share'] as const).map(action => <Pressable key={action} testID={`hero-image-${action}`} accessibilityRole="button" accessibilityLabel={t(action === 'save' && saved ? 'comicDay.export.saved' : `comicDay.export.${action}`)} disabled={busy || (action === 'save' && saved)} accessibilityState={{ disabled: busy || (action === 'save' && saved), busy }} onPress={() => { void run(action); }} style={[s.button, compact && s.compactButton, (busy || (action === 'save' && saved)) && { opacity: 0.45 }]}>
      <Svg width={compact ? 19 : 26} height={compact ? 19 : 26} viewBox="0 0 28 28" accessible={false}>
        <Path d={action === 'share' ? 'M14 18Q14.3 10 14 3M9 8L14 3 19 8M8 12L5 12 5.5 25 23 24.5 23 12 20 12M6 24L11 24.4' : saved ? 'M5 14L11 21Q17 12 24 6M5.5 14L10.5 20' : 'M14 3Q13.8 11 14 19M8 13L14 19 20 13M4 19L4.5 25 24 24.5 24 19M5 25.5L10 25.3'} stroke="#343B32" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Pressable>)}
  </View>;
}
const s = StyleSheet.create({ compactRow: { gap: 2 }, compactButton: { width: 32, height: 28 }, row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }, button: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' } });
