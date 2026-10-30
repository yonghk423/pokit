import { HeroImageActions } from './HeroImageActions';
import { HeroEditPencil } from './HeroEditPencil';
import { forwardRef, useImperativeHandle, useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { COMIC_PAPER_COLORS, COMIC_PEN_COLORS } from '../lib/heroScenePalette';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { PaperGrain } from '@shared/ui/paper-grain';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import type { COMIC_SCENES, ComicSceneId } from '../lib/heroSceneImages';
import type { HeroCardText } from './HeroCardCaption';
import { ComicSceneImage } from './HeroSceneImage';

type Scene = typeof COMIC_SCENES[number];
export type HeroRandomDraftHandle = { snapshot: () => HeroCardText };
export const HeroRandomDraftCard = forwardRef<HeroRandomDraftHandle, { scene: Scene; ink: string; muted: string; isDark: boolean; onChange?: (image: ComicSceneId, text: HeroCardText) => void; onSave: (image: ComicSceneId, text: HeroCardText) => void }>(function HeroRandomDraftCard({ scene, ink, muted, isDark, onSave, onChange }, ref) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [memo, setMemo] = useState('');
  const [paper, setPaper] = useState(isDark ? '#353A30' : '#F5E8CF');
  const [pen, setPen] = useState(ink);
  const [palette, setPalette] = useState<'paper' | 'pen' | null>(null);
  const [memoFocused, setMemoFocused] = useState(false);
  const [keyboard, setKeyboard] = useState(() => Keyboard.isVisible());
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const layoutRef = useRef<View>(null);
  const [editing, setEditing] = useState(false);
  const beforeEdit = useRef({ title: '', memo: '', paper, pen });
  const beginEditing = () => {
    if (!editing) beforeEdit.current = { title, memo, paper, pen };
    setEditing(true);
  };
  const saved = useRef(false);
  const memoRef = useRef<TextInput>(null);
  useImperativeHandle(ref, () => ({ snapshot: () => ({ title: title.trim() || memo.trim().split('\n')[0].slice(0, 80), memo: memo.trim(), paper, pen }) }), [title, memo, paper, pen]);
  useEffect(() => { onChange?.(scene.id, { title, memo, paper, pen }); }, [scene.id, title, memo, paper, pen, onChange]);
  const canSave = !!(title.trim() || memo.trim());
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboard(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return <View ref={layoutRef} collapsable={false} style={s.root} onLayout={() => layoutRef.current?.measureInWindow((_x, y) => setKeyboardOffset(y))}>
    <KeyboardAvoidingView testID="hero-random-draft" keyboardVerticalOffset={keyboardOffset} behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
    <View style={[s.card, { backgroundColor: paper }]}>
      <PaperGrain opacity={0.15} />
      {!keyboard ? <View style={s.image}><ComicSceneImage fillPortrait imageKey={`${scene.id}:draft`} source={scene.source} contentFit="contain" style={StyleSheet.absoluteFill} /></View> : null}
      <View style={[s.writing, keyboard && { flex: 1 }]}>
        {!keyboard ? <HeroImageActions key={scene.id} source={scene.source} compact /> : null}
        <ThemedTextInput testID="hero-random-title" accessibilityLabel={t('comicDay.sceneTitle')} placeholder={t('comicDay.sceneTitle')} placeholderTextColor={muted} onFocus={beginEditing} value={title} onChangeText={setTitle} maxLength={80} returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => memoRef.current?.focus()} style={[s.title, { color: pen, borderBottomColor: muted }]} />
        <View style={keyboard ? { flex: 1, minHeight: 66 } : undefined}>
          <ThemedTextInput ref={memoRef} testID="hero-random-memo" accessibilityLabel={t('comicDay.memo')} value={memo} onChangeText={setMemo} onFocus={() => { beginEditing(); setMemoFocused(true); }} onBlur={() => setMemoFocused(false)} multiline scrollEnabled style={[s.memo, keyboard && { flex: 1 }, { color: pen }]} />
          {!memo && !memoFocused ? <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.memo')} onPress={() => memoRef.current?.focus()} style={{ position: 'absolute', right: 0, top: 0, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><HeroEditPencil ink={ink} enabled={false} /></Pressable> : null}
        </View>
        {editing && palette ? <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          {(palette === 'paper' ? COMIC_PAPER_COLORS : COMIC_PEN_COLORS).map(color => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`${t(palette === 'paper' ? 'comicDay.paper' : 'comicDay.pen')} ${color}`} accessibilityState={{ selected: (palette === 'paper' ? paper : pen) === color }} onPress={() => { tapHaptic('select'); if (palette === 'paper') setPaper(color); else setPen(color); }} style={{ width: 36, height: 40, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: color, borderWidth: (palette === 'paper' ? paper : pen) === color ? 2 : 0.5, borderColor: ink }} /></Pressable>)}
        </ScrollView> : null}
        {editing ? <View style={s.actions}>
          <Pressable testID="hero-random-paper-color" accessibilityRole="button" accessibilityLabel={t('comicDay.paper')} accessibilityState={{ expanded: palette === 'paper' }} onPress={() => setPalette(palette === 'paper' ? null : 'paper')} style={s.button}><View style={{ width: 23, height: 26, borderWidth: 1, borderColor: ink, borderRadius: 2, backgroundColor: paper }} /></Pressable>
          <Pressable testID="hero-random-pen-color" accessibilityRole="button" accessibilityLabel={t('comicDay.pen')} accessibilityState={{ expanded: palette === 'pen' }} onPress={() => setPalette(palette === 'pen' ? null : 'pen')} style={[s.button, { marginRight: 'auto' }]}><ThemedText style={{ color: pen, fontSize: 20 }}>Aa</ThemedText></Pressable>
          {keyboard ? <Pressable testID="hero-random-dismiss-keyboard" accessibilityRole="button" accessibilityLabel={t('studyNote.toolbarDismissKeyboard')} onPress={Keyboard.dismiss} style={s.button}><HanddrawnControl name="keyboard.chevron.compact.down" size={25} color={ink} /></Pressable> : null}
          <Pressable testID="hero-random-cancel" accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => {
            setTitle(beforeEdit.current.title); setMemo(beforeEdit.current.memo);
            setPaper(beforeEdit.current.paper); setPen(beforeEdit.current.pen); setPalette(null);
            setMemoFocused(false); setEditing(false); Keyboard.dismiss();
          }} style={s.button}><HanddrawnControl name="xmark" size={24} color={ink} /></Pressable>
          <Pressable testID="hero-random-save" accessibilityRole="button" accessibilityLabel={t('common.save')} disabled={!canSave} accessibilityState={{ disabled: !canSave }} onPress={() => {
            if (!canSave || saved.current) return;
            saved.current = true; Keyboard.dismiss(); tapHaptic('confirm');
            onSave(scene.id, { title: title.trim() || memo.trim().split('\n')[0].slice(0, 80), memo: memo.trim(), paper, pen });
          }} style={[s.button, { opacity: canSave ? 1 : 0.3 }]}><HanddrawnControl name="checkmark" size={28} color={ink} /></Pressable>
        </View> : null}
      </View>
    </View>
  </KeyboardAvoidingView>
  </View>;
});
const s = StyleSheet.create({ root: { flex: 1, width: '100%', maxWidth: 440, minHeight: 0 }, card: { flex: 1, minHeight: 0, borderRadius: 18, overflow: 'hidden' }, image: { flex: 1, minHeight: 80 }, writing: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 8 }, title: { minHeight: 54, fontSize: 21, lineHeight: 34, borderBottomWidth: 0.5, paddingHorizontal: 0, paddingVertical: 6 }, memo: { minHeight: 66, maxHeight: 180, fontSize: 15, lineHeight: 23, textAlignVertical: 'top', paddingHorizontal: 0, paddingVertical: 8 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }, button: { width: 48, height: 44, alignItems: 'center', justifyContent: 'center' } });
