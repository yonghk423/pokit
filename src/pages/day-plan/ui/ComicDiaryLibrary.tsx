import { COMIC_SCENES } from '../lib/comicSceneImages';
import { SketchPaperButton } from '@shared/ui/sketch-paper-button';
import { useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { COMIC_CHARACTERS } from '../lib/comicCharacters';
import { COMIC_SCENE_THUMBNAILS } from '../lib/comicSceneThumbnails';
import type { ComicDiary } from '../lib/comicDiaryStorage';
import { ComicSceneImage } from './ComicSceneImage';

export function ComicDiaryLibrary({ diaries, activeId, initialRenameId, onClose, onCreate, onOpen, onRename, onDelete }: {
  diaries: ComicDiary[]; activeId: string | null; initialRenameId?: string | null; onClose: () => void; onCreate: () => void;
  onOpen: (id: string) => void; onRename: (id: string, title: string) => void; onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(initialRenameId ?? null);
  const [draft, setDraft] = useState(() => diaries.find(item => item.id === initialRenameId)?.title ?? '');
  const save = () => { if (renamingId && draft.trim()) { tapHaptic('confirm'); onRename(renamingId, draft); setRenamingId(null); } };
  return <AppModal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable accessibilityLabel={t('common.close')} style={StyleSheet.absoluteFill} onPress={() => { tapHaptic(); onClose(); }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.paper, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PaperGrain opacity={0.24} /><HanddrawnFrame color="#939393" />
        <View style={s.header}><ThemedText style={s.heading}>{t('comicDiary.library')}</ThemedText><Pressable accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); onClose(); }} style={s.touch}><ThemedText style={s.close}>×</ThemedText></Pressable></View>
        <SketchPaperButton label={t('comicDiary.create')} onPress={onCreate} labelSize={16} style={s.create} />
        <ThemedTextInput accessibilityLabel={t('comicDiary.search')} placeholder={t('comicDiary.search')} placeholderTextColor="#888888" value={query} onChangeText={setQuery} style={s.search} />
        <FlatList data={diaries.filter(diary => diary.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))} keyExtractor={diary => diary.id} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.list} ListEmptyComponent={<ThemedText style={s.empty}>{t(query ? 'comicDiary.noResults' : 'comicDiary.empty')}</ThemedText>} renderItem={({ item }) => {
          const first = item.scenes[0];
          const source = first ? COMIC_SCENE_THUMBNAILS[first.image].small : COMIC_CHARACTERS.find(character => character.id === item.characterId)!.cover;
          return <View style={[s.rowPaper, activeId === item.id && { backgroundColor: '#E4F3E9' }]}>
            <HanddrawnFrame color={activeId === item.id ? '#7DA58B' : '#B9B9B9'} />
            <View style={s.row}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.open', { title: item.title })} accessibilityState={{ selected: activeId === item.id }} onPress={() => { tapHaptic(); onOpen(item.id); }} style={s.open}>
                <ComicSceneImage imageKey={`diary:${item.id}:${first?.image ?? 'cover'}`} source={source} fallbackSource={first ? COMIC_SCENES.find(scene => scene.id === first.image)!.source : COMIC_CHARACTERS.find(character => character.id === item.characterId)!.preview[0].source} style={s.cover} />
                <View style={{ flex: 1 }}><ThemedText numberOfLines={2} style={s.title}>{item.title}</ThemedText><ThemedText style={s.count}>{t('comicDiary.sceneCount', { count: item.scenes.length })}</ThemedText></View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.manage', { title: item.title })} accessibilityState={{ expanded: menuId === item.id }} style={s.touch} onPress={() => { tapHaptic('select'); setRenamingId(null); setMenuId(menuId === item.id ? null : item.id); }}><Svg width={19} height={15} viewBox="0 0 19 15" accessible={false}>
                <Path d="M3.1 6.2C4.4 6 4.6 7.1 4.3 7.9C3.9 8.7 2.6 8.5 2.5 7.6C2.3 6.9 2.5 6.4 3.1 6.2Z M9.3 6.1C10.5 6.2 10.6 7.5 10 8.1C9.4 8.7 8.2 8.3 8.3 7.4C8.2 6.7 8.6 6.1 9.3 6.1Z M15.1 6.2C16.2 6 16.8 7.2 16.2 8C15.7 8.8 14.3 8.3 14.3 7.5C14.2 6.8 14.5 6.4 15.1 6.2Z" fill="#363636" />
              </Svg></Pressable>
            </View>
            {menuId === item.id && renamingId !== item.id ? <View style={s.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.rename')} onPress={() => { tapHaptic(); setDraft(item.title); setRenamingId(item.id); }} style={s.menuButton}><ThemedText style={s.count}>{t('comicDiary.rename')}</ThemedText></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.delete')} onPress={() => { tapHaptic('warn'); onDelete(item.id); }} style={s.menuButton}><ThemedText style={[s.count, { color: '#555555' }]}>{t('comicDiary.delete')}</ThemedText></Pressable>
            </View> : null}
            {renamingId === item.id ? <View style={s.rename}>
              <ThemedTextInput accessibilityLabel={t('comicDiary.rename')} value={draft} onChangeText={setDraft} maxLength={60} autoFocus selectTextOnFocus onSubmitEditing={save} returnKeyType="done" style={s.renameInput} />
              <View style={s.actions}><Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => { tapHaptic(); setRenamingId(null); }} style={s.menuButton}><ThemedText style={s.count}>{t('common.cancel')}</ThemedText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t('common.save')} disabled={!draft.trim()} accessibilityState={{ disabled: !draft.trim() }} onPress={save} style={s.menuButton}><ThemedText style={s.count}>{t('common.save')}</ThemedText></Pressable></View>
            </View> : null}
          </View>;
        }} />
        <ThemedText style={s.footer}>{t('comicDiary.total', { count: diaries.length })}</ThemedText>
      </KeyboardAvoidingView>
    </View>
  </AppModal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }, paper: { width: '87%', maxWidth: 420, flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 17 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, heading: { color: '#252525', fontSize: 24, flex: 1 }, touch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, close: { color: '#343434', fontSize: 30 },
  create: { alignSelf: 'stretch', marginBottom: 18 }, action: { color: '#272727', fontSize: 19 }, search: { borderBottomWidth: 0.6, borderColor: '#A5A5A5', color: '#303030', minHeight: 44, fontSize: 15, marginBottom: 14 }, list: { gap: 12, paddingBottom: 12 },
  rowPaper: { backgroundColor: '#FFFFFF', padding: 7 }, row: { flexDirection: 'row', alignItems: 'center' }, open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 3, minWidth: 0 }, cover: { width: 64, height: 68 }, title: { color: '#303030', fontSize: 17, lineHeight: 24 }, count: { color: '#727272', fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 6 }, menuButton: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 10 }, rename: { paddingHorizontal: 6, paddingVertical: 8 }, renameInput: { color: '#303030', fontSize: 17, minHeight: 44, borderBottomWidth: 0.6, borderColor: '#A5A5A5' }, footer: { color: '#818181', textAlign: 'center', fontSize: 13, paddingVertical: 12 }, empty: { color: '#818181', fontSize: 15, textAlign: 'center', paddingVertical: 36 },
});
