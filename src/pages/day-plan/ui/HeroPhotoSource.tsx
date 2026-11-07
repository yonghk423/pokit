import { HeroPhotoPreview, HeroPhotoImporting } from './HeroPhotoPreview';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { PenFrame } from '@shared/ui/pen-frame';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { requestHeroPhotoUseNotice } from '../lib/heroPhotoUseNotice';

export type HeroImageMode = 'existing' | 'face' | 'photo';
export function HeroPhotoIcon({ camera = false, portrait = false, size = 25, colored = false, soft = false }: { camera?: boolean; portrait?: boolean; size?: number; colored?: boolean; soft?: boolean }) {
  const ink = '#252822';
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}>
    {camera ? <>
      {colored ? <><Path d="M4 9.5 10.5 9 12 5.8 20.6 5.5 22 9 26.5 9.2q2 0 1.8 2l-.3 14.6q-14 .9-24.5.2L3.2 12q-.2-2.5.8-2.5Z" fill="#F8F7EF" /><Path d="m3.3 13 24.9-.3-.2 13.1q-14 .9-24.5.2Z" fill={soft ? '#CBCDC8' : '#315E63'} /><Path d="M12 6h8.5v2.5H12Z" fill={soft ? '#579A97' : '#656A67'} /></> : null}
      <Path d="M4 9.5Q3 9.5 3.2 12L3.5 26Q13 26.7 28 25.8L28.3 11Q28.2 9.3 26.5 9.2L22 9 20.6 5.5 12 5.8 10.5 9Z" fill="none" stroke={ink} strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M12 8.7L13.1 6.9 19.6 6.8 20.4 8.9M5.4 11.5L8.5 11.4M4.2 23.6L4.1 14M25 25L10 25.5M25.4 6.1L27 3.6M28.1 7.3L30.2 6.8" fill="none" stroke={ink} strokeWidth={0.65} strokeLinecap="round" />
      <Path d="M22.2 17.6C22 10.8 11.3 10.5 10.7 17.7 10.1 25.1 22.7 25.1 22.2 17.6Z" fill={colored ? '#777D78' : 'none'} stroke={ink} strokeWidth={1.3} />
      <Path d="M19.7 17.6C19.9 13.5 13 13.5 13 17.9 12.7 22.5 20 22.3 19.7 17.6Z" fill={colored ? '#353B38' : 'none'} stroke={ink} strokeWidth={0.85} />
      <Path d="M14.1 16.6Q14.4 15.4 15.7 15.2" fill="none" stroke={colored ? '#FAFAF4' : ink} strokeWidth={0.6} strokeLinecap="round" />
    </> : <>
      {colored ? <><Path d="M7 7 27.5 5.8 29.1 25.6 11 29.1 10.4 26.8Z" fill={soft ? '#8DBEB5' : '#315E63'} /><Path d="M4 5.8 23.6 2.8 27 25 7.6 28.2Z" fill="#F8F7EF" /></> : null}
      <Path d="M7 7L27.5 5.8 29.1 25.6 11 29.1 10.4 26.8M4 5.8L23.6 2.8 27 25 7.6 28.2Z" fill="none" stroke={ink} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6.8 8L21.6 5.9 23.4 20.4 9 22.8Z" fill={colored ? '#FFFFFF' : 'none'} stroke={ink} strokeWidth={0.85} strokeLinejoin="round" />
      <Path d={portrait ? "M10.5 18.5l.5 2 2.5-.4m6-1 2.5-.4-.4-2.5" : "M10.5 18.5l.5 2 2.5-.4m6-1 2.5-.4-.4-2.5"} fill="none" stroke={colored && portrait ? '#315E63' : ink} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
      <Path d={portrait ? "M5.4 9L7.4 24.5M9.8 26.8L23.3 24.7" : "M5.4 9L7.4 24.5M9.8 26.8L23.3 24.7"} fill="none" stroke={ink} strokeWidth={0.55} strokeLinecap="round" />
    </>}
  </Svg>;
}

/** Selection is local only. Never upload a photo before a generation service is configured. */
export function HeroPhotoSource({ variant = 'standard', mode, uri, onChange, selectionLimit = 1, onSelect, actionsOnly = false, compactPreview = false, previewHeight = 145, selectedUris = [], onOpenSaved }: { variant?: 'standard' | 'toolbar' | 'strip'; onOpenSaved?: () => void; mode: 'face' | 'photo'; uri: string | null; onChange: (uri: string) => void; selectionLimit?: number; onSelect?: (uris: string[]) => void; actionsOnly?: boolean; compactPreview?: boolean; previewHeight?: number; selectedUris?: string[] }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [openingCamera, setOpeningCamera] = useState(false);
  const choose = async (camera: boolean) => {
    if (busyRef.current || selectionLimit <= 0) return;
    busyRef.current = true;
    setOpeningCamera(camera);
    tapHaptic();
    setBusy(true);
    try {
      // Paint the pressed/loading state before native picker presentation begins.
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
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
        : await picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false, allowsMultipleSelection: selectionLimit > 1, selectionLimit: Math.max(1, selectionLimit) });
      if (!result.canceled && result.assets[0]?.uri) {
        onChange(result.assets[0].uri);
        onSelect?.(result.assets.slice(0, Math.max(1, selectionLimit)).map(asset => asset.uri));
      }
    } catch {
      Alert.alert(t('comicDay.photo.pickError'));
    } finally { busyRef.current = false; setBusy(false); }
  };
  const face = mode === 'face';
  const colorfulActions = face && actionsOnly && variant === 'standard';
  const previews = selectedUris.length ? selectedUris.slice(0, 3) : uri ? [uri] : [];
  return <View style={[s.root, face && s.compact, compactPreview && { padding: 0, gap: 8 }, variant !== 'standard' && { padding: 0, gap: 0 }]}>
    {actionsOnly || variant === 'toolbar' ? null : face ? <View style={s.faceRow}>
      <View style={s.avatar}>{uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} /> : <HeroPhotoIcon />}</View>
      <View style={{ flex: 1 }}><ThemedText style={s.label}>{t('comicDay.photo.facePhoto')}</ThemedText><ThemedText style={s.hint}>{t('comicDay.photo.faceHint')}</ThemedText></View>
    </View> : <Pressable testID="hero-photo-preview" accessibilityRole="button" accessibilityLabel={t('comicDay.photo.choose')} disabled={busy || selectionLimit <= 0} accessibilityState={{ disabled: busy || selectionLimit <= 0 }} onPress={() => choose(false)} style={[s.preview, compactPreview && [s.compactPreview, { height: previewHeight, maxHeight: previewHeight }], variant === 'strip' && { height: previewHeight, maxHeight: previewHeight, aspectRatio: undefined, backgroundColor: 'transparent', padding: 0 }]}>
      <PenFrame color="#252822" />
      {previews.length ? <View style={[s.previewInset, variant === 'strip' && { top: 6, bottom: 6, left: 6, right: 6 }]}><View testID="hero-source-photo-row" style={s.previewRow}>{previews.map((photo, index) => <HeroPhotoPreview key={`${photo}-${index}`} uri={photo} resizeMode="contain" style={s.previewPhoto} />)}</View></View> : <View style={s.placeholder}><HeroPhotoIcon colored={variant === 'strip'} portrait={variant === 'strip'} size={variant === 'strip' ? 42 : 25} />{variant !== 'strip' ? <ThemedText style={s.hint}>{t('comicDay.photo.photoHint')}</ThemedText> : null}</View>}
      {busy ? <HeroPhotoImporting camera={openingCamera} /> : null}
    </Pressable>}
    {variant !== 'strip' ? <View style={s.actions}>
      {[false, true].map(camera => <Pressable key={String(camera)} accessibilityRole="button" accessibilityLabel={t(camera ? 'comicDay.photo.camera' : 'comicDay.photo.choose')} disabled={busy || selectionLimit <= 0} accessibilityState={{ disabled: busy || selectionLimit <= 0 }} onPress={() => choose(camera)} style={[variant === 'toolbar' ? s.toolbarAction : s.action, (busy || selectionLimit <= 0) && { opacity: 0.45 }]}>
        {variant === 'toolbar' ? <Svg pointerEvents="none" width={44} height={44} viewBox="0 0 44 44" style={StyleSheet.absoluteFill}><Path d="M22 2C11 1.5 2 11 2 22S11 42 22 42s20-9 20-20S33 2 22 2Z" fill="none" stroke="#343933" strokeWidth={.9} /></Svg> : <PenFrame color="#252822" straight={actionsOnly} />}{busy && openingCamera === camera ? <ActivityIndicator size="small" color="#53594F" /> : <HeroPhotoIcon colored={variant === 'toolbar' || colorfulActions} soft={colorfulActions} camera={camera} portrait={variant === 'toolbar' || colorfulActions} size={variant === 'toolbar' ? 29 : 25} />}{variant !== 'toolbar' ? <ThemedText numberOfLines={2} style={[s.label, s.actionText]}>{t(busy && openingCamera === camera ? 'comicDay.photo.opening' : camera ? 'comicDay.photo.camera' : 'comicDay.photo.choose')}</ThemedText> : null}
      </Pressable>)}
      {onOpenSaved ? <Pressable testID="hero-saved-open" accessibilityRole="button" accessibilityLabel={t('comicDay.saved.title')} onPress={() => { tapHaptic(); onOpenSaved(); }} style={s.action}>
        <PenFrame color="#252822" />
            <Svg width={23} height={23} viewBox="0 0 32 32" accessible={false}>
              <Path d="M8 5.3 26.2 4.5 27.1 23.7M5.1 8.1 23.4 7.4 24.2 27.3 5.8 28Z" fill="none" stroke="#252822" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="m8.1 11 12.8-.5.4 11.7-12.8.5Z M8.9 21.7l4-5.4 3.2 3.1 2.5-3.6 2.5 5.6M12.2 13.6c0-2-2.8-1.9-2.7.1.1 1.7 2.8 1.7 2.7-.1Z" fill="none" stroke="#252822" strokeWidth={0.85} strokeLinecap="round" strokeLinejoin="round" />
              <Path d="m10.2 25.2 9.3-.4M29 9.3l.4 16.6M7.7 29.8l13.8-.5" fill="none" stroke="#252822" strokeWidth={0.55} strokeLinecap="round" />
            </Svg>
        <ThemedText numberOfLines={2} style={[s.label, s.actionText]}>{t('comicDay.saved.title')}</ThemedText>
      </Pressable> : null}
    </View> : null}
    {variant === 'standard' && !face && !actionsOnly && !compactPreview ? <ThemedText style={s.hint}>{t('comicDay.photo.photoCaption')}</ThemedText> : null}
  </View>;
}
const s = StyleSheet.create({
  toolbarAction: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', padding: 0 },
  root: { gap: 16, padding: 20 }, compact: { gap: 10, paddingHorizontal: 18, paddingVertical: 12 },
  faceRow: { flexDirection: 'row', alignItems: 'center', gap: 14 }, avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', borderWidth: 0.8, borderColor: '#92928D', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F1' },
  label: { color: '#252822', fontSize: 15, lineHeight: 22 }, hint: { color: '#73746E', fontSize: 13, lineHeight: 20 },
  actionText: { fontSize: 15, lineHeight: 22, textAlign: 'center', alignSelf: 'stretch' },
  actions: { flexDirection: 'row', gap: 8 }, action: { flex: 1, flexBasis: 0, minWidth: 0, minHeight: 84, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 10 },
  previewInset: { position: 'absolute', top: 12, bottom: 12, left: 12, right: 12, overflow: 'hidden' },
  previewRow: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'stretch', gap: 8, overflow: 'hidden' },
  previewPhoto: { flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' },
  compactPreview: { aspectRatio: undefined, height: 145, maxHeight: 145 },
  preview: { width: '100%', aspectRatio: 1, maxHeight: 360, padding: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F6F1', overflow: 'hidden' }, placeholder: { alignItems: 'center', gap: 14, padding: 24 },
});
