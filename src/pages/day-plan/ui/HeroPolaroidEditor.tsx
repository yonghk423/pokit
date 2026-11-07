import { HeroPolaroidSurface } from './HeroPolaroidSurface';
import { HeroPolaroidToolbox } from './HeroPolaroidToolbox';
import Svg, { Path } from 'react-native-svg';
import { Image as PreviewImage } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, Image, Text, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';
import { ThemedText } from '@shared/ui/themed-text';
import { useSubscriptionStore, selectIsPro } from '@features/subscriptions/model/subscriptionStore';
import { presentPaywall } from '@features/subscriptions/lib/presentPaywall';
import { resolveAppFontFamily, useEffectiveAppFontId } from '@shared/lib/ui-font';
import { formatHeroPolaroidDate, type HeroPolaroidContent } from './HeroPolaroidExport';
import { hasProPolaroidEffects, adjustmentKeys } from './HeroPolaroidEffects';
import { HeroPolaroidProcessor } from './HeroPolaroidProcessor';
export type PolaroidDraft = Omit<HeroPolaroidContent, 'uri'>;
export function HeroPolaroidEditor({ uri, source, initial, busy, children, onExport, onClose }: {
  uri?: string; source?: number; initial: PolaroidDraft; busy: boolean; children?: ReactNode;
  onExport: (action: 'save' | 'share', draft: PolaroidDraft) => Promise<void>; onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
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
  const [ratio, setRatio] = useState(() => { const asset = source != null ? Image.resolveAssetSource(source) : null; return asset?.width && asset.height ? asset.width / asset.height : 2 / 3; });
  useEffect(() => {
    let live = true;
    if (uri) Image.getSize(uri, (w, h) => { if (live && w > 0 && h > 0) setRatio(w / h); }, () => {});
    return () => { live = false; };
  }, [uri, source]);
  const isPro = useSubscriptionStore(selectIsPro);
  const globalFont = useEffectiveAppFontId();
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const safeRatio = Number.isFinite(ratio) && ratio > 0 ? Math.max(0.2, Math.min(5, ratio)) : 2 / 3;
  const photoWidth = 324;
  const photoHeight = photoWidth / safeRatio;
  const printHeight = photoHeight + 130;
  const printScale = Math.max(0, Math.min((stage.width - 32) / 360, stage.height / printHeight));
  const paper = '#F9F9F6', pen = draft.pen ?? '#292D28';
  const patch = (next: Partial<PolaroidDraft>) => setDraft(current => ({ ...current, ...next }));
  const exportImage = async (action: 'save' | 'share') => {
    if (lock.current || busy || processing) return;
    lock.current = true; setChecking(true);
    try {
      if (hasProPolaroidEffects(draft)) {
        const store = useSubscriptionStore.getState();
        if (!store.isHydrated) await store.hydrate();
        await useSubscriptionStore.getState().refreshCustomerInfo();
        if (!selectIsPro(useSubscriptionStore.getState())) {
          const result = await presentPaywall();
          if (result === 'cancelled') return;
          await useSubscriptionStore.getState().refreshCustomerInfo();
          if (!selectIsPro(useSubscriptionStore.getState())) {
            Alert.alert('yourday pro', '필름 필터는 Pro 전용 기능이에요. 구독 상태를 확인하거나 기본 폴라로이드로 저장해주세요.');
            return;
          }
        }
      }
      await onExport(action, { ...draft, paper: undefined, ...(needsProcessing ? { processedUri: rendered?.uri } : {}) });
    } catch { Alert.alert('내보내기', '구독 상태를 확인하지 못했어요. 잠시 후 다시 시도해주세요.'); } finally { lock.current = false; setChecking(false); }
  };

  return <AppModal visible presentationStyle="fullScreen" animationType="slide" onRequestClose={() => { if (!busy && !checking) onClose(); }}>
    <View testID="hero-polaroid-editor" style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: paper }}>
      <View style={{ flex: 1, width: '100%', backgroundColor: paper }}>
          <View testID="polaroid-preview-stage" onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            setStage(previous => previous.width === width && previous.height === height ? previous : { width, height });
          }} style={{ flex: 1, minHeight: 0, backgroundColor: paper, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <View style={{ width: 360 * printScale, height: printHeight * printScale }}>
            <View testID="polaroid-preview-print" style={{ position: 'absolute', left: (360 * printScale - 360) / 2, top: (printHeight * printScale - printHeight) / 2, transform: [{ scale: printScale }], width: 360, height: printHeight, padding: 18, paddingTop: 24, backgroundColor: paper, shadowColor: '#38352E', shadowOpacity: 0.18, shadowRadius: 9, shadowOffset: { width: 2, height: 6 }, elevation: 4 }}>
              {/* Keep one native image view alive so source updates retain the previous frame while decoding. */}
              <HeroPolaroidSurface />
              <View style={{ width: photoWidth, height: photoHeight }}><PreviewImage testID="polaroid-live-preview" source={previewUri ? { uri: previewUri } : source} contentFit="contain" transition={0} cachePolicy="none" useAppleWebpCodec={false} style={{ width: photoWidth, height: photoHeight, backgroundColor: paper }} /></View>
              <View style={{ height: 88, paddingHorizontal: 8, paddingTop: 12, paddingBottom: 8, gap: 4 }}>
                {draft.showText !== false && draft.title.trim() ? <Text testID="polaroid-preview-title" numberOfLines={2} allowFontScaling={false} style={{ flexShrink: 1, fontFamily: resolveAppFontFamily(draft.fontId ?? globalFont), color: pen, fontSize: 22 }}>{draft.title.trim()}</Text> : null}
                {draft.showDate !== false ? <Text testID="polaroid-preview-date" allowFontScaling={false} style={{ fontFamily: resolveAppFontFamily(draft.fontId ?? globalFont), color: pen, fontSize: 15, lineHeight: 22, marginTop: 'auto', textAlign: 'right' }}>{draft.date || formatHeroPolaroidDate()}</Text> : null}
              </View>
            </View>
            </View>
          </View>
        <HeroPolaroidToolbox showText={draft.showText !== false} onToggleText={() => patch({ showText: draft.showText === false })} showDate={draft.showDate !== false} onToggleDate={() => patch({ showDate: draft.showDate === false })} effects={draft} onChange={patch} disabled={busy || checking} />
        {processing && failedKey === effectKey ? <Pressable onPress={() => setFailedKey(undefined)} style={{ minHeight: 32, justifyContent: 'center' }}><ThemedText style={{ fontSize: 12, textAlign: 'center' }}>보정 실패 · 눌러서 다시 시도</ThemedText></Pressable> : null}
        {(uri || source != null) && failedKey !== effectKey ? <HeroPolaroidProcessor uri={uri} source={source} effects={effects} onResult={renderComplete} onError={renderFailed} /> : null}
        <View style={{ paddingHorizontal: 18, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: paper }}>
          <ExportButton icon="share" label="공유" disabled={busy || checking || processing} dimmed={busy || checking} onPress={() => { void exportImage('share'); }} testID="polaroid-editor-share" />
          <ExportButton icon="save" label={checking || busy ? '준비 중…' : !isPro && hasProPolaroidEffects(draft) ? 'Pro로 저장' : '사진 저장'} disabled={busy || checking || processing} dimmed={busy || checking} onPress={() => { void exportImage('save'); }} testID="polaroid-editor-save" />
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" disabled={busy || checking} onPress={onClose} style={{ marginLeft: 'auto', minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: busy || checking ? 0.5 : 1 }}><ThemedText style={{ color: '#343B32' }}>닫기</ThemedText></Pressable>
        </View>
        {children}
      </View>
    </View>
  </AppModal>;
}

function ExportButton({ icon, label, disabled, dimmed, onPress, testID }: { icon: 'share' | 'save'; label: string; disabled: boolean; dimmed: boolean; onPress: () => void; testID: string }) {
  return <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, busy: disabled }} disabled={disabled} onPress={onPress} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center', opacity: dimmed ? 0.5 : 1 }}>
    <Svg width={30} height={30} viewBox={icon === 'save' ? '0 0 32 32' : '0 0 28 28'} accessible={false}>
      {icon === 'save' ? <>
        <Path d="M5.1 9.2 3 9.3l.1-5.4q12.7-.4 25.6 0l.2 5.2-2.1.1" stroke="#343B32" strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="M7.2 7.1 6 28.7l20-.1-1.3-21.5ZM10.2 10l-.7 12.8 13 .1-.8-12.9M16 10.7v8m-3-3 3 3.2 3.1-3.3" stroke="#343B32" strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <Path d="m14.1 25.9 3.9-.1" stroke="#343B32" strokeWidth={0.9} strokeLinecap="round" fill="none" />
      </> : <Path d="M14 18Q14.3 10 14 3M9 8L14 3 19 8M8 12L5 12 5.5 25 23 24.5 23 12 20 12M6 24L11 24.4" stroke="#343B32" strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    </Svg>
  </Pressable>;
}
