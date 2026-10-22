import { ComicTodoViewport } from './ComicTodoViewport';
import { ComicMemoField } from './ComicMemoField';
import { ComicDiaryLibrary } from './ComicDiaryLibrary';
import { createComicDiary, deleteComicDiary, loadComicDiaryLibrary, saveComicDiaryLibrary, updateComicDiary, type ComicDiary, type ComicDiaryLibrary as LibraryState } from '../lib/comicDiaryStorage';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { clearComicNavigation, loadComicNavigation, saveComicNavigation } from '../lib/comicNavigation';
import { ComicSceneImage } from './ComicSceneImage';
import { COMIC_SCENE_THUMBNAILS } from '../lib/comicSceneThumbnails';
import { ComicCheck } from './ComicCheck';
import { loadComicCharacterName, saveComicCharacterName } from '../lib/comicCharacterName';
import { ComicCharacterChooser } from './ComicCharacterChooser';
import { COMIC_CHARACTERS, type ComicCharacter } from '../lib/comicCharacters';
import Svg, { Path } from 'react-native-svg';
import { AppAlert as Alert } from '@shared/lib/app-alert';
import { AppModal as Modal } from '@shared/ui/app-modal';
import { ComicScenePicker } from './ComicScenePicker';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { PaperGrain } from '@shared/ui/paper-grain';
import { newComicScene, type ComicDayScene } from '../lib/comicDayStorage';
import { ComicDayBoard } from './ComicDayBoard';

type PlannerProps = { date: string; ink: string; muted: string; isDark: boolean; onTitleChange?: (title: string | null) => void };
export type ComicDiaryHandle = { openLibrary: () => void; renameDiary: () => void };
export const IndependentComicPlanner = forwardRef<ComicDiaryHandle, PlannerProps>(function IndependentComicPlanner(props, ref) {
  const { onTitleChange } = props;
  const { t } = useTranslation();
  const [library, setLibrary] = useState(() => loadComicDiaryLibrary(props.date, number => t('comicDiary.defaultTitle', { number })));
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const diary = library.diaries.find(item => item.id === library.activeId);
  const character = COMIC_CHARACTERS.find(item => item.id === diary?.characterId);
  const commit = (next: LibraryState) => { saveComicDiaryLibrary(next); setLibrary(next); };
  const openLibrary = useCallback(() => { setRenameTarget(null); setLibraryOpen(true); }, []);
  const renameDiary = useCallback(() => { setRenameTarget(diary?.id ?? null); setLibraryOpen(true); }, [diary?.id]);
  useImperativeHandle(ref, () => ({ openLibrary, renameDiary }), [openLibrary, renameDiary]);
  useEffect(() => { onTitleChange?.(creating ? null : diary?.title ?? null); }, [creating, diary?.title, onTitleChange]);
  const create = (next: ComicCharacter) => {
    let number = library.diaries.length + 1;
    for (let attempt = 0; attempt <= library.diaries.length && library.diaries.some(item => item.title === t('comicDiary.defaultTitle', { number })); attempt++) number++;
    const nextLibrary = createComicDiary(library, next.id, t('comicDiary.defaultTitle', { number }));
    saveComicNavigation(next.id, 'picker', nextLibrary.activeId!);
    commit(nextLibrary); setCreating(false);
  };
  const remove = (id: string) => {
    const target = library.diaries.find(item => item.id === id);
    if (!target) return;
    Alert.alert(t('comicDiary.delete'), t('comicDiary.deleteMessage', { title: target.title }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => {
        const next = deleteComicDiary(library, id);
        const active = next.diaries.find(item => item.id === next.activeId);
        if (active) saveComicNavigation(active.characterId, 'board', active.id); else clearComicNavigation();
        commit(next);
      } },
    ], { cancelable: true });
  };
  return <View style={{ flex: 1 }}>
    {diary && character && !creating ? <CharacterComicPlanner key={diary.id} {...props} diary={diary} character={character}
      onUpdate={scenes => commit(updateComicDiary(library, diary.id, { scenes }))}
      onSelectCharacter={() => { clearComicNavigation(); setCreating(true); }} /> : <>
      <ComicCharacterChooser ink={props.ink} muted={props.muted} isDark={props.isDark} onStart={create} />
    </>}
    {libraryOpen ? <ComicDiaryLibrary diaries={library.diaries} activeId={library.activeId} initialRenameId={renameTarget}
      onClose={() => setLibraryOpen(false)} onCreate={() => { setCreating(true); setLibraryOpen(false); }}
      onOpen={id => { const opened = library.diaries.find(item => item.id === id)!; saveComicNavigation(opened.characterId, 'board', id); commit({ ...library, activeId: id }); setCreating(false); setLibraryOpen(false); }}
      onRename={(id, title) => commit(updateComicDiary(library, id, { title }))} onDelete={remove} /> : null}
  </View>;
});
function CharacterComicPlanner({ ink, muted, isDark, character, diary, onUpdate, onSelectCharacter }: PlannerProps & { diary: ComicDiary; onUpdate: (scenes: ComicDayScene[]) => void; character: ComicCharacter; onSelectCharacter: () => void }) {
  const { t } = useTranslation();
  const [customName, setCustomName] = useState(() => loadComicCharacterName(character.id));
  const [renameOpen, setRenameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const rename = () => { setNameDraft(customName ?? t(character.name)); setRenameOpen(true); };
  const saveName = () => {
    const name = saveComicCharacterName(character.id, nameDraft);
    if (name) { setCustomName(name); setRenameOpen(false); }
  };
  const [scenes, setScenes] = useState(() => diary.scenes);
  const [pickerOpen, setPickerOpen] = useState(() => { const nav = loadComicNavigation(); return nav?.screen === 'picker' && (!nav.diaryId || nav.diaryId === diary.id); });
  const showPicker = (open: boolean) => { saveComicNavigation(character.id, open ? 'picker' : 'board', diary.id); setPickerOpen(open); };
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [todoDraft, setTodoDraft] = useState('');
  const [slide] = useState(() => new Animated.Value(1));
  const insets = useSafeAreaInsets();
  const closing = useRef(false);
  const { width } = useWindowDimensions();
  const selected = scenes.find(scene => scene.id === selectedId);
  const update = (next: ComicDayScene[]) => { setScenes(next); onUpdate(next); };
  const patch = (id: string, fields: Partial<ComicDayScene>) => update(scenes.map(scene => scene.id === id ? { ...scene, ...fields } : scene));
  useEffect(() => () => slide.stopAnimation(), [slide]);
  const open = (id: string) => {
    closing.current = false; slide.setValue(1); setTodoDraft(''); setSelectedId(id);
  };
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(slide, { toValue: 1, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => { if (finished) setSelectedId(null); closing.current = false; });
  };
  const removeScene = (id: string) => Alert.alert(t('comicDay.deleteScene'), `${scenes.find(scene => scene.id === id)?.title ?? ''}\n\n${t('comicDay.deleteHint')}`, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('comicDay.deleteScene'), style: 'destructive', onPress: () => {
      update(scenes.filter(scene => scene.id !== id));
      if (selectedId === id) setSelectedId(null);
    } },
  ], { cancelable: true });
  const removeScenes = (ids: string[]) => {
    const keys = new Set(ids.filter(id => scenes.some(scene => scene.id === id)));
    if (!keys.size) return;
    Alert.alert(t('comicDay.deleteSelected', { count: keys.size }), t('comicDay.deleteSelectedHint', { count: keys.size }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('comicDay.deleteSelected', { count: keys.size }), style: 'destructive', onPress: () => {
        update(scenes.filter(scene => !keys.has(scene.id)));
        if (selectedId && keys.has(selectedId)) setSelectedId(null);
      } },
    ], { cancelable: true });
  };
  const addTodo = () => {
    if (!selected || !todoDraft.trim()) return;
    patch(selected.id, { todos: [...selected.todos, { id: newComicScene('').id, text: todoDraft.trim(), completed: false }] });
    setTodoDraft('');
  };
  return <View style={{ flex: 1, backgroundColor: isDark ? '#262B28' : '#F7F6F4' }}>
    <ComicDayBoard diaryTitle={diary.title} characterName={customName ?? t(character.name)} onRenameCharacter={rename} onSelectCharacter={onSelectCharacter} items={scenes.map(scene => ({ key: scene.id, label: scene.title, memo: scene.memo, icon: '', faceColor: scene.paper, inkColor: scene.pen }))}
      ink={ink} muted={muted} isDark={isDark} choices={Object.fromEntries(scenes.map(scene => [scene.id, scene.image]))}
      onOpen={open}
      onRemove={removeScene}
      onRemoveMany={removeScenes}
      onAdd={() => showPicker(true)} />
    {pickerOpen ? <ComicScenePicker library={character.scenes} scenes={scenes} onChange={update} onClose={() => showPicker(false)} /> : null}
    <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.renameOverlay}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={() => { tapHaptic(); setRenameOpen(false); }} />
        <View style={s.renamePaper}>
          <PaperGrain opacity={0.25} /><HanddrawnFrame color="#777D73" />
          <ThemedText style={{ color: '#202020', fontSize: 19 }}>{t('comicDay.character.rename')}</ThemedText>
          <ThemedTextInput accessibilityLabel={t('comicDay.character.rename')} value={nameDraft} onChangeText={setNameDraft} maxLength={24} autoFocus selectTextOnFocus onSubmitEditing={saveName} returnKeyType="done" style={s.renameInput} />
          <View style={s.renameActions}>
            <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); setRenameOpen(false); }} style={s.renameButton}><HanddrawnFrame color="#777D73" /><ThemedText style={{ color: '#202020' }}>{t('common.cancel')}</ThemedText></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !nameDraft.trim() }} disabled={!nameDraft.trim()} onPress={() => { tapHaptic('confirm'); saveName(); }} style={[s.renameButton, { backgroundColor: '#C8EBDD', opacity: nameDraft.trim() ? 1 : 0.4 }]}><HanddrawnFrame color="#777D73" /><ThemedText style={{ color: '#202020' }}>{t('common.save')}</ThemedText></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    <Modal visible={!!selected} transparent animationType="none" onRequestClose={close} onShow={() => Animated.timing(slide, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()}>
      {selected ? <View style={[s.overlay, { paddingTop: Math.max(insets.top, 12), paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); close(); }} />
        <Animated.View style={[s.drawer, { width: Math.min(width * 0.93, 580), backgroundColor: selected.paper, transform: [{ translateX: slide.interpolate({ inputRange: [0, 1], outputRange: [0, width] }) }] }]}>
          <PaperGrain />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.head}><ThemedText style={{ color: selected.pen }}>{t('comicDay.sceneNumber', { number: String(scenes.indexOf(selected) + 1).padStart(2, '0') })}</ThemedText><Pressable accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); close(); }} style={s.touch}><ThemedText style={{ fontSize: 28, color: selected.pen }}>×</ThemedText></Pressable></View>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
              <ThemedTextInput accessibilityLabel={t('comicDay.sceneTitle')} value={selected.title} onChangeText={title => patch(selected.id, { title })} style={[s.title, { color: selected.pen }]} maxLength={80} placeholder={t('comicDay.sceneTitle')} placeholderTextColor="#888" />
              <ComicSceneImage contentFit="contain" backgroundColor={selected.paper} imageKey={`${selected.image}:original`} source={(character.scenes.find(scene => scene.id === selected.image) ?? character.scenes[0]).source} style={{ width: '100%', height: Math.min(width * 1.05, 440) }} />
              <ThemedText style={[s.section, { color: selected.pen }]}>{t('comicDay.change')}</ThemedText>
              <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
                {character.scenes.map(scene => <Pressable key={scene.id} accessibilityLabel={t(scene.label)} accessibilityState={{ selected: scene.id === selected.image }} onPress={() => { tapHaptic('select'); patch(selected.id, { image: scene.id }); }} style={{ width: 76, padding: 3, borderWidth: 2, borderColor: scene.id === selected.image ? '#8DDAC2' : 'transparent' }}>
                  <ComicSceneImage imageKey={`${scene.id}:small`} source={COMIC_SCENE_THUMBNAILS[scene.id]?.small ?? scene.source} fallbackSource={scene.source} style={{ width: 64, height: 45 }} />
                  <ThemedText numberOfLines={1} style={{ color: selected.pen, fontSize: 11 }}>{t(scene.label)}</ThemedText>
                </Pressable>)}
              </ScrollView>
              <ThemedText style={[s.section, { color: selected.pen }]}>{t('comicDay.memo')}</ThemedText>
              <ComicMemoField key={`${selected.id}:memo`} value={selected.memo} ink={selected.pen} onChangeText={memo => patch(selected.id, { memo })} />
              <ThemedText style={[s.section, { color: selected.pen }]}>{t('comicDay.todos')}</ThemedText>
              <View style={s.todoEntry}>
                <ThemedTextInput accessibilityLabel={t('comicDay.todoHint')} placeholder={t('comicDay.todoHint')} placeholderTextColor="#888" value={todoDraft} onChangeText={setTodoDraft} onSubmitEditing={addTodo} returnKeyType="done" submitBehavior="submit" style={{ flex: 1, color: selected.pen, fontSize: 16, minHeight: 44 }} />
                <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.addTodo')} disabled={!todoDraft.trim()} accessibilityState={{ disabled: !todoDraft.trim() }} style={[s.touch, { opacity: todoDraft.trim() ? 1 : 0.35 }]} onPress={() => { tapHaptic(); addTodo(); }}><ThemedText style={{ color: selected.pen, fontSize: 28 }}>⊕</ThemedText></Pressable>
              </View>
              <ComicTodoViewport key={`${selected.id}:todos`}>{selected.todos.map(todo => <View key={todo.id} style={s.todo}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: todo.completed }} accessibilityLabel={todo.text || t('comicDay.todos')} style={s.touch} onPress={() => { tapHaptic('select'); patch(selected.id, { todos: selected.todos.map(item => item.id === todo.id ? { ...item, completed: !item.completed } : item) }); }}><ComicCheck checked={todo.completed} size={27} /></Pressable>
                <ThemedTextInput value={todo.text} placeholder={t('comicDay.todoHint')} placeholderTextColor="#888" accessibilityLabel={t('comicDay.todos')} onChangeText={text => patch(selected.id, { todos: selected.todos.map(item => item.id === todo.id ? { ...item, text } : item) })} style={{ flex: 1, color: selected.pen, fontSize: 16, minHeight: 44 }} />
                <Pressable accessibilityLabel={t('comicDay.deleteTodo')} style={s.touch} onPress={() => { tapHaptic('warn'); patch(selected.id, { todos: selected.todos.filter(item => item.id !== todo.id) }); }}><ThemedText style={{ color: selected.pen }}>×</ThemedText></Pressable>
              </View>)}</ComicTodoViewport>
              <View style={s.palette}>
                <Svg width={48} height={25} viewBox="0 0 48 25" accessible={false}>
                  <Path d="M2.5 6.1L14.1 5L15.5 22.1L2.4 23.2Z" fill="#85877D" opacity={0.13} />
                  <Path d="M5 2.7L17.4 3.3L17 17.9L12.2 22L4.3 21.3Z" fill="#F5F4EE" />
                  <Path d="M4.8 2.9C8.8 2.5 13.2 3.6 17.3 3.1L17.1 10.2L16.8 18L12 22.1L4.1 21.5L4.5 12.7Z M12 21.7L12.2 17.4L16.8 18.1 M2.3 5L1.7 23L10.2 23.3" stroke={selected.pen} strokeWidth={0.85} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M5.2 2.2L16.8 2.8M18 5L17.6 16.3M4.8 7L4.2 20.5M2.8 7L2.2 21.8 M7.3 7L13.9 7.5M7.1 9.7L14.2 10.1M6.8 12.5L12.6 12.9M7.4 7.7L12.3 8M7.1 13.2L10.6 13.5" stroke={selected.pen} strokeWidth={0.4} fill="none" opacity={0.65} strokeLinecap="round" />
                  <Path d="M27.3 17.9L38.9 4.5L43.1 7.8L31.3 21.1L26.1 22.5Z" fill="#D4D5CA" opacity={0.45} />
                  <Path d="M27 18.1L39.4 4L43.4 7.3L31.5 21.3L26.2 22.6Z M37.5 6.3L41.5 9.4M27.2 18L31.3 21.1M39.2 4.1L40.7 2.2Q41.2 1.7 42 2.3L45 4.7L43.3 7.3" stroke={selected.pen} strokeWidth={0.85} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <Path d="M27 19.3L26.1 22.7L29.5 21.7Z" fill={selected.pen} opacity={0.8} />
                  <Path d="M29 18.3L39.6 6.7M30 19L40.5 7.6M28.3 18L38.5 6.2M28 16.1L37.1 5.7M32.4 21L42.7 9M40.4 3.1L43.7 5.7M26.8 23.2L30.8 22.1 M6.4 18.6L10.1 19.1M6.4 19.6L9 20M29 15.1L30.8 16.3M32 11.8L33.3 12.8M34.3 9L35.6 10.2" stroke={selected.pen} strokeWidth={0.35} fill="none" strokeLinecap="round" opacity={0.5} />
                </Svg>
                <View style={s.paletteDivider} />
                <ScrollView horizontal nestedScrollEnabled showsHorizontalScrollIndicator={false} style={s.paletteScroller} contentContainerStyle={s.paletteScroll}>
                  {(['paper', 'pen'] as const).map((kind, groupIndex) => <View key={kind} style={s.paletteGroup}>
                    {groupIndex === 1 ? <View style={s.paletteDivider} /> : null}
                    {(kind === 'paper' ? ['#FFFFFF', '#C8EBDD', '#F8DEDF', '#F8E7B4', '#D5E3F6'] : ['#202020', '#60605E', '#66564F', '#243044', '#3A4634']).map(color => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`${t(kind === 'paper' ? 'comicDay.paper' : 'comicDay.pen')} ${color}`} accessibilityState={{ selected: selected[kind] === color }} onPress={() => { tapHaptic('select'); patch(selected.id, { [kind]: color }); }} hitSlop={3} style={s.colorTouch}>
                      <View style={[s.colorRing, { borderColor: selected[kind] === color ? '#8DDAC2' : 'transparent' }]}>
                        <View style={[s.swatch, { backgroundColor: color }]} />
                      </View>
                    </Pressable>)}
                  </View>)}
                </ScrollView>
              </View>
              <ThemedText style={s.encourage}>{t('comicDay.encourage')}</ThemedText>
              <Pressable onPress={() => { tapHaptic('warn'); removeScene(selected.id); }}><ThemedText style={{ color: '#777', textAlign: 'right', fontSize: 12 }}>{t('comicDay.deleteScene')}</ThemedText></Pressable>
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </View> : null}
    </Modal>
  </View>;
}
const s = StyleSheet.create({
  renameOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.18)' }, renamePaper: { width: '100%', maxWidth: 340, padding: 20, backgroundColor: '#FFFFFF' }, renameInput: { minHeight: 48, fontSize: 21, color: '#202020', marginVertical: 14, borderBottomWidth: 0.5, borderColor: '#999' }, renameActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }, renameButton: { minHeight: 38, minWidth: 60, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.17)', alignItems: 'flex-end', paddingTop: 55, paddingBottom: 24 },
  drawer: { flex: 1, overflow: 'hidden', borderTopLeftRadius: 8, borderBottomLeftRadius: 16 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8 },
  touch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, paddingBottom: 24 }, title: { fontSize: 23, minHeight: 44 }, 
  section: { fontSize: 19, marginTop: 22, marginBottom: 8 },
  todoEntry: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.7, borderColor: '#999', marginBottom: 4 }, todo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 0.5, borderColor: '#B6B6B0', minHeight: 48 },
  palette: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 18 },
  paletteScroller: { flex: 1, minWidth: 0 },
  paletteScroll: { alignItems: 'center', gap: 4, paddingRight: 8 },
  paletteGroup: { flexDirection: 'row', gap: 2, alignItems: 'center' },
  paletteDivider: { height: 21, width: 0.5, backgroundColor: '#B6B6B0', marginHorizontal: 4 },
  colorTouch: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  colorRing: { width: 27, height: 27, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 0.7, borderColor: '#777' },
  encourage: { color: '#888', textAlign: 'center', paddingVertical: 16, borderTopWidth: 0.5, borderColor: '#B6B6B0', fontSize: 14 },
});
