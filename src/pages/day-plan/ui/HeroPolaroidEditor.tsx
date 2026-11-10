import { useTranslation } from '@shared/lib/i18n';
import { POLAROID_PHOTO_WIDTH, getPolaroidPrintLayout } from '../lib/heroPolaroidFraming';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { HeroFilmDateStamp } from './HeroFilmDateStamp';
import { HeroCardEditor, type HeroCardText } from './HeroCardCaption';
import { HeroPolaroidSurface } from './HeroPolaroidSurface';
import { HeroPolaroidDatePicker } from './HeroPolaroidDatePicker';
import { HeroPolaroidToolbox } from './HeroPolaroidToolbox';
import Svg, { Path } from 'react-native-svg';
import { Image as PreviewImage } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Animated, Easing, Text, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';
import { ThemedText } from '@shared/ui/themed-text';
import { useSubscriptionStore, selectIsPro } from '@features/subscriptions/model/subscriptionStore';
import { ProPreviewPage } from '../../settings/ui/ProPreviewPage';
import { resolveAppFontFamily, useEffectiveAppFontId } from '@shared/lib/ui-font';
import { formatHeroPolaroidDate, type HeroPolaroidContent } from './HeroPolaroidExport';
import { hasProPolaroidEffects, adjustmentKeys } from './HeroPolaroidEffects';
import { HeroPolaroidProcessor } from './HeroPolaroidProcessor';
export type PolaroidDraft = Omit<HeroPolaroidContent, 'uri'>;
export function HeroPolaroidEditor({ embedded = false, uri, source, initial, busy, children, onExport, onClose, onSaveText, onDelete }: {
  imageSize?: { width: number; height: number }; onDelete?: () => void; embedded?: boolean; onSaveText?: (text: HeroCardText) => void; uri?: string; source?: number; initial: PolaroidDraft; busy: boolean; children?: ReactNode;
  onExport: (action: 'save' | 'share' | 'download', draft: PolaroidDraft) => Promise<void>; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(initial);
  const [back, setBack] = useState(false);
  const [writing, setWriting] = useState(false);
  const [textDraft, setTextDraft] = useState<HeroCardText>({ title: initial.title, memo: initial.memo ?? '', fontId: initial.fontId, pen: initial.pen });
  const turn = useRef(new Animated.Value(0)).current;
  const flip = () => {
    const next = !back;
    setBack(next);
    Animated.timing(turn, { toValue: next ? 1 : 0, duration: 420, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  };
  const edit = () => { setTextDraft({ title: draft.title, memo: draft.memo ?? '', fontId: draft.fontId, pen: draft.pen }); setWriting(true); };

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallBusy, setPaywallBusy] = useState(false);
  const paywallResult = useRef<((result: 'purchased' | 'restored' | 'cancelled') => void) | null>(null);
  const finishPaywall = (result: 'purchased' | 'restored' | 'cancelled') => {
    setPaywallOpen(false);
    paywallResult.current?.(result);
    paywallResult.current = null;
  };
  useEffect(() => () => { paywallResult.current?.('cancelled'); paywallResult.current = null; }, []);
  const effects = useMemo(() => Object.fromEntries([['film', draft.film ?? 'original'], ...adjustmentKeys.map(key => [key, draft[key] ?? 0])]), [draft.film, draft.brightness, draft.contrast, draft.saturation, draft.highlights, draft.shadows, draft.temperature, draft.fade, draft.grain]);
  const effectKey = JSON.stringify(effects);
  const [rendered, setRendered] = useState<{ key: string; uri: string }>();
  const [failedKey, setFailedKey] = useState<string>();
  const needsProcessing = hasProPolaroidEffects(draft) && !!(uri || source != null);
  const processing = needsProcessing && rendered?.key !== effectKey;
  const renderFailed = useCallback(() => setFailedKey(effectKey), [effectKey]);
  const renderComplete = useCallback((result: string, key = effectKey) => setRendered({ key, uri: result }), [effectKey]);
  const previewUri = needsProcessing ? rendered?.uri ?? uri : uri;
  const [checking, setChecking] = useState(false);
  const lock = useRef(false);
  const [imageFailed, setImageFailed] = useState(false);
  const isPro = useSubscriptionStore(selectIsPro);
  const globalFont = useEffectiveAppFontId();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const photoWidth = POLAROID_PHOTO_WIDTH;
  const { photoHeight, printHeight, captionHeight } = getPolaroidPrintLayout(draft.photoFit);
  const printScale = Math.max(0, Math.min((stage.width - 40) / 360, Math.max(0, stage.height * 0.9 - 24) / printHeight));
  const paper = '#F9F9F6', pen = draft.pen ?? '#292D28';
  const patch = useCallback((next: Partial<PolaroidDraft>) => setDraft(current => ({ ...current, ...next })), []);
  const toggleText = useCallback(() => setDraft(current => ({ ...current, showText: current.showText === false })), []);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const toggleDate = useCallback(() => setDatePickerOpen(true), []);
  const exportImage = async (action: 'save' | 'share' | 'download') => {
    if (lock.current || busy || processing) return;
    lock.current = true; setChecking(true);
    try {
      if (FEATURE_FLAGS.proSubscriptions && FEATURE_FLAGS.proPolaroidExport && hasProPolaroidEffects(draft)) {
        const store = useSubscriptionStore.getState();
        if (!store.isHydrated) await store.hydrate();
        await useSubscriptionStore.getState().refreshCustomerInfo();
        if (!selectIsPro(useSubscriptionStore.getState())) {
          const result = await new Promise<'purchased' | 'restored' | 'cancelled'>(resolve => { paywallResult.current = resolve; setPaywallOpen(true); });
          if (result === 'cancelled') return;
          await useSubscriptionStore.getState().refreshCustomerInfo();
          if (!selectIsPro(useSubscriptionStore.getState())) {
            Alert.alert('Daylight Pro', t('polaroid.editor.film_filters_require_pro_check_your_subscription_or_save_a_basic_polaroid'));
            return;
          }
        }
      }
      await onExport(action, { ...draft, paper: undefined, ...(needsProcessing ? { processedUri: rendered?.uri } : {}) });
    } catch { Alert.alert(t('polaroid.editor.export'), t('polaroid.editor.could_not_check_your_subscription_please_try_again')); } finally { lock.current = false; setChecking(false); }
  };

  const content = <>
    <View testID="hero-polaroid-editor" style={{ flex: 1, paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: paper }}>
      <Animated.View testID="polaroid-editor-content" pointerEvents="auto" style={{ flex: 1, width: '100%', backgroundColor: paper }}>
          <View style={{ flex: 1, minHeight: 0, flexDirection: 'row' }}>
          <View testID="polaroid-preview-stage" onLayout={e => {
            const width = Math.round(e.nativeEvent.layout.width), height = Math.round(e.nativeEvent.layout.height);
            setStage(previous => previous.width === width && previous.height === height ? previous : { width, height });
          }} style={{ flex: 1, minHeight: 0, backgroundColor: paper, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <View style={{ width: 360 * printScale, height: printHeight * printScale }}>
            <Animated.View testID="polaroid-preview-print" style={{ backfaceVisibility: 'hidden', position: 'absolute', left: (360 * printScale - 360) / 2, top: (printHeight * printScale - printHeight) / 2, transform: [{ scale: printScale }, { perspective: 1200 }, { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }], width: 360, height: printHeight, padding: 18, paddingTop: 24, backgroundColor: paper, shadowColor: '#38352E', shadowOpacity: 0.18, shadowRadius: 9, shadowOffset: { width: 2, height: 6 }, elevation: 4 }}>
              {/* Keep one native image view alive so source updates retain the previous frame while decoding. */}
              <HeroPolaroidSurface />
              <View style={{ width: photoWidth, height: photoHeight }}><PreviewImage testID="polaroid-live-preview" source={previewUri ? { uri: previewUri } : source} contentFit={draft.photoFit ?? 'cover'} contentPosition="center" transition={0} cachePolicy="memory-disk" onError={() => { setImageFailed(true); }} useAppleWebpCodec={false} style={{ width: photoWidth, height: photoHeight, backgroundColor: paper }} />{draft.showDate !== false ? <View pointerEvents="none" style={{ position: 'absolute', width: photoWidth, height: photoHeight, left: 0, top: 0 }}><HeroFilmDateStamp testID="polaroid-preview-date" date={draft.date || formatHeroPolaroidDate()} /></View> : null}</View>
              <Pressable testID="polaroid-caption-write" accessibilityRole="button" accessibilityLabel={t('polaroid.editor.write')} onPress={edit} style={{ height: captionHeight, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8, gap: 4 }}>
                {draft.showText !== false ? <Text testID="polaroid-preview-title" numberOfLines={2} allowFontScaling={false} style={{ flexShrink: 1, fontFamily: resolveAppFontFamily(draft.fontId ?? globalFont), color: pen, fontSize: 22 }}>{draft.title.trim() || t('polaroid.editor.tell_your_story_today')}</Text> : null}
              </Pressable>
            </Animated.View>
            <Animated.View pointerEvents={back ? 'auto' : 'none'} style={{ position: 'absolute', left: (360 * printScale - 360) / 2, top: (printHeight * printScale - printHeight) / 2, width: 360, height: printHeight, backfaceVisibility: 'hidden', transform: [{ scale: printScale }, { perspective: 1200 }, { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] }) }], padding: 24, backgroundColor: paper }}>
              <HeroPolaroidSurface />
              <ScrollView><Pressable testID="polaroid-back-write" accessibilityRole="button" accessibilityLabel={t('polaroid.editor.write')} onPress={edit} style={{ minHeight: printHeight - 48 }}>
                <ThemedText fontId={draft.fontId} style={{ color: pen, fontSize: 24, marginBottom: 20 }}>{draft.title}</ThemedText>
                <ThemedText fontId={draft.fontId} style={{ color: pen, fontSize: 18, lineHeight: 30 }}>{draft.memo || t('polaroid.editor.tell_your_story_today')}</ThemedText>
              </Pressable></ScrollView>
            </Animated.View>
            </View>
            {onDelete ? <Pressable testID="polaroid-delete" accessibilityRole="button" accessibilityLabel={t('polaroid.editor.delete_photo')} disabled={busy || checking} onPress={onDelete} style={{ position: 'absolute', right: 64, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: pen, fontSize: 17 }}>{t('polaroid.editor.delete')}</ThemedText></Pressable> : null}
            <Pressable testID="polaroid-flip" accessibilityRole="button" accessibilityLabel={back ? t('polaroid.editor.view_photo') : t('polaroid.editor.view_story')} onPress={flip} style={{ position: 'absolute', right: 16, top: 4, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <ThemedText style={{ color: pen, fontSize: 17 }}>{t('polaroid.editor.flip')}</ThemedText>
            </Pressable>
          </View>
          </View>
        <HeroPolaroidToolbox photoFit={draft.photoFit ?? 'cover'} onChangePhotoFit={photoFit => patch({ photoFit })} showText={draft.showText !== false} onToggleText={toggleText} showDate={draft.showDate !== false} onToggleDate={toggleDate} effects={effects} onChange={patch} disabled={busy || checking} />
        {processing && failedKey === effectKey ? <Pressable onPress={() => setFailedKey(undefined)} style={{ minHeight: 32, justifyContent: 'center' }}><ThemedText style={{ fontSize: 12, textAlign: 'center' }}>{t('polaroid.editor.adjustment_failed_tap_to_retry')}</ThemedText></Pressable> : null}
        {needsProcessing && failedKey !== effectKey ? <HeroPolaroidProcessor uri={uri} source={source} effects={effects} onResult={renderComplete} onError={renderFailed} /> : null}
        <View style={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: Math.max(4, insets.bottom), flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#080808' }}>
          <ExportButton icon="share" label={t('polaroid.editor.share')} disabled={busy || checking || processing} dimmed={busy || checking} onPress={() => { void exportImage('share'); }} testID="polaroid-editor-share" />
          <ExportButton icon="download" label={t('polaroid.editor.download_to_photos')} disabled={busy || checking || processing} dimmed={busy || checking} onPress={() => { void exportImage('download'); }} testID="polaroid-editor-download" />
          <ExportButton icon="save" label={checking || busy ? t('polaroid.editor.preparing') : FEATURE_FLAGS.proSubscriptions && FEATURE_FLAGS.proPolaroidExport && !isPro && hasProPolaroidEffects(draft) ? t('polaroid.editor.apply_with_pro') : t('polaroid.editor.apply_to_photo')} disabled={busy || checking || processing} dimmed={busy || checking} onPress={() => { void exportImage('save'); }} testID="polaroid-editor-save" />
          <Pressable accessibilityRole="button" accessibilityLabel={t('polaroid.editor.close')} disabled={busy || checking} onPress={onClose} style={{ marginLeft: 'auto', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: busy || checking ? 0.5 : 1 }}><ThemedText style={{ color: '#F3F2ED' }}>{t('polaroid.editor.close')}</ThemedText></Pressable>
        </View>
        {writing ? <HeroCardEditor number={1} ink={pen} muted="#73796C" paper={draft.paper ?? paper} draft={textDraft} onChange={setTextDraft} onCancel={() => setWriting(false)} onSave={() => { if (!textDraft.title.trim()) return; const text = { ...textDraft, title: textDraft.title.trim(), memo: textDraft.memo.trim() }; patch(text); onSaveText?.(text); setWriting(false); }} /> : null}
        {datePickerOpen ? <HeroPolaroidDatePicker date={draft.date} showDate={draft.showDate !== false} onSelect={date => { patch({ date, showDate: true }); setDatePickerOpen(false); }} onHide={() => { patch({ showDate: false }); setDatePickerOpen(false); }} onClose={() => setDatePickerOpen(false)} /> : null}
        {children}
        {paywallOpen ? <AppModal visible presentationStyle="fullScreen" animationType="slide" onRequestClose={() => { if (!paywallBusy) finishPaywall('cancelled'); }}>
          <ProPreviewPage onBusyChange={setPaywallBusy} onClose={() => finishPaywall('cancelled')} onActivated={finishPaywall} />
        </AppModal> : null}
      </Animated.View>
      {imageFailed ? <View style={{ position: 'absolute', top: insets.top + 52, left: 24, right: 24 }}><ThemedText style={{ color: '#934C3C', textAlign: 'center' }}>{t('polaroid.editor.could_not_load_the_photo_close_and_reopen_it')}</ThemedText></View> : null}
    </View>
  </>;
  return embedded ? content : <AppModal visible presentationStyle="fullScreen" animationType="slide" onRequestClose={() => { if (!busy && !checking) onClose(); }}>{content}</AppModal>;
}

function ExportButton({ icon, label, disabled, dimmed, onPress, testID }: { icon: 'share' | 'save' | 'download'; label: string; disabled: boolean; dimmed: boolean; onPress: () => void; testID: string }) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy: disabled }} disabled={disabled} onPress={onPress} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: dimmed ? 0.5 : 1 }}>
    <Svg width={30} height={30} viewBox={icon === 'save' ? '0 0 32 32' : '0 0 28 28'} accessible={false}>
      {icon === 'download' ? <Path d="M14 3v16m-6-6 6 6 6-6M4 19v7h20v-7" stroke="#F3F2ED" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" fill="none" /> : icon === 'save' ? <>
        <Path d="M5.1 9.2 3 9.3l.1-5.4q12.7-.4 25.6 0l.2 5.2-2.1.1" stroke="#F3F2ED" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M7.2 7.1 6 28.7l20-.1-1.3-21.5ZM10.2 10l-.7 12.8 13 .1-.8-12.9M16 10.7v8m-3-3 3 3.2 3.1-3.3" stroke="#F3F2ED" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="m14.1 25.9 3.9-.1" stroke="#F3F2ED" strokeWidth={0.9} strokeLinecap="round" fill="none" />
      </> : <Path d="M14 18Q14.3 10 14 3M9 8L14 3 19 8M8 12L5 12 5.5 25 23 24.5 23 12 20 12M6 24L11 24.4" stroke="#F3F2ED" strokeWidth={1.1} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    </Svg>
  </Pressable>;
}
