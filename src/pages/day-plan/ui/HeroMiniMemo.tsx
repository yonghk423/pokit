import { translateUiText } from '@shared/lib/i18n/lib/translateUiText';
import { useEffect, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useDiaryTheme } from '../model/diaryTheme';
import { DiaryItemImage } from './DiaryItemImage';
import { ThemedText } from '@shared/ui/themed-text';
import { useAppFontStore } from '@shared/lib/ui-font/appFontStore';
import { resolveAppFontFamily } from '@shared/lib/ui-font/resolveAppFontFamily';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';

/** Count visible characters, including composed emoji where supported. */
export function miniMemoCharacters(value: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(value), item => item.segment);
  }
  return Array.from(value.normalize('NFC'));
}
export function limitMiniMemo(value: string) {
  return miniMemoCharacters(value.replace(/[\r\n]/g, '')).slice(0, 30).join('');
}

/** The caller keys this component by day/month to isolate drafts and saved notes. */
export function HeroMiniMemo({ storageKey, ko, defaultTop = 0 }: { storageKey: string; ko: boolean; defaultTop?: number }) {
  const fontId = useAppFontStore(state => state.fontId);
  const fontFamily = resolveAppFontFamily(fontId);
  const theme = useDiaryTheme('memo');
  const [saved, setSaved] = useState(() => limitMiniMemo(localStorageClient.getItemRaw(storageKey) ?? ''));
  const [draft, setDraft] = useState(saved);
  const [open, setOpen] = useState(false);
  const [inputHeight, setInputHeight] = useState(60);
  const [textHeight, setTextHeight] = useState(18);
  const characterCount = miniMemoCharacters(saved).length;
  const editorHeight = Math.max(160, inputHeight + 92);
  const positionKey = storageKey + ':position';
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  // Keep short notes compact while letting the full 30-character limit wrap
  // naturally inside a paper that is still large enough to read.
  const memoWidth = Math.min(Math.max(96, 92 + characterCount * 3.6), 210, bounds.width || 210);
  const memoHeight = Math.max(memoWidth * 0.58, textHeight + 40);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(() => {
    try {
      const value = JSON.parse(localStorageClient.getItemRaw(positionKey) ?? 'null');
      return value && Number.isFinite(value.x) && Number.isFinite(value.y) ? value : null;
    } catch { return null; }
  });
  const offset = useRef(new Animated.ValueXY()).current;
  const dragged = useRef(false);
  const origin = useRef({ x: 0, y: 0 });
  const maxX = Math.max(0, bounds.width - memoWidth);
  const maxY = Math.max(0, bounds.height - memoHeight);
  const left = Math.max(0, Math.min(maxX, position ? position.x * maxX : maxX - 20));
  const top = Math.max(0, Math.min(maxY, position ? position.y * maxY : defaultTop));
  useEffect(() => { offset.setValue({ x: left, y: top }); }, [left, top, offset]);
  const drag = Gesture.Pan().activateAfterLongPress(350).minDistance(8).runOnJS(true)
    .onStart(() => {
      dragged.current = true;
      origin.current = { x: left, y: top };
      tapHaptic('select');
    })
    .onUpdate(event => offset.setValue({
      x: Math.max(0, Math.min(maxX, origin.current.x + event.translationX)),
      y: Math.max(0, Math.min(maxY, origin.current.y + event.translationY)),
    }))
    .onEnd((event, success) => {
      if (!success) return;
      const x = Math.max(0, Math.min(maxX, origin.current.x + event.translationX));
      const y = Math.max(0, Math.min(maxY, origin.current.y + event.translationY));
      const next = { x: maxX ? x / maxX : 0, y: maxY ? y / maxY : 0 };
      localStorageClient.setItemRaw(positionKey, JSON.stringify(next));
      setPosition(next);
    })
    .onFinalize((_event, success) => { if (!success) offset.setValue({ x: left, y: top }); });
  if (!theme) return null;
  const close = () => setOpen(false);
  const save = () => {
    const next = limitMiniMemo(draft);
    localStorageClient.setItemRaw(storageKey, next);
    setSaved(next);
    setOpen(false);
  };
  return <>
    <View pointerEvents="box-none" onLayout={event => setBounds({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })} style={[StyleSheet.absoluteFill, { zIndex: 3 }]}>
    <GestureDetector gesture={drag}><Animated.View style={{ position: 'absolute', left: 0, top: 0, width: memoWidth, height: memoHeight, transform: offset.getTranslateTransform() }}>
    <Pressable testID="hero-mini-memo" accessibilityRole="button" accessibilityLabel={translateUiText("짧은 메모 편집, {text}", { text: saved || translateUiText("내용 없음") })} accessibilityHint={translateUiText("꾹 누른 뒤 끌어서 이동")} onPressIn={() => { dragged.current = false; }} onPress={() => { if (dragged.current) return; tapHaptic('select'); setDraft(saved); setInputHeight(60); setOpen(true); }} style={{ width: memoWidth, height: memoHeight, alignItems: 'center', justifyContent: 'center' }}>
      <DiaryItemImage accessible={false} pointerEvents="none" source={theme.source} contentFit="fill" style={StyleSheet.absoluteFill} />
      <Text testID="hero-mini-memo-text" allowFontScaling={false} onTextLayout={event => {
        const lines = event.nativeEvent.lines;
        const height = lines.reduce((bottom, line) => Math.max(bottom, line.y + line.height), 18);
        setTextHeight(previous => Math.abs(previous - height) < 1 ? previous : height);
      }} style={{ width: '72%', textAlign: 'center', color: '#402A20', fontFamily, fontSize: 14, lineHeight: 20 }}>{saved || (translateUiText("+ 메모"))}</Text>
    </Pressable>
    </Animated.View></GestureDetector>
    </View>
    <Modal visible={open} transparent animationType="none" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.28)' }}>
        <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 360, alignSelf: 'center', backgroundColor: '#FFFCF6', borderRadius: 20, padding: 24, gap: 16 }}>
          <ThemedText accessibilityRole="header" style={{ color: '#402A20', fontSize: 19 }}>{translateUiText("짧은 메모")}</ThemedText>
          <View testID="hero-mini-memo-editor-paper" style={{ alignItems: 'center', justifyContent: 'center', height: editorHeight }}>
            <DiaryItemImage accessible={false} pointerEvents="none" source={theme.source} contentFit="fill" style={StyleSheet.absoluteFill} />
            <TextInput testID="hero-mini-memo-input" autoFocus multiline allowFontScaling={false} scrollEnabled={false} onContentSizeChange={event => setInputHeight(Math.max(60, Math.ceil(event.nativeEvent.contentSize.height)))} value={draft} onChangeText={value => setDraft(limitMiniMemo(value))} accessibilityLabel={translateUiText("메모, 최대 30글자")} placeholder={translateUiText("30글자까지")} placeholderTextColor="#846E60" returnKeyType="done" style={{ width: '70%', textAlign: 'center', height: inputHeight, paddingVertical: 8, paddingHorizontal: 0, fontFamily, color: '#402A20', fontSize: 20, lineHeight: 28, textAlignVertical: 'center', backgroundColor: 'transparent' }} />
          </View>
          <ThemedText accessibilityLiveRegion="polite" style={{ color: '#846E60', textAlign: 'right', fontSize: 13 }}>{miniMemoCharacters(draft).length}/30</ThemedText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
            <Pressable accessibilityRole="button" onPress={() => setDraft('')} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: '#846E60' }}>{translateUiText("지우기")}</ThemedText></Pressable>
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <Pressable accessibilityRole="button" onPress={close} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: '#402A20' }}>{translateUiText("취소")}</ThemedText></Pressable>
              <Pressable testID="hero-mini-memo-save" accessibilityRole="button" onPress={save} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ color: '#278B77' }}>{translateUiText("저장")}</ThemedText></Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
