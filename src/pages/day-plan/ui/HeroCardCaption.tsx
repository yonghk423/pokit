import { HeroCardAppearanceControls } from './HeroCardAppearanceControls';
import type { AppFontId } from '@shared/lib/ui-font';
import { useRef, useState, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { PaperGrain } from '@shared/ui/paper-grain';
import { resolveDiaryEditorTypography, useAppFontSizeScale } from '@shared/lib/ui-font';
import { HeroEditPencil } from './HeroEditPencil';
import { completeHeroCardEditHint } from '@shared/lib/storage/heroCardEditHintStorage';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

export type HeroCardText = { title: string; memo: string; paper?: string; pen?: string; fontId?: AppFontId };

/** A caption can be edited without opening or flipping the scene card. */
export function HeroCardCaption({ title, memo = '', number, ink, muted, paper = '#F5E8CF', fontId, onSave, showEdit = !!onSave, onOpen, onEditingChange, topActions, tapToEdit = false, showMemo = true }: {
  showMemo?: boolean; title: string; memo?: string; number: number; ink: string; muted: string; paper?: string; fontId?: AppFontId; topActions?: ReactNode; tapToEdit?: boolean;
  onOpen?: () => void;
  showEdit?: boolean;
  onSave?: (text: HeroCardText) => void; onEditingChange?: (editing: boolean) => void;
}) {
  const { t } = useTranslation();
  const empty = !title.trim() && !memo.trim();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HeroCardText>({ title, memo });
  const startEditing = () => {
    if (!onSave) return;
    completeHeroCardEditHint(); tapHaptic(); setDraft({ title, memo, ...(fontId ? { fontId } : {}) }); setEditing(true); onEditingChange?.(true);
  };
  const finish = () => { Keyboard.dismiss(); setEditing(false); onEditingChange?.(false); };
  const save = () => {
    if (!draft.title.trim()) return;
    onSave?.({ ...draft, title: draft.title.trim(), memo: draft.memo.trim() });
    tapHaptic('confirm'); finish();
  };
  return <View style={s.caption}>

    {editing ? <HeroCardEditor number={number} ink={ink} muted={muted} paper={paper} draft={draft} onChange={setDraft} onSave={save} onCancel={() => { tapHaptic(); finish(); }} /> : null}
    <Pressable testID={tapToEdit ? 'hero-card-caption-write' : undefined} disabled={!tapToEdit || !onSave} accessibilityRole={tapToEdit ? 'button' : undefined} accessibilityLabel={tapToEdit ? `${t('comicDay.sceneTitle')} · ${t('comicDay.memo')}` : undefined} onPress={startEditing} style={{ flex: 1 }}>
      <View pointerEvents={tapToEdit ? 'none' : 'auto'} style={{ flex: 1 }}>
      {empty ? <Pressable testID="hero-card-empty-write" disabled={!onSave} accessibilityRole="button" accessibilityLabel={t('comicDay.emptyDayPrompt')} onPress={startEditing} hitSlop={4}>
        <ThemedText testID="hero-card-empty-prompt" style={{ color: muted, fontSize: 14, lineHeight: 20, marginBottom: 6 }}>{t('comicDay.emptyDayPrompt')}</ThemedText>
      </Pressable> : null}
      <View style={[s.titleRow, !showMemo && { marginRight: 40 }, empty && { borderTopWidth: 0.5, borderTopColor: muted, paddingTop: 8 }]}>
        {!empty ? <Pressable disabled={!onOpen} onPress={onOpen} style={{ flex: 1 }}><ThemedText fontId={fontId} numberOfLines={1} style={[s.title, { color: ink }]}>{title}</ThemedText></Pressable> : null}
        {!tapToEdit ? topActions : null}
        {showEdit && !tapToEdit ? <Pressable testID="hero-card-edit" disabled={!onSave} accessibilityRole="button" accessibilityLabel={`${t('comicDay.sceneTitle')} · ${t('comicDay.memo')}`} onPress={startEditing} style={[s.edit, !!topActions && s.compactEdit]}>
          <HeroEditPencil ink={ink} enabled={!!onSave && !editing} />
        </Pressable> : null}
      </View>
      {showMemo && memo.trim() ? <ScrollView testID="hero-card-memo-space" style={s.memoDisplay} contentContainerStyle={s.memoContent} nestedScrollEnabled showsVerticalScrollIndicator>
        <ThemedText fontId={fontId} testID="hero-card-memo" style={{ color: ink, opacity: 0.75, fontSize: 14, lineHeight: 18 }}>{memo.trim().replace(/\s+/g, ' ')}</ThemedText>
      </ScrollView> : null}
      </View>
    </Pressable>
  </View>;
}
/** A native input surface stays outside the clipped, gesture-driven card stack. */
export function HeroCardEditor({ number, ink: savedInk, muted: savedMuted, paper: savedPaper, draft, onChange, onSave, onCancel }: {
  number: number; ink: string; muted: string; paper: string; draft: HeroCardText;
  onChange: (text: HeroCardText) => void; onSave: () => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const titleRef = useRef<TextInput>(null);
  const memoRef = useRef<TextInput>(null);
  const [memoHeight, setMemoHeight] = useState(240);
  const [scrollY, setScrollY] = useState(0);
  const ink = draft.pen ?? savedInk;
  const paper = draft.paper ?? savedPaper;
  const muted = draft.pen ? ink : savedMuted;
  const appScale = useAppFontSizeScale(draft.fontId);
  const { fontScale } = useWindowDimensions();
  const { fontSize, lineHeight, titleSize, titleLineHeight } = resolveDiaryEditorTypography(appScale, fontScale);
  return <AppModal visible transparent animationType="none" statusBarTranslucent onRequestClose={onCancel}
    onShow={() => titleRef.current?.focus()} supportedOrientations={['portrait', 'landscape']}>
    <KeyboardAvoidingView testID="hero-card-editor" behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.editorRoot}>
      <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
      <View pointerEvents="box-none" style={[s.editorSafeArea, { paddingTop: insets.top + 12, paddingBottom: Math.max(insets.bottom, 12), paddingLeft: insets.left + 16, paddingRight: insets.right + 16 }]}>
        <View style={[s.editorPaper, { backgroundColor: paper }]}>
          {paper !== '#000000' ? <PaperGrain opacity={0.22} /> : null}
          <View style={s.editorHeader}>
            <Pressable testID="hero-card-dismiss-keyboard" accessibilityRole="button" accessibilityLabel={t('studyNote.toolbarDismissKeyboard')} onPress={() => { tapHaptic(); Keyboard.dismiss(); }} style={s.edit}>
              <HanddrawnControl name="keyboard.chevron.compact.down" size={26} color={ink} />
            </Pressable>
          </View>
          <ThemedTextInput fontId={draft.fontId} ref={titleRef} allowFontScaling={false} typographyScale={1} accessibilityLabel={t('comicDay.sceneTitle')} placeholder={t('comicDay.sceneTitle')} placeholderTextColor={muted}
            value={draft.title} onChangeText={title => onChange({ ...draft, title })} maxLength={80}
            returnKeyType="next" submitBehavior="submit" onSubmitEditing={() => memoRef.current?.focus()}
            style={[s.titleInput, { color: ink, borderBottomColor: muted, fontSize: titleSize, lineHeight: titleLineHeight, minHeight: titleLineHeight + 20 }]} />
          <View testID="hero-card-summary-editor" style={s.memoArea} onLayout={event => setMemoHeight(event.nativeEvent.layout.height)}>
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: -(scrollY % lineHeight) }] }]}>
              {Array.from({ length: Math.ceil(memoHeight / lineHeight) + 1 }, (_, index) => <View key={index} style={{ height: lineHeight, borderBottomWidth: 0.5, borderBottomColor: muted, opacity: 0.4 }} />)}
            </View>
            <ThemedTextInput fontId={draft.fontId} ref={memoRef} accessibilityLabel={t('comicDay.memo')} placeholder={t('comicDay.memoHint')} placeholderTextColor={muted}
              value={draft.memo} onChangeText={memo => onChange({ ...draft, memo })} multiline scrollEnabled
              allowFontScaling={false} typographyScale={1} onScroll={event => setScrollY(Math.max(0, event.nativeEvent.contentOffset.y))}
              style={[StyleSheet.absoluteFill, s.memoInput, { color: ink, fontSize, lineHeight }]} />
          </View>
          <View style={[s.actions, { borderTopColor: muted }]}>
            <HeroCardAppearanceControls paper={paper} pen={ink} fontId={draft.fontId} onChange={patch => onChange({ ...draft, ...patch })}
            leadingAction={<Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={onCancel} style={s.action}>
              <HanddrawnControl name="xmark" size={24} color={ink} />
            </Pressable>}
            trailingAction={<Pressable accessibilityRole="button" accessibilityLabel={t('common.save')} disabled={!draft.title.trim()} accessibilityState={{ disabled: !draft.title.trim() }} onPress={onSave}
              style={[s.action, s.saveAction, { opacity: draft.title.trim() ? 1 : 0.35 }]}>
              <View style={s.saveFace}><HanddrawnFrame color="#65765A" />
              <HanddrawnControl name="checkmark" size={26} color={ink} /></View>
            </Pressable>} />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  </AppModal>;
}
const s = StyleSheet.create({
  caption: { flex: 1, minHeight: 0, marginHorizontal: 14, paddingTop: 8, gap: 2 },
  memoDisplay: { flex: 1, minHeight: 0 },
  memoContent: { flexGrow: 1, paddingBottom: 8 },
  compactEdit: { width: 32, height: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, lineHeight: 25 },
  edit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  editorRoot: { flex: 1, backgroundColor: '#F7F6F4' },
  editorSafeArea: { flex: 1, minHeight: 0, alignItems: 'center' },
  editorPaper: { flex: 1, width: '100%', maxWidth: 580, minHeight: 0, borderRadius: 20, overflow: 'hidden', paddingHorizontal: 20, paddingBottom: 8 },
  editorHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, flexShrink: 0 },
  titleInput: { fontSize: 26, minHeight: 60, paddingVertical: 10, paddingHorizontal: 0, borderBottomWidth: 0.6, flexShrink: 0 },
  memoArea: { flex: 1, minHeight: 32, overflow: 'hidden', marginTop: 12, marginBottom: 12 },
  memoInput: { paddingHorizontal: 0, paddingVertical: 0, textAlignVertical: 'top', includeFontPadding: false },
  actions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 0.5, paddingTop: 8, flexShrink: 0 },
  action: { minWidth: 48, minHeight: 44, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  saveAction: { minWidth: 48, paddingHorizontal: 0 },
  saveFace: { width: 46, height: 36, backgroundColor: '#C8D9BB', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
