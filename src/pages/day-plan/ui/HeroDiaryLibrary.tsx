import { loadComicCharacterName } from '../lib/heroCharacterName';
import { SettingsPenIcon } from '../../settings/lib/settingsPen';
import { COMIC_SCENES } from '../lib/heroSceneImages';
import { useState } from 'react';
import Svg, { Path } from 'react-native-svg';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppModal } from '@shared/ui/app-modal';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { penContour } from '@shared/ui/pen-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { COMIC_CHARACTERS } from '../lib/heroCharacters';
import { HeroEmptySceneIcon } from './HeroEmptySceneIcon';
import { HeroEmptyDiaryIcon } from './HeroEmptyDiaryIcon';
import { HeroCreateDiaryIcon } from './HeroCreateDiaryIcon';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import type { ComicDiary } from '../lib/heroDiaryStorage';
import { ComicSceneImage } from './HeroSceneImage';

function SearchPenLine() {
  const [width, setWidth] = useState(320);
  return <View pointerEvents="none" style={s.searchLine} onLayout={({ nativeEvent: { layout } }) => {
    if (layout.width > 0) setWidth(previous => previous === layout.width ? previous : layout.width);
  }}>
    <Svg width="100%" height={5} viewBox={`0 0 ${width} 5`} accessible={false}>
      <Path d={penContour([[1.5, 2.8], [width * 0.22, 2.4], [width * 0.48, 2.9], [width * 0.76, 2.5], [width - 1.5, 2.7]], 1.6, 0.6)} fill="#555A4F" />
    </Svg>
  </View>;
}

function writtenStamp(diary: Pick<ComicDiary, 'createdAt' | 'updatedAt'>): { date: string; time: string } | null {
  const ms = diary.updatedAt > 0 ? diary.updatedAt : diary.createdAt;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const date = new Date(ms);
  return {
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  };
}

/** `10/26 · 제목`이면 `10/26 15:41 · 제목`. 날짜로 시작하지 않으면 앞에 붙인다. */
function titleWithWrittenTime(title: string, stamp: { date: string; time: string } | null): string {
  if (!stamp) return title;
  const [month, day] = stamp.date.split('/');
  const dated = new RegExp(`^0?${month}/0?${day}(?!\\s+\\d{1,2}:\\d{2})`);
  if (dated.test(title)) return title.replace(dated, `${stamp.date} ${stamp.time}`);
  return title ? `${stamp.date} ${stamp.time} · ${title}` : `${stamp.date} ${stamp.time}`;
}

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
  const characterNameFor = (diary: ComicDiary) => diary.characterName?.trim() || loadComicCharacterName(diary.characterId) || t((COMIC_CHARACTERS.find(character => character.id === diary.characterId) ?? COMIC_CHARACTERS[0]).name);
  const searchQuery = query.trim().toLocaleLowerCase();
  const filtered = diaries.filter(diary => [diary.title, characterNameFor(diary)].some(value => value.toLocaleLowerCase().includes(searchQuery)));
  const createDiary = () => { tapHaptic(); onCreate(); };
  return <AppModal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.overlay}>
      <Pressable accessibilityLabel={t('common.close')} style={StyleSheet.absoluteFill} onPress={() => { tapHaptic(); onClose(); }} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[s.paper, { paddingTop: Math.max(insets.top, 16), paddingBottom: Math.max(insets.bottom, 16) }]}>
        <PaperGrain opacity={0.24} /><HanddrawnFrame color="#939393" />
        <View style={s.header}><ThemedText style={s.heading}>{t('comicDiary.library')}</ThemedText><Pressable accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); onClose(); }} style={s.touch}><ThemedText style={s.close}>×</ThemedText></Pressable></View>
        <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.create')} onPress={createDiary} style={s.create}><HeroCreateDiaryIcon variant="stack" size={32} /></Pressable>
        <View style={s.searchRow}>
          <Svg pointerEvents="none" width={21} height={21} viewBox="0 0 24 24" accessible={false}>
            <Path d="M10.1 3.5C6.3 3.3 3.4 6.3 3.5 10.1C3.4 13.8 6.5 16.7 10.2 16.5C14 16.6 16.8 13.5 16.5 9.9C16.5 6.2 13.8 3.4 10.1 3.5ZM14.8 15L20.6 20.9" fill="none" stroke="#72766F" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
          <ThemedTextInput accessibilityLabel={t('comicDiary.search')} value={query} onChangeText={setQuery} style={s.search} />
          <SearchPenLine />
        </View>
        <FlatList data={filtered} keyExtractor={diary => diary.id} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[s.list, filtered.length === 0 && s.listEmpty]} ListEmptyComponent={query.trim() ? <ThemedText style={s.empty}>{t('comicDiary.noResults')}</ThemedText> : <Pressable testID="comic-empty-diary-create" accessibilityRole="button" accessibilityLabel={t('comicDiary.create')} onPress={createDiary} style={s.emptyIconButton}><HeroEmptyDiaryIcon /></Pressable>} renderItem={({ item }) => {
          const first = item.scenes[0];
          const source = first?.artworkUri ? { uri: first.artworkUri } : first ? COMIC_SCENE_THUMBNAILS[first.image] : COMIC_CHARACTERS.find(character => character.id === item.characterId)!.cover;
          const heading = titleWithWrittenTime(item.title, writtenStamp(item));
          const characterName = characterNameFor(item);
          return <View style={s.rowPaper}>
            <HanddrawnFrame color={activeId === item.id ? '#171510' : '#B9B9B9'} bold={activeId === item.id} />
            <View style={s.row}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.open', { title: heading })} accessibilityHint={characterName} accessibilityState={{ selected: activeId === item.id }} onPress={() => { tapHaptic(); onOpen(item.id); }} style={s.open}>
                <ComicSceneImage imageKey={`diary:${item.id}:${first?.image ?? 'cover'}`} source={source} fallbackSource={first ? COMIC_SCENES.find(scene => scene.id === first.image)!.source : COMIC_CHARACTERS.find(character => character.id === item.characterId)!.preview[0].source} style={s.cover} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <ThemedText numberOfLines={2} style={s.title}>{heading}</ThemedText>
                  <View style={s.metadata}>
                    <ThemedText numberOfLines={1} style={s.characterName}>{characterName}</ThemedText>
                    <ThemedText style={s.count}>·</ThemedText>
                    {item.scenes.length ? <ThemedText style={s.count}>{t('comicDiary.sceneCount', { count: item.scenes.length })}</ThemedText> : <HeroEmptySceneIcon color="#777" size={24} />}
                  </View>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.manage', { title: item.title })} accessibilityState={{ expanded: menuId === item.id }} style={s.touch} onPress={() => { tapHaptic('select'); setRenamingId(null); setMenuId(menuId === item.id ? null : item.id); }}><Svg width={19} height={15} viewBox="0 0 19 15" accessible={false}>
                <Path d="M3.1 6.2C4.4 6 4.6 7.1 4.3 7.9C3.9 8.7 2.6 8.5 2.5 7.6C2.3 6.9 2.5 6.4 3.1 6.2Z M9.3 6.1C10.5 6.2 10.6 7.5 10 8.1C9.4 8.7 8.2 8.3 8.3 7.4C8.2 6.7 8.6 6.1 9.3 6.1Z M15.1 6.2C16.2 6 16.8 7.2 16.2 8C15.7 8.8 14.3 8.3 14.3 7.5C14.2 6.8 14.5 6.4 15.1 6.2Z" fill="#363636" />
              </Svg></Pressable>
            </View>
            {menuId === item.id && renamingId !== item.id ? <View style={s.actions}>
              <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.rename')} onPress={() => { tapHaptic(); setDraft(item.title); setRenamingId(item.id); }} style={s.menuButton}><SettingsPenIcon name="pencil" size={25} color="#303030" /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('comicDiary.delete')} onPress={() => { tapHaptic('warn'); onDelete(item.id); }} style={s.menuButton}><SettingsPenIcon name="trash.fill" size={25} color="#303030" /></Pressable>
            </View> : null}
            {renamingId === item.id ? <View style={s.rename}>
              <ThemedTextInput accessibilityLabel={t('comicDiary.rename')} value={draft} onChangeText={setDraft} maxLength={60} autoFocus selectTextOnFocus onSubmitEditing={save} returnKeyType="done" style={s.renameInput} />
              <View style={s.actions}><Pressable accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => { tapHaptic(); setRenamingId(null); }} style={s.menuButton}><ThemedText style={s.count}>{t('common.cancel')}</ThemedText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t('common.save')} disabled={!draft.trim()} accessibilityState={{ disabled: !draft.trim() }} onPress={save} style={s.menuButton}><ThemedText style={s.count}>{t('common.save')}</ThemedText></Pressable></View>
            </View> : null}
          </View>;
        }} />
        <ThemedText accessibilityRole="text" accessibilityLabel={t('comicDiary.total', { count: diaries.length })} style={s.footer}>{diaries.length}</ThemedText>
      </KeyboardAvoidingView>
    </View>
  </AppModal>;
}
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }, paper: { width: '87%', maxWidth: 420, flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 17 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, heading: { color: '#252525', fontSize: 24, flex: 1 }, touch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, close: { color: '#343434', fontSize: 30 },
  create: { alignSelf: 'flex-start', width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, action: { color: '#272727', fontSize: 19 }, searchRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 14 }, searchLine: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 5 }, search: { flex: 1, minWidth: 0, color: '#303030', minHeight: 44, fontSize: 15 }, list: { gap: 12, paddingBottom: 12 }, listEmpty: { flexGrow: 1, justifyContent: 'center' }, emptyIconButton: { alignItems: 'center', justifyContent: 'center', paddingVertical: 28 },
  rowPaper: { backgroundColor: '#FFFFFF', padding: 7 }, row: { flexDirection: 'row', alignItems: 'center' }, open: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 3, minWidth: 0 }, cover: { width: 64, height: 68 }, title: { color: '#303030', fontSize: 17, lineHeight: 24 }, count: { color: '#727272', fontSize: 13, lineHeight: 20 },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }, characterName: { color: '#4C5149', fontSize: 14, lineHeight: 20, flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingTop: 6 }, menuButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }, rename: { paddingHorizontal: 6, paddingVertical: 8 }, renameInput: { color: '#303030', fontSize: 17, minHeight: 44, borderBottomWidth: 0.6, borderColor: '#A5A5A5' }, footer: { color: '#25231F', textAlign: 'center', fontSize: 22, lineHeight: 30, paddingVertical: 10 }, empty: { color: '#818181', fontSize: 15, textAlign: 'center', paddingVertical: 36 },
});
