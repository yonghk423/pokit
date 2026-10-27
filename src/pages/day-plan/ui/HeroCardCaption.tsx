import { useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View, useWindowDimensions, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { PaperGrain } from '@shared/ui/paper-grain';
import { scaleTypeSize, useAppFontSizeScale } from '@shared/lib/ui-font';
import { HeroEditPencil } from './HeroEditPencil';
import { completeHeroCardEditHint } from '@shared/lib/storage/heroCardEditHintStorage';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

export type HeroCardText = { title: string; memo: string };

/** A caption can be edited without opening or flipping the scene card. */
export function HeroCardCaption({ title, memo = '', number, ink, muted, paper = '#F5E8CF', onSave, showEdit = !!onSave, onOpen, onEditingChange }: {
  title: string; memo?: string; number: number; ink: string; muted: string; paper?: string;
  onOpen?: () => void;
  showEdit?: boolean;
  onSave?: (text: HeroCardText) => void; onEditingChange?: (editing: boolean) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HeroCardText>({ title, memo });
  const finish = () => { Keyboard.dismiss(); setEditing(false); onEditingChange?.(false); };
  const save = () => {
    if (!draft.title.trim()) return;
    onSave?.({ title: draft.title.trim(), memo: draft.memo.trim() });
    tapHaptic('confirm'); finish();
  };
  return <View style={[s.caption, { borderTopColor: muted }]}>
    <ThemedText style={{ color: muted, fontSize: 12, lineHeight: 17 }}>{String(number).padStart(2, '0')}</ThemedText>
    {editing ? <HeroCardEditor number={number} ink={ink} muted={muted} paper={paper} draft={draft} onChange={setDraft} onSave={save} onCancel={() => { tapHaptic(); finish(); }} /> : null}
      <View style={s.titleRow}>
        <Pressable disabled={!onOpen} onPress={onOpen} style={{ flex: 1 }}><ThemedText numberOfLines={1} style={[s.title, { color: ink }]}>{title}</ThemedText></Pressable>
        {showEdit ? <Pressable testID="hero-card-edit" disabled={!onSave} accessibilityRole="button" accessibilityLabel={`${t('comicDay.sceneTitle')} · ${t('comicDay.memo')}`} onPress={() => {
          completeHeroCardEditHint(); tapHaptic(); setDraft({ title, memo }); setEditing(true); onEditingChange?.(true);
        }} style={s.edit}>
          <HeroEditPencil ink={ink} enabled={!!onSave && !editing} />
        </Pressable> : null}
      </View>
      {memo.trim() ? <ThemedText numberOfLines={2} style={{ color: ink, opacity: 0.75, fontSize: 14, lineHeight: 18, flexShrink: 1 }}>{memo.trim().replace(/\s+/g, ' ')}</ThemedText> : null}
  </View>;
}
/** A native input surface stays outside the clipped, gesture-driven card stack. */
function HeroCardEditor({ number, ink, muted, paper, draft, onChange, onSave, onCancel }: {
  number: number; ink: string; muted: string; paper: string; draft: HeroCardText;
  onChange: (text: HeroCardText) => void; onSave: () => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const titleRef = useRef<TextInput>(null);
  const memoRef = useRef<TextInput>(null);
  const [memoHeight, setMemoHeight] = useState(240);
  const [scrollY, setScrollY] = useState(0);
  const appScale = useAppFontSizeScale();
  const { fontScale } = useWindowDimensions();
  const lineHeight = Math.ceil(scaleTypeSize(32, appScale) * fontScale);
  const fontSize = Math.round(scaleTypeSize(17, appScale) * fontScale);
  return <AppModal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}
    onShow={() => titleRef.current?.focus()} supportedOrientations={['portrait', 'landscape']}>
    <KeyboardAvoidingView testID="hero-card-editor" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.editorRoot}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
      <View pointerEvents="box-none" style={[s.editorSafeArea, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 12), paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        <View style={[s.editorPaper, { backgroundColor: paper }]}>
          <PaperGrain opacity={0.22} />
          <View style={s.editorHeader}>
            <ThemedText style={{ color: muted, fontSize: 14 }}>{String(number).padStart(2, '0')}</ThemedText>
            <Pressable testID="hero-card-dismiss-keyboard" accessibilityRole="button" accessibilityLabel={t('studyNote.toolbarDismissKeyboard')} onPress={() => { tapHaptic(); Keyboard.dismiss(); }} style={s.edit}>
              <HanddrawnControl name="keyboard.chevron.compact.down" size={26} color={ink} />
            </Pressable>
          </View>
          <ThemedTextInput ref={titleRef} accessibilityLabel={t('comicDay.sceneTitle')} placeholder={t('comicDay.sceneTitle')} placeholderTextColor={muted}
            value={draft.title} onChangeText={title => onChange({ ...draft, title })} maxLength={80}
            returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => memoRef.current?.focus()}
            style={[s.titleInput, { color: ink, borderBottomColor: muted }]} />
          <View testID="hero-card-summary-editor" style={s.memoArea} onLayout={event => setMemoHeight(event.nativeEvent.layout.height)}>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: -(scrollY % lineHeight) }] }]}>
              {Array.from({ length: Math.ceil(memoHeight / lineHeight) + 1 }, (_, index) => <View key={index} style={{ height: lineHeight, borderBottomWidth: 0.5, borderBottomColor: muted, opacity: 0.4 }} />)}
            </View>
            <ThemedTextInput ref={memoRef} accessibilityLabel={t('comicDay.memo')} placeholder={t('comicDay.memoHint')} placeholderTextColor={muted}
              value={draft.memo} onChangeText={memo => onChange({ ...draft, memo })} multiline scrollEnabled
              allowFontScaling={false} typographyScale={1} onScroll={event => setScrollY(Math.max(0, event.nativeEvent.contentOffset.y))}
              style={[StyleSheet.absoluteFill, s.memoInput, { color: ink, fontSize, lineHeight }]} />
          </View>
          <View style={[s.actions, { borderTopColor: muted }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={onCancel} style={s.action}>
              <HanddrawnControl name="xmark" size={24} color={ink} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.save')} disabled={!draft.title.trim()} accessibilityState={{ disabled: !draft.title.trim() }} onPress={onSave}
              style={[s.action, s.saveAction, { opacity: draft.title.trim() ? 1 : 0.35 }]}>
              <HanddrawnFrame color="#65765A" />
              <HanddrawnControl name="checkmark" size={26} color={ink} />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </AppModal>;
}
const s = StyleSheet.create({
  caption: { flex: 1, minHeight: 0, borderTopWidth: 0.5, marginHorizontal: 14, paddingTop: 8, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 22, lineHeight: 29 },
  edit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  editorRoot: { flex: 1, backgroundColor: '#F7F6F4' },
  editorSafeArea: { flex: 1, minHeight: 0, alignItems: 'center' },
  editorPaper: { flex: 1, width: '100%', maxWidth: 580, minHeight: 0, borderRadius: 20, overflow: 'hidden', paddingHorizontal: 20, paddingBottom: 8 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, flexShrink: 0 },
  titleInput: { fontSize: 26, minHeight: 48, paddingVertical: 4, paddingHorizontal: 0, borderBottomWidth: 0.6, flexShrink: 0 },
  memoArea: { flex: 1, minHeight: 32, overflow: 'hidden', marginTop: 12, marginBottom: 12 },
  memoInput: { paddingHorizontal: 0, paddingVertical: 0, textAlignVertical: 'top', includeFontPadding: false },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, paddingTop: 8, flexShrink: 0 },
  action: { minWidth: 48, minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  saveAction: { minWidth: 56, backgroundColor: '#C8D9BB', borderRadius: 16 },
});
