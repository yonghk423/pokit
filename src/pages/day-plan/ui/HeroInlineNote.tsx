import { HeroContentSkeleton } from './HeroContentSkeleton';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { selectIsPro, useSubscriptionStore } from '@features/subscriptions/model/subscriptionStore';
import { memo, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as fs from 'expo-file-system/legacy';
import { HiMelody_400Regular } from '@expo-google-fonts/hi-melody';
import { useAppFontSizeScale, useEffectiveAppFontId } from '@shared/lib/ui-font';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { AppAlert } from '@shared/lib/app-alert';
import { inlineNoteHtml, type InlineNoteDocument } from '../lib/inlineNoteHtml';

const fontSources = {
  hiMelody: HiMelody_400Regular,
  corncorn: require('../../../../assets/fonts/ownglyph-corncorn/Ownglyph_corncorn-Rg.ttf'),
  cafe24ShiningStar: require('../../../../assets/fonts/cafe24-shiningstar/Cafe24Shiningstar-v2.0.otf'),
  cafe24Syongsyong: require('../../../../assets/fonts/cafe24-syongsyong/Cafe24Syongsyong-v2.0.otf'),
  schoolNalgae: require('../../../../assets/fonts/school-nalgae/HakgyoansimNalgaeR.ttf'),
  schoolKkokkoma: require('../../../../assets/fonts/school-kkokkoma/TTHakgyoansimKkokkomaR.ttf'),
  singleDay: require('../../../../assets/fonts/single-day/SingleDay-Regular.ttf'),
  schoolGongryongal: require('../../../../assets/fonts/school-gongryongal/HakgyoansimGongryongalR.ttf'),
};
const dataUris = new Map<number, Promise<string>>();
async function assetDataUri(source: number) {
  const cached = dataUris.get(source);
  if (cached) return cached;
  const pending = (async () => {
    const asset = await Asset.fromModule(source).downloadAsync();
    const data = await fs.readAsStringAsync(asset.localUri ?? asset.uri, { encoding: fs.EncodingType.Base64 });
    return `data:${['webp', 'png', 'jpg', 'jpeg'].includes(asset.type) ? `image/${asset.type === 'jpg' ? 'jpeg' : asset.type}` : 'font/ttf'};base64,${data}`;
  })();
  dataUris.set(source, pending);
  try { return await pending; } catch (error) { dataUris.delete(source); throw error; }
}
export type HeroInlineNoteHandle = { insertIllustration: (id: string) => void; blur: () => void; reportFocus: () => void };

export const HeroInlineNote = memo(function HeroInlineNote({ storageKey, sources, ink, placeholder, onFocusChange, onIllustrationInserted, ref }: {
  storageKey: string; sources: Record<string, number>; ink: string; placeholder: string;
  onFocusChange: (focused: boolean) => void; onIllustrationInserted: (id: string) => void; ref?: Ref<HeroInlineNoteHandle>;
}) {
  const web = useRef<WebView>(null);
  const fontId = useEffectiveAppFontId();
  const scale = useAppFontSizeScale();
  // Keep the skeleton until the document and selected font have completed layout.
  const [initialized, setInitialized] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [focused, setFocused] = useState(false);
  const [empty, setEmpty] = useState(() => {
    const saved = localStorageClient.getJson<InlineNoteDocument>(storageKey + ':inline');
    return saved ? !saved.text.trim() && !saved.icons.length : !(localStorageClient.getItemRaw(storageKey) ?? '').trim() && !(localStorageClient.getJson<string[]>(storageKey + ':illustrations') ?? []).length;
  });
  const source = useMemo(() => {
    const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    return { html: inlineNoteHtml.replace('id="editor" role=', `id="editor" data-placeholder="${escape(placeholder)}" style="color:${escape(ink)};font-size:${17 * scale}px;line-height:${25 * scale}px" role=`) };
    // Keep the document stable; subsequent styles are sent through the bridge.
  }, []);
  const callbacks = useRef({ onFocusChange, onIllustrationInserted });
  useEffect(() => { callbacks.current = { onFocusChange, onIllustrationInserted }; }, [onFocusChange, onIllustrationInserted]);
  const ready = useRef(false);
  const restoreFocusAfterLayout = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const send = (method: string, value?: unknown) => {
    web.current?.injectJavaScript(`window.note.${method}(${JSON.stringify(value) ?? ''});true;`);
  };
  useImperativeHandle(ref, () => ({
    insertIllustration: id => {
      if (!ready.current || !sources[id] || !selectIsPro(useSubscriptionStore.getState())) return;
      void assetDataUri(sources[id]).then(uri => {
        if (mounted.current && selectIsPro(useSubscriptionStore.getState())) send('insert', { id, uri });
      }).catch(() => AppAlert.alert(translateUiText("그림을 불러오지 못했어요. 다시 시도해주세요.")));
    },
    blur: () => { restoreFocusAfterLayout.current = false; send('blur'); },
    reportFocus: () => { if (ready.current) send('reportFocus'); },
  }));
  useEffect(() => {
    if (ready.current) send('style', { ink, size: 17 * scale, lineHeight: 25 * scale });
  }, [ink, scale]);
  useEffect(() => {
    let cancelled = false;
    void assetDataUri(fontSources[fontId]).then(uri => {
      if (!cancelled && ready.current) send('font', uri);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [fontId]);
  return <View style={StyleSheet.absoluteFill}>
    {!initialized && !failed ? <HeroContentSkeleton ink={ink} testID="hero-note-skeleton" /> : null}
    {failed ? <Pressable testID="hero-note-retry" accessibilityRole="button" onPress={() => { generation.current++; ready.current = false; setFailed(false); setInitialized(false); setAttempt(value => value + 1); }} style={{ minHeight: 48, justifyContent: 'center' }}><ThemedText style={{ color: ink }}>{translateUiText('기록을 다시 불러오려면 눌러주세요.')}</ThemedText></Pressable> : null}
    <WebView key={attempt} ref={web} testID="hero-canvas-note" source={source} originWhitelist={['about:blank']} javaScriptEnabled
    onLayout={() => {
      // Entering editing changes the WebView's frame. Restore the selection only
      // after that native layout has settled, without needing another user tap.
      if (ready.current && restoreFocusAfterLayout.current) {
        restoreFocusAfterLayout.current = false;
        requestAnimationFrame(() => { if (mounted.current) send('focus'); });
      }
    }}
    keyboardDisplayRequiresUserAction={false} hideKeyboardAccessoryView automaticallyAdjustContentInsets={false}
    onError={() => { generation.current++; ready.current = false; setInitialized(false); setFailed(true); }}
    onContentProcessDidTerminate={() => { generation.current++; ready.current = false; setFailed(false); setInitialized(false); setAttempt(value => value + 1); }}
    onShouldStartLoadWithRequest={request => request.url === 'about:blank'}
    // WKWebView can pause animation frames at zero opacity, preventing its
    // initialized message (sent after layout) from ever reaching React Native.
    containerStyle={StyleSheet.absoluteFill}
    style={{ flex: 1, backgroundColor: 'transparent' }}
    onMessage={event => {
      let message;
      try { message = JSON.parse(event.nativeEvent.data); } catch { return; }
      if (message.type === 'ready') {
        const currentGeneration = ++generation.current;
        const saved = localStorageClient.getJson<InlineNoteDocument>(storageKey + ':inline');
        const legacy = (localStorageClient.getJson<string[]>(storageKey + ':illustrations') ?? []).filter(id => sources[id]);
        const document = saved && typeof saved.text === 'string' && Array.isArray(saved.icons) ? saved : { text: (localStorageClient.getItemRaw(storageKey) ?? '') + '\uFFFC'.repeat(legacy.length), icons: legacy };
        // Paint the text first. Decorations hydrate independently in fixed-size slots.
        void assetDataUri(fontSources[fontId]).catch(() => null).then(fontUri => {
          if (!mounted.current || generation.current !== currentGeneration) return;
          send('initialize', { document, images: {}, fontUri, ink, size: 17 * scale, lineHeight: 25 * scale, placeholder });
          ready.current = true;
          for (const id of new Set(document.icons)) {
            if (!sources[id]) continue;
            void assetDataUri(sources[id]).then(uri => { if (mounted.current && generation.current === currentGeneration) send('images', { [id]: uri }); }).catch(() => {});
          }
        }).catch(() => { if (mounted.current && generation.current === currentGeneration) setFailed(true); });
      } else if (message.type === 'initialized') { setInitialized(true); setFailed(false); }
      else if (message.type === 'focus') {
        const nextFocused = message.focused === true;
        restoreFocusAfterLayout.current = nextFocused && !focused;
        setFocused(nextFocused);
        callbacks.current.onFocusChange(nextFocused);
      }
      else if (message.type === 'inserted') callbacks.current.onIllustrationInserted(message.id);
      else if (message.type === 'change') {
        const document = message.document as InlineNoteDocument;
        setEmpty(!document.text.trim() && !document.icons.length);
        localStorageClient.setJson(storageKey + ':inline', document);
        localStorageClient.setItemRaw(storageKey, document.text.replace(/\uFFFC/g, ''));
      }
    }} />
  </View>;
});
