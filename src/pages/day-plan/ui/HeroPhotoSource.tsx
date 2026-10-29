import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { requestHeroPhotoUseNotice } from '../lib/heroPhotoUseNotice';

export type HeroImageMode = 'existing' | 'face' | 'photo';
export function HeroPhotoIcon({ camera = false }: { camera?: boolean }) {
  const ink = '#252822';
  return <Svg width={25} height={25} viewBox="0 0 32 32" accessible={false}>
    {camera ? <>
      <Path d="M4 9.5Q3 9.5 3.2 12L3.5 26Q13 26.7 28 25.8L28.3 11Q28.2 9.3 26.5 9.2L22 9 20.6 5.5 12 5.8 10.5 9Z" fill="none" stroke={ink} strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 8.7L13.1 6.9 19.6 6.8 20.4 8.9M5.4 11.5L8.5 11.4M4.2 23.6L4.1 14M25 25L10 25.5M25.4 6.1L27 3.6M28.1 7.3L30.2 6.8" fill="none" stroke={ink} strokeWidth={0.65} strokeLinecap="round" />
      <Path d="M22.2 17.6C22 10.8 11.3 10.5 10.7 17.7 10.1 25.1 22.7 25.1 22.2 17.6Z" fill="none" stroke={ink} strokeWidth={1.3} />
      <Path d="M19.7 17.6C19.9 13.5 13 13.5 13 17.9 12.7 22.5 20 22.3 19.7 17.6Z" fill="none" stroke={ink} strokeWidth={0.85} />
      <Path d="M14.1 16.6Q14.4 15.4 15.7 15.2" fill="none" stroke={ink} strokeWidth={0.6} strokeLinecap="round" />
    </> : <>
      <Path d="M7 7L27.5 5.8 29.1 25.6 11 29.1 10.4 26.8M4 5.8L23.6 2.8 27 25 7.6 28.2Z" fill="none" stroke={ink} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.8 8L21.6 5.9 23.4 20.4 9 22.8Z" fill="none" stroke={ink} strokeWidth={0.85} strokeLinejoin="round" />
      <Path d="M9 21.5L12.9 14.8 17.2 18 19.5 14.4 23 20M11.5 10.4C11 8.1 8.2 9.3 8.9 11.1 9.6 12.8 12 12.1 11.5 10.4Z" fill="none" stroke={ink} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M10.8 20.8L13.2 17M12.4 20.6L14 18.5M19.1 19.7L20.1 17.6M5.4 9L7.4 24.5M9.8 26.8L23.3 24.7M25.7 2.8L27.3 1M28 4.1L30.1 3.8" fill="none" stroke={ink} strokeWidth={0.55} strokeLinecap="round" />
    </>}
  </Svg>;
}

/** Selection is local only. Never upload a photo before a generation service is configured. */
export function HeroPhotoSource({ mode, uri, onChange, selectionLimit = 1, onSelect, actionsOnly = false, compactPreview = false, previewHeight = 145 }: { mode: 'face' | 'photo'; uri: string | null; onChange: (uri: string) => void; selectionLimit?: number; onSelect?: (uris: string[]) => void; actionsOnly?: boolean; compactPreview?: boolean; previewHeight?: number }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const choose = async (camera: boolean) => {
    if (busy) return;
    tapHaptic();
    setBusy(true);
    try {
      const acknowledged = await requestHeroPhotoUseNotice({
        title: t('comicDay.photo.notice.title'),
        message: t('comicDay.photo.notice.message'),
        cancel: t('common.cancel'),
        continue: t('comicDay.photo.notice.continue'),
      });
      if (!acknowledged) return;
      // Load only on interaction so an older native build can still open the picker.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const picker = require('expo-image-picker') as typeof import('expo-image-picker');
      if (camera) {
        const permission = await picker.requestCameraPermissionsAsync();
        if (!permission.granted) { Alert.alert(t('comicDay.photo.permission')); return; }
      }
      const result = camera
        ? await picker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false })
        : await picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false, allowsMultipleSelection: selectionLimit > 1, selectionLimit });
      if (!result.canceled && result.assets[0]?.uri) {
        onChange(result.assets[0].uri);
        onSelect?.(result.assets.map(asset => asset.uri));
      }
    } catch {
      Alert.alert(t('comicDay.photo.pickError'));
    } finally { setBusy(false); }
  };
  const face = mode === 'face';
  return <View style={[s.root, face && s.compact, compactPreview && { padding: 0, gap: 8 }]}>
    {actionsOnly ? null : face ? <View style={s.faceRow}>
      <View style={s.avatar}>{uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} /> : <HeroPhotoIcon />}</View>
      <View style={{ flex: 1 }}><ThemedText style={s.label}>{t('comicDay.photo.facePhoto')}</ThemedText><ThemedText style={s.hint}>{t('comicDay.photo.faceHint')}</ThemedText></View>
    </View> : <Pressable testID="hero-photo-preview" accessibilityRole="button" accessibilityLabel={t('comicDay.photo.choose')} disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => void choose(false)} style={[s.preview, compactPreview && [s.compactPreview, { height: previewHeight, maxHeight: previewHeight }]]}>
      <HanddrawnFrame color="#92928D" />
      {uri ? <Image accessibilityLabel={t('comicDay.photo.original')} source={{ uri }} style={s.image} resizeMode="contain" /> : <View style={s.placeholder}><HeroPhotoIcon /><ThemedText style={s.hint}>{t('comicDay.photo.photoHint')}</ThemedText></View>}
      {uri ? <ThemedText style={s.original}>{t('comicDay.photo.original')}</ThemedText> : null}
    </Pressable>}
    <View style={s.actions}>
      {[false, true].map(camera => <Pressable key={String(camera)} accessibilityRole="button" accessibilityLabel={t(camera ? 'comicDay.photo.camera' : 'comicDay.photo.choose')} disabled={busy} accessibilityState={{ disabled: busy }} onPress={() => void choose(camera)} style={[s.action, busy && { opacity: 0.45 }]}>
        <HanddrawnFrame color="#777872" /><HeroPhotoIcon camera={camera} /><ThemedText style={s.label}>{t(camera ? 'comicDay.photo.camera' : 'comicDay.photo.choose')}</ThemedText>
      </Pressable>)}
    </View>
    {!face && !actionsOnly && !compactPreview ? <ThemedText style={s.hint}>{t('comicDay.photo.photoCaption')}</ThemedText> : null}
  </View>;
}
const s = StyleSheet.create({
  root: { gap: 16, padding: 20 }, compact: { gap: 10, paddingHorizontal: 18, paddingVertical: 12 },
  faceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 }, avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 0.8, borderColor: '#92928D', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F1' },
  label: { color: '#252822', fontSize: 15, lineHeight: 22 }, hint: { color: '#73746E', fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12 }, action: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 8 },
  compactPreview: { aspectRatio: undefined, height: 145, maxHeight: 145 },
  preview: { width: '100%', aspectRatio: 1, maxHeight: 360, padding: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F1' }, image: { width: '100%', flex: 1 }, original: { color: '#70756B', fontSize: 13, paddingTop: 6 }, placeholder: { alignItems: 'center', gap: 14, padding: 24 },
});
