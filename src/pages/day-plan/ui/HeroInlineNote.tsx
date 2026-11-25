import { assetDataUri, fontSources } from './heroInlineAssets';
import { useAppLocaleStore } from '@shared/lib/i18n/model/localeStore';
import { initialWritingPrompt, nextWritingPrompt, writingPrompt, writingPromptCount, writingPromptLabels } from '../model/writingPrompts';
import { HeroContentSkeleton } from './HeroContentSkeleton';
import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { selectIsPro, useSubscriptionStore } from '@features/subscriptions/model/subscriptionStore';
import { memo, useEffect, useImperativeHandle, useMemo, useRef, useState, type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { WebView } from 'react-native-webview';
import { useAppFontSizeScale, useEffectiveAppFontId } from '@shared/lib/ui-font';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { AppAlert } from '@shared/lib/app-alert';
import { inlineNoteHtml, type InlineNoteDocument } from '../lib/inlineNoteHtml';

export type HeroInlineNoteHandle = { insertIllustration: (id: string) => void; blur: () => void; reportFocus: () => void; focus: () => void };

export const HeroInlineNote = memo(function HeroInlineNote({ storageKey, sources, ink, placeholder, randomPrompts = false, onContentHeight, testID, completed = false, ruled, initialDocument, onDocumentChange, onFocusChange, onIllustrationInserted, ref }: {
  storageKey: string; sources: Record<string, number>; ink: string; placeholder: string; randomPrompts?: boolean;
  testID?: string; completed?: boolean; onContentHeight?: (height: number) => void;
  ruled?: { color: string; lineHeight: number };
  initialDocument?: InlineNoteDocument; onDocumentChange?: (document: InlineNoteDocument) => void;
  onFocusChange: (focused: boolean) => void; onIllustrationInserted: (id: string) => void; ref?: Ref<HeroInlineNoteHandle>;
}) {
  const web = useRef<WebView>(null);
  const locale = useAppLocaleStore(state => state.locale);
  const [promptIndex, setPromptIndex] = useState(() => {
    const saved = localStorageClient.getJson<number>(storageKey + ':writing-prompt');
    return Number.isInteger(saved) && saved! >= 0 && saved! < writingPromptCount ? saved! : initialWritingPrompt(storageKey);
  });
  const recentPrompts = useRef([promptIndex]);
  const animatePrompt = useRef(false);
  const effectivePlaceholder = randomPrompts ? writingPrompt(locale, promptIndex) : placeholder;
  const rollPrompt = () => {
    const next = nextWritingPrompt(recentPrompts.current);
    recentPrompts.current = [...recentPrompts.current.slice(-4), next];
    localStorageClient.setJson(storageKey + ':writing-prompt', next);
    animatePrompt.current = true;
    setPromptIndex(next);
  };
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
    return { html: inlineNoteHtml.replace('id="editor" role=', `id="editor" data-placeholder="${escape(effectivePlaceholder)}" style="color:${escape(ink)};font-size:${17 * scale}px;line-height:${25 * scale}px" role=`) };
    // Keep the document stable; subsequent styles are sent through the bridge.
  }, []);
  const callbacks = useRef({ onFocusChange, onIllustrationInserted, onDocumentChange, onContentHeight });
  useEffect(() => { callbacks.current = { onFocusChange, onIllustrationInserted, onDocumentChange, onContentHeight }; }, [onFocusChange, onIllustrationInserted, onDocumentChange, onContentHeight]);
  const ready = useRef(false);
  const pendingFocus = useRef(false);
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
    focus: () => { if (ready.current) send('focus'); else pendingFocus.current = true; },
    blur: () => { restoreFocusAfterLayout.current = false; send('blur'); },
    reportFocus: () => { if (ready.current) send('reportFocus'); },
  }));
  useEffect(() => {
    if (ready.current) send('style', { ink, size: 17 * scale, lineHeight: ruled?.lineHeight ?? 25 * scale, ruleColor: ruled?.color, completed });
  }, [ink, scale, ruled?.lineHeight, ruled?.color, completed]);
  useEffect(() => {
    if (ready.current) {
      send('placeholder', { text: effectivePlaceholder, dice: randomPrompts, animate: animatePrompt.current });
      animatePrompt.current = false;
    }
  }, [effectivePlaceholder, randomPrompts, initialized]);
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
    <WebView key={attempt} ref={web} testID={testID ?? "hero-canvas-note"} source={source} originWhitelist={['about:blank']} javaScriptEnabled
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
        const document = initialDocument ?? (saved && typeof saved.text === 'string' && Array.isArray(saved.icons) ? saved : { text: (localStorageClient.getItemRaw(storageKey) ?? '') + '\uFFFC'.repeat(legacy.length), icons: legacy });
        // Paint the text first. Decorations hydrate independently in fixed-size slots.
        void assetDataUri(fontSources[fontId]).catch(() => null).then(fontUri => {
          if (!mounted.current || generation.current !== currentGeneration) return;
          send('initialize', { document, images: {}, fontUri, ink, size: 17 * scale, lineHeight: ruled?.lineHeight ?? 25 * scale, ruleColor: ruled?.color, completed, placeholder: effectivePlaceholder, dice: randomPrompts });
          ready.current = true;
          for (const id of new Set(document.icons)) {
            if (!sources[id]) continue;
            void assetDataUri(sources[id]).then(uri => { if (mounted.current && generation.current === currentGeneration) send('images', { [id]: uri }); }).catch(() => {});
          }
        }).catch(() => { if (mounted.current && generation.current === currentGeneration) setFailed(true); });
      } else if (message.type === 'initialized') { setInitialized(true); setFailed(false); if (pendingFocus.current) { pendingFocus.current = false; send('focus'); } }
      else if (message.type === 'focus') {
        const nextFocused = message.focused === true;
        restoreFocusAfterLayout.current = nextFocused && !focused;
        setFocused(nextFocused);
        callbacks.current.onFocusChange(nextFocused);
      }
      else if (message.type === 'height') { if (Number.isFinite(message.height)) callbacks.current.onContentHeight?.(message.height); }
      else if (message.type === 'inserted') callbacks.current.onIllustrationInserted(message.id);
      else if (message.type === 'change') {
        const document = message.document as InlineNoteDocument;
        setEmpty(!document.text.trim() && !document.icons.length);
        if (callbacks.current.onDocumentChange) callbacks.current.onDocumentChange(document);
        else {
          localStorageClient.setJson(storageKey + ':inline', document);
          localStorageClient.setItemRaw(storageKey, document.text.replace(/\uFFFC/g, ''));
        }
      }
    }} />
    {randomPrompts && initialized && !failed && empty && !focused ? <Pressable
      testID="hero-writing-prompt-dice" accessibilityRole="button"
      accessibilityLabel={writingPromptLabels[locale].label} accessibilityHint={writingPromptLabels[locale].hint}
      onPress={rollPrompt}
      style={{ position: 'absolute', right: 0, top: 0, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
      {({ pressed }) => <View pointerEvents="none" style={{ width: 29, height: 29, borderRadius: 7,
        backgroundColor: pressed ? '#E7DFD0' : '#F8F3E8', borderWidth: 1, borderColor: '#D9D1C3',
        borderBottomWidth: pressed ? 1 : 3, shadowColor: '#443A2E', shadowOpacity: pressed ? 0.08 : 0.19,
        shadowRadius: pressed ? 1 : 2, shadowOffset: { width: 0, height: pressed ? 1 : 3 }, elevation: pressed ? 1 : 3,
        transform: [{ rotate: '-8deg' }, { translateY: pressed ? 2 : 0 }, { scale: pressed ? 0.95 : 1 }] }}>
        {[6, 12, 18].map(position => <View key={position} style={{ position: 'absolute', left: position, top: position - 1, width: 4, height: 4, borderRadius: 2, backgroundColor: '#7B7264' }} />)}
      </View>}
    </Pressable> : null}
  </View>;
});
