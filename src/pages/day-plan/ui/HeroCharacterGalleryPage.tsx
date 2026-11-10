import { HeroHistorySceneDetail } from './HeroHistorySceneDetail';
import { HeroPremiumPackDeleteButton } from './HeroPremiumPackDeleteButton';
import { premiumSceneTitle, PREMIUM_CHARACTER_ID, loadPremiumPack } from '../lib/heroPremiumPack';
import { AppWallpaperBackground } from '@shared/ui/app-wallpaper';
import { HeroPolaroidSurface, HeroPhotoEmulsion } from './HeroPolaroidSurface';
import { moveHeroCharacter, readHeroCharacterOrder, saveHeroCharacterOrder } from '../lib/heroCharacterOrder';
import { saveHeroSceneTitle, useHeroSceneTitles } from '../lib/heroSceneTitle';
import { BackChevron } from '@shared/ui/icon-symbol';
import { loadHeroOriginalPhotoLibrary, deleteHeroOriginalPhotoLibraryImages } from '../lib/heroOriginalPhoto';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Image as NativeImage, type ImageSourcePropType, Alert, AppState, Animated, BackHandler, FlatList, PanResponder, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useAnimatedValue, useWindowDimensions } from 'react-native';
import { useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useTranslation, type I18nKey } from '@shared/lib/i18n';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { AppModal } from '@shared/ui/app-modal';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { SELECTABLE_COMIC_CHARACTERS } from '../lib/heroCharacters';
import { COMIC_SCENE_THUMBNAILS } from '../lib/heroSceneThumbnails';
import { saveComicCharacterName, useComicCharacterNames } from '../lib/heroCharacterName';
import { deleteHeroAiLibraryImages, loadHeroAiLibrary, subscribeHeroAiLibrary, type HeroAiLibraryImage } from '../lib/heroAiLibrary';
import type { ImageProps } from 'expo-image';
import { formatHeroPolaroidDate } from './HeroPolaroidExport';
import { ComicCheck } from './HeroCheck';
import { ComicSceneImage } from './HeroSceneImage';
import { HeroImageActions } from './HeroImageActions';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';

type Scene = { id: string; label: I18nKey; source: ImageProps['source']; title?: string; memo?: string; createdAt?: number; generated?: boolean };
type GalleryCharacter = { id: string; name: I18nKey; scenes: readonly Scene[]; preview: readonly Scene[] };
const GENERATED_ID = 'generated-illustrations';
const ORIGINAL_ID = 'original-photos';
export function HeroCharacterGalleryPage({ initialGenerated = false, onExit, onSelectGenerated }: { initialGenerated?: boolean; onExit?: () => void; onSelectGenerated?: (image: HeroAiLibraryImage) => void } = {}) {
  const { t } = useTranslation();
  const nameFor = useComicCharacterNames();
  const sceneTitleFor = useHeroSceneTitles();
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const dark = useColorScheme() === 'dark';
  const paper = dark ? '#262B28' : '#FFFFFF', ink = dark ? '#EEECE6' : '#252A26';
  const printPaper = dark ? '#E8E4DC' : '#FFFEFA';
  const printInk = '#30332D';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const [character, setCharacter] = useState<GalleryCharacter | null>(() => initialGenerated ? { id: GENERATED_ID, name: 'comicDay.gallery.generated', scenes: [], preview: [] } : null);
  const [generatedScenes, setGeneratedScenes] = useState<Scene[]>([]);
  const [originalScenes, setOriginalScenes] = useState<Scene[]>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [photoRatios, setPhotoRatios] = useState<Record<string, number>>({});
  useEffect(() => {
    let live = true;
    for (const scene of [...originalScenes, ...generatedScenes]) {
      const uri = scene.source && typeof scene.source === 'object' && 'uri' in scene.source ? scene.source.uri : undefined;
      if (!uri || photoRatios[scene.id]) continue;
      NativeImage.getSize(uri, (w, h) => { if (live && w > 0 && h > 0) setPhotoRatios(previous => ({ ...previous, [scene.id]: w / h })); }, () => {});
    }
    return () => { live = false; };
  }, [originalScenes, generatedScenes, photoRatios]);

  const [premiumScenes, setPremiumScenes] = useState<Scene[]>([]);
  const toPremiumScenes = (images: { id: string; uri: string }[]): Scene[] => images.map(image => ({ id: image.id, source: { uri: image.uri }, label: 'comicDay.character.one', title: premiumSceneTitle(image.id) }));
  useEffect(() => {
    if (!focused) return;
    let live = true;
    void loadPremiumPack().then(images => { if (live) setPremiumScenes(toPremiumScenes(images)); });
    return () => { live = false; };
  }, [focused]);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const cancelDeletion = () => { setDeleting(false); setSelected([]); };
  const confirmDeletion = () => {
    if (!selected.length) return;
    tapHaptic();
    Alert.alert(t('comicDay.gallery.delete'), t('comicDay.gallery.deleteMessage', { count: selected.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => {
        if (character?.id === ORIGINAL_ID) {
          deleteHeroOriginalPhotoLibraryImages(selected);
          setOriginalScenes(items => items.filter(item => !selected.includes(item.id)));
        } else {
          deleteHeroAiLibraryImages(selected);
          setGeneratedScenes(items => items.filter(item => !selected.includes(item.id)));
        }
        cancelDeletion(); tapHaptic('confirm');
      } },
    ]);
  };
  useEffect(() => {
    if (!focused) return;
    let live = true, revision = 0;
    const refresh = async () => {
      const request = ++revision;
      try {
        const [generatedResult, originalResult] = await Promise.allSettled([loadHeroAiLibrary(), loadHeroOriginalPhotoLibrary()]);
        if (live && request === revision) {
          if (generatedResult.status === 'fulfilled') setGeneratedScenes(generatedResult.value.map(image => ({ id: image.uri, source: { uri: image.uri }, label: 'comicDay.gallery.generated', title: image.title, memo: image.memo, createdAt: image.createdAt, generated: true })));
          if (originalResult.status === 'fulfilled') setOriginalScenes(originalResult.value.map(image => ({ id: image.uri, source: { uri: image.uri }, label: 'comicDay.gallery.originalPhotos', title: image.title, memo: image.memo, createdAt: image.createdAt, generated: true })));
          if (generatedResult.status === 'fulfilled' && originalResult.status === 'fulfilled') setCollectionsLoaded(true);
        }
      } catch { /* Preserve the last successful collection on a transient read failure. */ }
    };
    void refresh();
    const unsubscribe = subscribeHeroAiLibrary(() => { void refresh(); });
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { live = false; unsubscribe(); subscription.remove(); };
  }, [focused]);
  const [preview, setPreview] = useState<Scene | null>(null);
  const [editing, setEditing] = useState<GalleryCharacter | null>(null);
  const [draft, setDraft] = useState('');
  // Put aliases in the list data so virtualized cells receive a changed item
  // when a name is saved, including cells cached outside the visible area.
  const generated: GalleryCharacter = { id: GENERATED_ID, name: 'comicDay.gallery.generated', scenes: generatedScenes, preview: generatedScenes };
  const originals: GalleryCharacter = { id: ORIGINAL_ID, name: 'comicDay.gallery.originalPhotos', scenes: originalScenes, preview: originalScenes };
  const [characterOrder, setCharacterOrder] = useState(() => readHeroCharacterOrder(undefined, [GENERATED_ID, ORIGINAL_ID]));
  const premium: GalleryCharacter = { id: PREMIUM_CHARACTER_ID, name: 'comicDay.character.one', scenes: premiumScenes, preview: premiumScenes };
  const galleryCharacters = [...SELECTABLE_COMIC_CHARACTERS, ...(premiumScenes.length ? [premium] : []), ...(generatedScenes.length ? [generated] : []), ...(originalScenes.length ? [originals] : [])].map(person => ({ ...person, displayName: nameFor(person.id, person.id === PREMIUM_CHARACTER_ID ? '시티팝 레트로' : t(person.name)) })).sort((a, b) => (characterOrder.indexOf(a.id) < 0 ? 6 : characterOrder.indexOf(a.id)) - (characterOrder.indexOf(b.id) < 0 ? 6 : characterOrder.indexOf(b.id)));
  const covers = useMemo(() => Object.fromEntries(SELECTABLE_COMIC_CHARACTERS.map(person => [person.id, person.preview[0]])), []);
  const cardWidth = Math.max(74, (width - 48 - 20) / 3);
  const printImageHeight = (cardWidth - 20) * 1.18;
  const [dragging, setDragging] = useState<string | null>(null);
  const drag = useRef<{ id: string; index: number; target: number } | null>(null);
  const suppressOpen = useRef(false);
  const dragClaimed = useRef(false);
  const cardHeight = useRef(200);
  const dragPosition = useAnimatedValue(0);
  const dragY = useAnimatedValue(0);
  const finishDrag = (cancel = false) => {
    const session = drag.current;
    if (!session) return;
    if (!cancel) {
      const visibleIds = galleryCharacters.map(person => person.id);
      const moved = moveHeroCharacter(visibleIds, session.id, session.target);
      const next = [...moved, ...characterOrder.filter(id => !visibleIds.includes(id))];
      saveHeroCharacterOrder(next); setCharacterOrder(next);
    }
    dragClaimed.current = false; drag.current = null; setDragging(null); dragPosition.setValue(0); dragY.setValue(0);
  };
  const dragHandlers = useRef({ finishDrag, move: (dx: number, dy: number) => {} });
  useLayoutEffect(() => { dragHandlers.current = { finishDrag, move: (dx, dy) => {
    const session = drag.current;
    if (!session) return;
    dragPosition.setValue(dx); dragY.setValue(dy);
    const col = Math.max(0, Math.min(2, session.index % 3 + Math.round(dx / (cardWidth + 10))));
    const row = Math.max(0, Math.min(Math.ceil(galleryCharacters.length / 3) - 1, Math.floor(session.index / 3) + Math.round(dy / (cardHeight.current + 22))));
    const target = Math.min(galleryCharacters.length - 1, row * 3 + col);
    if (target !== session.target) { session.target = target; tapHaptic('select'); }
  } }; });
  const [reorderPan] = useState(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: () => !!drag.current,
    onPanResponderGrant: () => { dragClaimed.current = true; },
    onPanResponderMove: (_, gesture) => dragHandlers.current.move(gesture.dx, gesture.dy),
    onPanResponderRelease: () => dragHandlers.current.finishDrag(),
    onPanResponderTerminate: () => dragHandlers.current.finishDrag(true),
    onPanResponderTerminationRequest: () => false,
  }));

  const name = (person: GalleryCharacter) => nameFor(person.id, person.id === PREMIUM_CHARACTER_ID ? '시티팝 레트로' : t(person.name));
  const closeDetail = () => { if (onExit) { tapHaptic(); onExit(); return; } tapHaptic(); cancelDeletion(); setCharacter(null); };
  useEffect(() => {
    if (!character || !focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (deleting) cancelDeletion(); else if (onExit) onExit(); else setCharacter(null); return true; });
    return () => sub.remove();
  }, [character, focused, deleting, onExit]);
  const edit = (person: GalleryCharacter) => { tapHaptic(); setDraft(name(person)); setEditing(person); };
  const sceneTitle = (scene: Scene) => sceneTitleFor(character?.id ?? '', scene.id, scene.title || t(scene.label));
  const editScene = (scene: Scene) => { tapHaptic(); setDraft(sceneTitle(scene)); setEditingScene(scene); };
  const cancelRename = () => { setEditing(null); setEditingScene(null); };
  const save = () => {
    if (editingScene && character) {
      if (!saveHeroSceneTitle(character.id, editingScene.id, draft)) return;
      tapHaptic('confirm'); setEditingScene(null); return;
    }
    if (!editing || !draft.trim()) return;
    saveComicCharacterName(editing.id, draft);
    tapHaptic('confirm'); setEditing(null);
  };
  return <View testID="hero-character-gallery" style={[s.root, { backgroundColor: paper, paddingTop: insets.top }]}>
    <AppWallpaperBackground />
    <PaperGrain opacity={0.14} />
    <View style={s.fill}>
    {character ? <View style={s.header}>
      <View accessible accessibilityLabel={`사진 ${character.id === ORIGINAL_ID ? originalScenes.length : character.id === GENERATED_ID ? generatedScenes.length : character.scenes.length}장`} style={{ position: 'absolute', left: 64, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Svg width={18} height={20} viewBox="0 0 24 26" accessible={false}><Path d="M5 4H2v20h17v-3M6 2h16v19H6zM9 5h10v11H9z" fill="none" stroke={ink} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <ThemedText testID="hero-gallery-scene-count" numberOfLines={1} style={{ color: ink, fontSize: 13 }}>{character.id === ORIGINAL_ID ? originalScenes.length : character.id === GENERATED_ID ? generatedScenes.length : character.scenes.length}</ThemedText>
      </View>
      {character ? <Pressable testID="hero-gallery-back" accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={closeDetail} style={s.touch}><BackChevron color={ink} /></Pressable> : <View style={s.touch} />}
      {character ? <ThemedText numberOfLines={1} style={[s.title, { color: ink }]}>{name(character)}</ThemedText> : <View style={s.fill} />}
      {character && !onSelectGenerated ? <Pressable testID="hero-gallery-rename" accessibilityRole="button" accessibilityLabel={t('comicDay.character.rename')} onPress={() => edit(character)} style={s.touch}><Svg width={22} height={22} viewBox="0 0 24 24"><Path d="m4 16 12-12 4 4-12 12-5 1zM14 6l4 4" fill="none" stroke={ink} strokeWidth={1.4} strokeLinejoin="round" /></Svg></Pressable> : <View style={s.touch} />}
      {character?.id === PREMIUM_CHARACTER_ID && premiumScenes.length > 0 ? <HeroPremiumPackDeleteButton ink={ink} onDeleted={() => { setPremiumScenes([]); setCharacter(null); }} /> : null}
      {(character?.id === GENERATED_ID || character?.id === ORIGINAL_ID) && !onSelectGenerated ? <Pressable testID="hero-gallery-delete" accessibilityRole="button" accessibilityLabel={t(deleting ? 'common.cancel' : 'comicDay.gallery.delete')} onPress={() => { tapHaptic(); if (deleting) cancelDeletion(); else setDeleting(true); }} style={s.touch}>
        {deleting ? <ThemedText style={{ color: ink, fontSize: 15 }}>{t('common.cancel')}</ThemedText> : <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7" fill="none" stroke={ink} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>}
      </Pressable> : null}
    </View> : null}
    <View style={s.fill}>
    <View {...reorderPan.panHandlers} style={s.fill} pointerEvents={character ? 'none' : 'auto'} accessibilityElementsHidden={!!character} importantForAccessibility={character ? 'no-hide-descendants' : 'auto'}>
    <FlatList testID="hero-character-gallery-list" data={galleryCharacters} removeClippedSubviews={false} scrollEnabled={!dragging} extraData={dragging} numColumns={3} keyExtractor={person => person.id} contentContainerStyle={s.list} columnWrapperStyle={s.row}
      renderItem={({ item: person, index }) => <Animated.View onLayout={event => { cardHeight.current = event.nativeEvent.layout.height; }} style={[s.card, { width: cardWidth, height: cardWidth * 1.2, paddingHorizontal: cardWidth * 0.05, paddingTop: cardWidth * 0.1, paddingBottom: 0, backgroundColor: printPaper, zIndex: dragging === person.id ? 20 : 0, elevation: dragging === person.id ? 12 : 1, transform: [{ translateX: dragging === person.id ? dragPosition : 0 }, { translateY: dragging === person.id ? dragY : 0 }, { scale: dragging === person.id ? 1.04 : 1 }] }]} ><HeroPolaroidSurface />
        <Pressable testID={`hero-gallery-character-${person.id}`} accessibilityRole="button" accessibilityLabel={person.displayName}
          delayLongPress={350}
          onPressIn={() => { if (!drag.current) suppressOpen.current = false; }}
          onLongPress={() => { suppressOpen.current = true; drag.current = { id: person.id, index, target: index }; setDragging(person.id); tapHaptic('select'); }}
          onPressOut={() => { setTimeout(() => { if (drag.current?.id === person.id && !dragClaimed.current) dragHandlers.current.finishDrag(); }, 0); }}
          onPress={() => { if (suppressOpen.current) return; tapHaptic('select'); setCharacter(person); }}>
          <ComicSceneImage source={(person.id === PREMIUM_CHARACTER_ID ? premiumScenes[0]?.source : person.id === ORIGINAL_ID ? originalScenes[0].source : person.id === GENERATED_ID ? generatedScenes[0].source : COMIC_SCENE_THUMBNAILS[covers[person.id].id] ?? covers[person.id].source)} imageKey={`character-gallery-cover:${person.id}`} preserveFullImage contentFit="contain" backgroundColor={printPaper} showSkeletonOnMount transitionDuration={120} style={{ width: '100%', height: cardWidth * 0.86 }} />
          <HeroPhotoEmulsion />
        </Pressable>

        <View style={[s.nameRow, { flex: 1 }]}>
          <ThemedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={[s.cardName, { color: printInk, fontSize: Math.min(17, cardWidth * 0.13), lineHeight: Math.min(25, cardWidth * 0.19) }]}>{person.displayName}</ThemedText>
        </View>
      </Animated.View>} />

    </View>
    {character ? <View style={[StyleSheet.absoluteFill, { backgroundColor: paper }]}><AppWallpaperBackground />
    <FlatList key={character.id} testID="hero-character-artwork-list" data={character.id === ORIGINAL_ID ? originalScenes : character.id === GENERATED_ID ? generatedScenes : character.scenes} numColumns={3} keyExtractor={scene => scene.id}
      ListEmptyComponent={collectionsLoaded && (character.id === GENERATED_ID || character.id === ORIGINAL_ID) ? <View testID="hero-gallery-empty" style={{ alignItems: 'center', paddingHorizontal: 24, paddingVertical: 72 }}><ThemedText style={{ color: ink, fontSize: 16, lineHeight: 24, textAlign: 'center' }}>{t(character.id === ORIGINAL_ID ? 'comicDay.gallery.emptyOriginalPhotos' : 'comicDay.gallery.emptyGenerated')}</ThemedText></View> : null}
      contentContainerStyle={s.list} columnWrapperStyle={s.row} initialNumToRender={12} maxToRenderPerBatch={6} windowSize={5}
      extraData={{ deleting, selected, sceneTitleFor, photoRatios }}
      renderItem={({ item }) => <Pressable testID={`hero-gallery-scene-${item.id}`} accessibilityRole={deleting ? 'checkbox' : 'button'} accessibilityState={deleting ? { checked: selected.includes(item.id) } : undefined} accessibilityLabel={sceneTitle(item)} onPress={() => { tapHaptic('select'); if (deleting && item.generated) setSelected(ids => ids.includes(item.id) ? ids.filter(id => id !== item.id) : [...ids, item.id]); else if (item.generated && onSelectGenerated && typeof item.source === 'object' && item.source && 'uri' in item.source && typeof item.source.uri === 'string') onSelectGenerated({ uri: item.source.uri, title: item.title, memo: item.memo, createdAt: item.createdAt }); else setPreview(item); }} style={[s.card, { width: cardWidth, backgroundColor: printPaper, alignSelf: 'flex-start' }]}>
        <HeroPolaroidSurface />
        <ComicSceneImage source={(COMIC_SCENE_THUMBNAILS as Partial<Record<string, ImageProps['source']>>)[item.id] ?? item.source} imageKey={`character-gallery:${item.id}`} preserveFullImage contentFit="contain" backgroundColor={printPaper} showSkeletonOnMount transitionDuration={120} style={{ width: '100%', ...(item.generated ? { aspectRatio: photoRatios[item.id] ?? 1 } : { height: printImageHeight }) }} />
        {!item.generated && !deleting ? <Pressable testID={`hero-gallery-scene-rename-${item.id}`} accessibilityRole="button" accessibilityLabel={`${t('comicDay.sceneTitle')}: ${sceneTitle(item)}`} onPress={event => { event.stopPropagation(); editScene(item); }} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ThemedText numberOfLines={2} style={[s.sceneLabel, { flex: 1, color: printInk }]}>{sceneTitle(item)}</ThemedText>
          <Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}><Path d="m4 16 12-12 4 4-12 12-5 1zM14 6l4 4" fill="none" stroke={printInk} strokeWidth={1.3} strokeLinejoin="round" /></Svg>
        </Pressable> : !item.generated ? <ThemedText numberOfLines={2} style={[s.sceneLabel, { color: printInk, minHeight: 0, paddingTop: 8, paddingBottom: 4 }]}>{item.title?.trim() || item.memo?.trim() || t(item.label)}</ThemedText> : null}
        {item.generated && item.createdAt ? <ThemedText style={[s.sceneDate, { color: printInk }]}>{formatHeroPolaroidDate(item.createdAt)}</ThemedText> : null}
        {deleting ? <View pointerEvents="none" style={s.selection}><ComicCheck checked={selected.includes(item.id)} size={30} /></View> : null}
      </Pressable>} />
    {deleting ? <Pressable testID="hero-gallery-delete-selected" disabled={!selected.length} accessibilityRole="button" onPress={confirmDeletion} style={[s.deleteAction, { opacity: selected.length ? 1 : 0.4 }]}><ThemedText style={{ color: '#B53C35' }}>{t('comicDiary.deleteSelected', { count: selected.length })}</ThemedText></Pressable> : null}
    </View> : null}
    </View>
    </View>
    {preview ? <HeroHistorySceneDetail source={preview.source as ImageSourcePropType} scene={{ title: preview.title ?? (preview.generated ? '' : sceneTitle(preview)) ?? '', memo: preview.memo ?? '', artworkUri: typeof preview.source === 'object' && preview.source && 'uri' in preview.source ? preview.source.uri : undefined }} date={preview.createdAt ?? Date.now()} onClose={() => setPreview(null)} onDelete={preview.generated ? () => {
      const target = preview;
      Alert.alert(t('comicDay.gallery.delete'), t('comicDay.gallery.deleteMessage', { count: 1 }), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: () => {
          if (character?.id === ORIGINAL_ID) { deleteHeroOriginalPhotoLibraryImages([target.id]); setOriginalScenes(items => items.filter(item => item.id !== target.id)); }
          else { deleteHeroAiLibraryImages([target.id]); setGeneratedScenes(items => items.filter(item => item.id !== target.id)); }
          setPreview(null);
        } },
      ]);
    } : undefined} /> : null}
    {editing || editingScene ? <AppModal visible transparent animationType="fade" onRequestClose={cancelRename}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.scrim}>
        <View style={[s.dialog, { backgroundColor: paper, borderColor: ink }]}>
          <ThemedText style={[s.dialogTitle, { color: ink }]}>{t(editingScene ? 'comicDay.sceneTitle' : 'comicDay.character.rename')}</ThemedText>
          <ThemedTextInput testID={editingScene ? 'hero-gallery-scene-title-input' : 'hero-gallery-name-input'} accessibilityLabel={t(editingScene ? 'comicDay.sceneTitle' : 'comicDay.character.rename')} value={draft} onChangeText={setDraft} autoFocus maxLength={editingScene ? 80 : 24} selectTextOnFocus returnKeyType="done" onSubmitEditing={save} style={[s.input, { color: ink, borderColor: ink }]} />
          <View style={s.actions}><Pressable onPress={() => { tapHaptic(); cancelRename(); }} style={s.action}><ThemedText style={{ color: ink }}>{t('common.cancel')}</ThemedText></Pressable><Pressable testID={editingScene ? 'hero-gallery-scene-title-save' : 'hero-gallery-name-save'} disabled={!draft.trim()} onPress={save} style={[s.action, { opacity: draft.trim() ? 1 : 0.35 }]}><ThemedText style={{ color: ink }}>{t('common.save')}</ThemedText></Pressable></View>
        </View>
      </KeyboardAvoidingView>
    </AppModal> : null}
</View>;
}
const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 }, fill: { flex: 1 }, header: { height: 60, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  selection: { position: 'absolute', right: 6, top: 6, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  deleteAction: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  touch: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' }, title: { flex: 1, fontSize: 23, textAlign: 'center' }, back: { fontSize: 32, lineHeight: 38 },
  list: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28, gap: 22 }, row: { gap: 10 },
  card: { paddingHorizontal: 9, paddingTop: 12, paddingBottom: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(71, 62, 45, 0.08)', shadowColor: '#403624', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 1.3, elevation: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 1 },
  cardName: { flex: 1, textAlign: 'center', fontSize: 17, lineHeight: 25 },
  polaroidScroll: { paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center', paddingBottom: 40 },
  polaroidMemo: { fontSize: 17, lineHeight: 26, color: '#292D28', marginVertical: 6 },
  sceneDate: { fontSize: 10, lineHeight: 15, paddingHorizontal: 3, paddingTop: 4, paddingBottom: 0 },
  sceneLabel: { paddingHorizontal: 3, paddingTop: 12, paddingBottom: 8, fontSize: 13, lineHeight: 18, minHeight: 56 }, rename: { width: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.25)', alignItems: 'center', justifyContent: 'center', padding: 24 }, dialog: { width: '100%', maxWidth: 380, borderWidth: 0.9, padding: 20, gap: 14, borderRadius: 6 }, dialogTitle: { fontSize: 21 }, input: { borderBottomWidth: 0.7, paddingVertical: 10, fontSize: 22 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }, action: { minWidth: 60, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
