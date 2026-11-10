import { applyPolaroidDraft } from '../lib/applyPolaroidDraft';
import { HeroPhotoImportPending, type ImportedHeroPhoto } from './HeroPhotoImportPreview';
import { launchImageLibraryAsync, UIImagePickerPresentationStyle } from 'expo-image-picker';
import { useWallpaperStore } from '@shared/lib/wallpaper/wallpaperStore';
import { CloseIcon } from '@shared/ui/icon-symbol/CloseIcon';
import { HeroGeneratedArtworkPicker } from './HeroGeneratedArtworkPicker';
import { loadHeroOriginalPhotoLibrary } from '../lib/heroOriginalPhoto';
import { loadHeroAiLibrary, type HeroAiLibraryImage } from '../lib/heroAiLibrary';
import { useHeroTabArtwork } from '../model/heroTabArtwork';
import { HeroCharacterPickerOverlay } from './HeroCharacterPickerOverlay';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { HeroInlineComposer } from './HeroInlineComposer';
import { flushLocalStorageClientWrites, getDevelopmentStorageProfile } from '@shared/lib/storage/localStorageClient';
import type { HeroCardText } from './HeroCardCaption';
import { COMIC_SCENES, type ComicSceneId } from '../lib/heroSceneImages';
import { comicDiaryDate } from '../lib/heroCalendar';
import { loadComicDiaryHome, rememberComicDiaryHistorySelection } from '../lib/heroDiaryHome';
import { HeroDiaryCalendar } from './HeroDiaryCalendar';
import { getPendingHeroAiJob, type PendingHeroAiJob } from '../lib/heroAiClient';
import { HeroPersonalizationFlow } from './HeroPersonalizationFlow';
import type { HeroAiResult } from '../lib/heroAiClient';
import { TutorialGuideLayer } from '@shared/ui/tutorial-guide-layer';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { useServiceTutorial, tutorialDiaryId, completeTutorialSceneClose } from '../../welcome-intro/model/serviceTutorial';
import { ServiceTutorialCoach } from '../../welcome-intro/ui/ServiceTutorialCoach';
import { ComicDiaryLibrary } from './HeroDiaryLibrary';
import { COMIC_DIARY_STORAGE_KEY, loadComicDiaryLibrary, createComicDiary as createDatedComicDiary, deleteComicDiaries, saveComicDiaryLibrary, updateComicDiary, type ComicDiary, type ComicDiaryLibrary as LibraryState } from '../lib/heroDiaryStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { HeroImageActions } from './HeroImageActions';
import { clearComicNavigation, loadComicNavigation, saveComicNavigation } from '../lib/heroNavigation';
import { ComicSceneImage } from './HeroSceneImage';
import { loadComicCharacterName } from '../lib/heroCharacterName';
import { HeroCharacterList } from './HeroCharacterList';
import { COMIC_CHARACTERS, type ComicCharacter } from '../lib/heroCharacters';
import { AppAlert as Alert } from '@shared/lib/app-alert';
import { AppModal as Modal } from '@shared/ui/app-modal';
import { ComicScenePicker } from './HeroScenePicker';
import { forwardRef, useCallback, useContext, useEffect, useLayoutEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { DayPlanTabFocusContext } from '../model/dayPlanTabFocus';
import { Keyboard, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { PaperGrain } from '@shared/ui/paper-grain';
import { newComicScene, type ComicDayScene } from '../lib/heroDayStorage';
import { ComicDayBoard } from './HeroDayBoard';

type PlannerProps = { pendingPrintUri?: string | null; onDiarySaved?: (uri: string) => void; homeCalendar?: (diaries: ComicDiary[]) => ReactNode; overviewOpen?: boolean; onOverviewChange?: (open: boolean) => void; onPhotoEntryChange?: (active: boolean) => void; onHeaderCharacterListChange?: (content: ReactNode | null) => void; onCharacterChange?: (character: ComicCharacter) => void; onDateChange?: (date: string) => void; entryActionsInHeader?: boolean; onOpenBag?: () => void; date: string; ink: string; muted: string; isDark: boolean; onTitleChange?: (title: string | null) => void; onCharacterNameChange?: (name: string | null) => void; hideCharacterHeading?: boolean };
export type ComicDiaryHandle = { openNewDiary: () => void; openLibrary: () => void; openCalendar: () => void; openToday: () => void; openPhotoEntry: () => void; openSceneEntry: (restoreOnly?: boolean) => void; openCharacterPicker: () => void; renameDiary: () => void };
export const IndependentComicPlanner = forwardRef<ComicDiaryHandle, PlannerProps>(function IndependentComicPlanner(props, ref) {
  return <ComicPlannerForDate key={props.date} {...props} ref={ref} />;
});
const ComicPlannerForDate = forwardRef<ComicDiaryHandle, PlannerProps>(function ComicPlannerForDate(props, ref) {
  const createComicDiary = useCallback((library: LibraryState, characterId: string, title: string, characterName?: string) => createDatedComicDiary(library, characterId, title, characterName, props.date), [props.date]);
  const tabFocused = useContext(DayPlanTabFocusContext);
  const { onTitleChange, onCharacterNameChange, onCharacterChange } = props;
  const activeSceneRef = useRef<string | null>(null);
  const draftRef = useRef<{ image: ComicSceneId; text: HeroCardText; original?: boolean; selectedPhoto?: ImportedHeroPhoto } | null>(null);
  const captureDraft = useCallback((image: ComicSceneId, text: HeroCardText) => { draftRef.current = { image, text }; }, []);
  const [writingSceneId, setWritingSceneId] = useState<string | null>(null);
  const [focusSceneId, setFocusSceneId] = useState<string | null>(null);
  const captureActiveScene = useCallback((id: string) => {
    activeSceneRef.current = id;
    setFocusSceneId(pending => pending === id ? null : pending);
  }, []);
  const [inlineTarget, setInlineTarget] = useState<{ diaryId?: string; sceneId?: string; image: ComicSceneId; text: HeroCardText; original?: boolean; selectedPhoto?: ImportedHeroPhoto } | null>(null);
  const [photoEntryOpen, setPhotoEntryOpen] = useState(false);
  const albumOpening = useRef(false);
  const pickerStarted = useRef(false);
  const [cameraImportOpen, setCameraImportOpen] = useState(false);
  const explicitEntry = useRef(false);
  const { t } = useTranslation();
  const [library, setLibrary] = useState(() => loadComicDiaryHome(props.date, number => t('comicDiary.defaultTitle', { number })));
  const [expiredTutorialDiaryId] = useState(() => {
    const tutorial = useServiceTutorial.getState();
    if (tutorial.mode !== 'comic') return null;
    const target = library.diaries.find(item => item.id === tutorial.diaryKey || item.scenes.some(scene => scene.id === tutorial.sceneKey));
    // An unfinished guide must not reopen yesterday over today's empty home.
    const targetDate = target ? comicDiaryDate(target) : null;
    return target && targetDate && targetDate < props.date ? target.id : null;
  });
  const [recoveryJob, setRecoveryJob] = useState<PendingHeroAiJob | null>(null);
  useEffect(() => { let active = true; void getPendingHeroAiJob().then(job => { if (active) { setRecoveryJob(job); if (job?.story && !explicitEntry.current) setPhotoEntryOpen(true); } }).catch(() => undefined); return () => { active = false; }; }, []);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [initialSceneCharacter, setInitialSceneCharacter] = useState<ComicCharacter | null>(null);
  const [characterListOpen, setCharacterListOpen] = useState(false);
  const [characterPickerOpen, setCharacterPickerOpen] = useState(false);
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [additionChoice, setAdditionChoice] = useState<{ diaryId: string; character: ComicCharacter } | null>(null);
  const [chooserReturn, setChooserReturn] = useState<'library' | 'board' | null>(null);
  const [characterDraft, setCharacterDraft] = useState(0);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const tutorialActive = useServiceTutorial(state => state.active && state.mode === 'comic');
  // Tab switches used to pause the run; resume when this comic surface mounts again.
  useEffect(() => {
    const tut = useServiceTutorial.getState();
    if (expiredTutorialDiaryId) {
      if (tut.active && tut.mode === 'comic') tut.pause();
      return;
    }
    if (!tut.active && tut.mode === 'comic' && tut.step !== 'finish' && !tut.completed.includes('comic')) tut.resume();
  }, [expiredTutorialDiaryId]);
  const tutorialDiaryKey = useServiceTutorial(state => state.diaryKey);
  const tutorialSceneKey = useServiceTutorial(state => state.sceneKey);
  useLayoutEffect(() => useServiceTutorial.subscribe(current => {
    if (!current.active || current.mode !== 'comic' || !current.diaryKey) return;
    // A replay may return to an already mounted tab. Synchronize the newly
    // saved diary in the same store notification that publishes its key.
    if (!library.diaries.some(item => item.id === current.diaryKey)) {
      const saved = localStorageClient.getJson<LibraryState>(COMIC_DIARY_STORAGE_KEY);
      if (saved?.diaries.some(item => item.id === current.diaryKey)) setLibrary(saved);
    }
    if (creating && (current.step === 'comicPick' || current.step === 'comicReturn')) setCreating(false);
  }), [library, creating]);
  const guidedDiaryKey = tutorialDiaryId(library, { active: tutorialActive, mode: 'comic', diaryKey: tutorialDiaryKey, sceneKey: tutorialSceneKey });
  const activeDiaryKey = expiredTutorialDiaryId && guidedDiaryKey === expiredTutorialDiaryId ? library.activeId : guidedDiaryKey;
  const diary = library.diaries.find(item => item.id === activeDiaryKey && comicDiaryDate(item) === props.date);
  const character = COMIC_CHARACTERS.find(item => item.id === diary?.characterId);
  const displayedDate = diary ? comicDiaryDate(diary) ?? props.date : props.date;
  useLayoutEffect(() => { props.onDateChange?.(displayedDate); }, [displayedDate, props.onDateChange]);
  useLayoutEffect(() => { onCharacterChange?.(character ?? COMIC_CHARACTERS[0]); }, [character, onCharacterChange]);
  const commit = useCallback((next: LibraryState) => { saveComicDiaryLibrary(next); setLibrary(next); }, []);
  const openLibrary = useCallback(() => { setRenameTarget(null); setLibraryOpen(true); }, []);
  const renameDiary = useCallback(() => { setRenameTarget(diary?.id ?? null); setLibraryOpen(true); }, [diary?.id]);
  const openToday = useCallback(() => {
    if (useServiceTutorial.getState().active) useServiceTutorial.getState().pause();
    setLibrary(loadComicDiaryHome(props.date, number => t('comicDiary.defaultTitle', { number }), true));
    setCreating(false); setAddingToId(null); setAdditionChoice(null); setChooserReturn(null);
    setPhotoEntryOpen(false); setCharacterListOpen(false); setCalendarOpen(false); setRenameTarget(null); setLibraryOpen(false);
    Keyboard.dismiss();
  }, [props.date, t]);
  const openPhotoEntry = useCallback(() => {
    explicitEntry.current = true;
    const scene = diary?.scenes.find(value => value.id === activeSceneRef.current) ?? diary?.scenes[0];
    {
      const koreanMockText = getDevelopmentStorageProfile() === 'ko'
        ? { title: '잠깐 숨을 고른 오후', memo: '해야 할 일을 잠시 멈추고 창가에 앉았다. 바쁘게 지나가던 마음이 조금 가라앉고, 내가 어떤 기분인지 돌아볼 수 있었다. 오늘의 작은 쉼도 오래 기억하고 싶다.' }
        : { title: '', memo: '' };
      setInlineTarget(diary?.artworkCollection === 'original'
        ? { diaryId: diary.id, image: COMIC_CHARACTERS[0].scenes[0].id, text: { title: '', memo: '' } }
        : scene
        ? { diaryId: diary!.id, sceneId: scene.id, image: scene.image, text: { ...koreanMockText, paper: scene.paper, pen: scene.pen, fontId: scene.fontId } }
        : { image: draftRef.current?.image ?? COMIC_CHARACTERS[0].scenes[0].id, text: koreanMockText });
    }
    setCharacterListOpen(false); setPhotoEntryOpen(true); setLibraryOpen(false); setCalendarOpen(false);
    void getPendingHeroAiJob().then(job => { if (job?.story) setRecoveryJob(job); }).catch(() => undefined);
    if (useServiceTutorial.getState().active) useServiceTutorial.getState().pause();
  }, [diary, inlineTarget]);
  const openOriginalEntry = useCallback((selectedPhoto: ImportedHeroPhoto) => {
    explicitEntry.current = true;
    setInlineTarget({ diaryId: diary?.id, image: COMIC_CHARACTERS[0].scenes[0].id, text: { title: '', memo: '' }, original: true, selectedPhoto });
    setRecoveryJob(null); setCreating(false); setCharacterListOpen(false); setCharacterPickerOpen(false);
    setPhotoEntryOpen(true); setLibraryOpen(false); setCalendarOpen(false);
    if (useServiceTutorial.getState().active) useServiceTutorial.getState().pause();
  }, [diary?.id]);
  const closeCameraImport = useCallback(() => {
    setCameraImportOpen(false); albumOpening.current = false;
  }, []);
  const openCameraAlbum = useCallback(() => {
    if (albumOpening.current) return;
    albumOpening.current = true;
    Keyboard.dismiss();
    setCameraImportOpen(true);
  }, []);
  // Present the album from a persistent preview host, so dismissing it never reveals the board.
  const pickCameraPhoto = useCallback(async () => {
    if (pickerStarted.current) return;
    pickerStarted.current = true;
    try {
      const result = await launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false, allowsMultipleSelection: false, presentationStyle: UIImagePickerPresentationStyle.FULL_SCREEN });
      if (!result.canceled && result.assets[0]?.uri) {
        const asset = result.assets[0];
        openOriginalEntry({ uri: asset.uri, fileName: asset.fileName, width: asset.width, height: asset.height });
      } else closeCameraImport();
    } catch { closeCameraImport(); Alert.alert(t('comicDay.photo.pickError')); }
    finally { pickerStarted.current = false; }
  }, [openOriginalEntry, closeCameraImport, t]);
  const openSceneEntry = useCallback((_restoreOnly = true) => {
    setPhotoEntryOpen(false); setCharacterListOpen(false); setCharacterPickerOpen(false);
    setCreating(false); setChooserReturn(null); setAddingToId(null);
    Keyboard.dismiss();
  }, []);
  const openNewDiary = openCameraAlbum;
  // History is a separate tab: adopt its saved selection/renames/deletions on return.
  useEffect(() => {
    if (!tabFocused) return;
    const saved = localStorageClient.getJson<LibraryState>(COMIC_DIARY_STORAGE_KEY);
    if (!saved) return;
    setLibrary(saved);
    if (saved.activeId !== library.activeId) {
      setCreating(false); setChooserReturn(null); setAddingToId(null);
      setPhotoEntryOpen(false); setInlineTarget(null); setCharacterListOpen(false);
    }
  // Focus is the synchronization boundary, not local editor state changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFocused]);
  useImperativeHandle(ref, () => ({ openNewDiary, openPhotoEntry, openSceneEntry, openToday, openLibrary, openCalendar: () => setCalendarOpen(true), openCharacterPicker: openCameraAlbum, renameDiary }), [openNewDiary, openPhotoEntry, openSceneEntry, openToday, openLibrary, renameDiary, openCameraAlbum]);
  const headerName = !creating && character ? diary?.characterName ?? loadComicCharacterName(character.id) ?? t(character.name) : null;
  useLayoutEffect(() => { onCharacterNameChange?.(headerName); }, [headerName, onCharacterNameChange]);
  useLayoutEffect(() => { onTitleChange?.(creating ? null : diary?.title ?? null); }, [creating, diary?.title, onTitleChange]);
  const create = (next: ComicCharacter, characterName?: string, firstSceneId?: ComicSceneId) => {
    setCharacterListOpen(false);
    const target = library.diaries.find(item => item.id === addingToId);
    if (target && target.scenes.length > 0) {
      commit({ ...library, activeId: target.id });
      saveComicNavigation(target.characterId, 'board', target.id);
      setAdditionChoice({ diaryId: target.id, character: next }); setAddingToId(null); setChooserReturn(null); setCreating(false);
      Keyboard.dismiss(); return;
    }
    let number = library.diaries.length + 1;
    for (let attempt = 0; attempt <= library.diaries.length && library.diaries.some(item => item.title === t('comicDiary.defaultTitle', { number })); attempt++) number++;
    // An existing but empty diary is also the empty home. Reuse its identity,
    // title and date instead of leaving another empty diary behind on selection.
    const emptyDiary = target ?? (diary && !diary.scenes.length ? diary : undefined);
    let nextLibrary = emptyDiary ? {
      ...library,
      activeId: emptyDiary.id,
      diaries: library.diaries.map(item => item.id === emptyDiary.id ? {
        ...item,
        characterId: next.id,
        characterName: characterName?.trim() || (item.characterId === next.id ? item.characterName : undefined) || loadComicCharacterName(next.id) || t(next.name),
      } : item),
    } : createComicDiary(library, next.id, t('comicDiary.defaultTitle', { number }), characterName?.trim() || loadComicCharacterName(next.id) || t(next.name));
    const diaryKey = nextLibrary.activeId!;
    const image = (firstSceneId ? next.scenes.find(scene => scene.id === firstSceneId) : null) ?? next.scenes[Math.floor(Math.random() * next.scenes.length)] ?? next.scenes[0];
    const initial = { ...newComicScene(''), image: image.id };
    nextLibrary = updateComicDiary(nextLibrary, diaryKey, { scenes: [initial] });
    commit(nextLibrary);
    saveComicNavigation(next.id, 'board', diaryKey);
    const tutorial = useServiceTutorial.getState();
    if (tutorial.active && tutorial.mode === 'comic') tutorial.advance(tutorial.step, 'comicOpen', { diaryKey, sceneKey: initial.id });
    setChooserReturn(null);
    setCreating(false);
    // The chosen protagonist opens directly on the random card.
    Keyboard.dismiss();
  };
  const selectHeaderCharacter = useCallback((next: ComicCharacter) => {
    setCharacterListOpen(false);
    setAddingToId(null);
    setAdditionChoice(null);
    if (diary?.characterId === next.id) return;

    const selectedDate = displayedDate;
    const existing = library.diaries
      .filter(item => item.characterId === next.id && comicDiaryDate(item) === selectedDate)
      .sort((a, b) => b.createdAt - a.createdAt || b.updatedAt - a.updatedAt)[0];
    if (existing) {
      commit({ ...library, activeId: existing.id });
      saveComicNavigation(next.id, 'board', existing.id);
      if (selectedDate < props.date) rememberComicDiaryHistorySelection(props.date, existing.id);
      return;
    }

    let number = library.diaries.length + 1;
    for (let attempt = 0; attempt <= library.diaries.length && library.diaries.some(item => item.title === t('comicDiary.defaultTitle', { number })); attempt++) number++;
    let nextLibrary = createComicDiary(library, next.id, t('comicDiary.defaultTitle', { number }), loadComicCharacterName(next.id) ?? t(next.name));
    const diaryId = nextLibrary.activeId!;
    const firstScene = next.scenes[Math.floor(Math.random() * next.scenes.length)] ?? next.scenes[0];
    nextLibrary = updateComicDiary(nextLibrary, diaryId, { scenes: [{ ...newComicScene(''), image: firstScene.id }] });
    if (selectedDate < props.date) {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const createdAt = new Date(year, month - 1, day, 12).getTime();
      nextLibrary = { ...nextLibrary, diaries: nextLibrary.diaries.map(item => item.id === diaryId ? { ...item, createdAt, updatedAt: createdAt } : item) };
    }
    commit(nextLibrary);
    saveComicNavigation(next.id, 'board', diaryId);
    if (selectedDate < props.date) rememberComicDiaryHistorySelection(props.date, diaryId);
  }, [commit, createComicDiary, diary?.characterId, displayedDate, library, props.date, t]);
  useLayoutEffect(() => {
    if (!props.onHeaderCharacterListChange) return;
    props.onHeaderCharacterListChange(characterListOpen ? <HeroCharacterList inline open ink={props.ink} muted={props.muted} selectedId={character?.id} onSelect={selectHeaderCharacter} /> : null);
    return () => props.onHeaderCharacterListChange?.(null);
  }, [characterListOpen, character?.id, props.ink, props.muted, props.onHeaderCharacterListChange, selectHeaderCharacter]);
  const createGenerated = (images: HeroAiResult[], name: string, reuse = false) => {
    const target = library.diaries.find(item => item.id === addingToId);
    if (target) {
      const source = COMIC_CHARACTERS[0];
      const added = images.filter(image => !target.scenes.some(scene => scene.artworkUri === image.uri)).map((image, index) => ({
        ...newComicScene(image.sceneId ? t(source.scenes.find(scene => scene.id === image.sceneId)!.label) : t('comicDay.ai.sceneTitle', { count: index + 1 })),
        image: image.sceneId ?? source.scenes[0].id, artworkUri: image.uri,
      }));
      commit({ ...updateComicDiary(library, target.id, { scenes: [...target.scenes, ...added] }), activeId: target.id });
      saveComicNavigation(target.characterId, 'board', target.id);
      setAddingToId(null); setChooserReturn(null); setCreating(false); Keyboard.dismiss();
      return;
    }
    const applied = library.diaries.find(item => images.every(image => item.scenes.some(scene => scene.artworkUri === image.uri)));
    if (applied && !reuse) { commit({ ...library, activeId: applied.id }); saveComicNavigation(applied.characterId, 'board', applied.id); setCreating(false); return; }
    const character = COMIC_CHARACTERS[0];
    let number = library.diaries.length + 1;
    for (let attempt = 0; attempt <= library.diaries.length && library.diaries.some(item => item.title === t('comicDiary.defaultTitle', { number })); attempt++) number++;
    let next = createComicDiary(library, character.id, t('comicDiary.defaultTitle', { number }), name);
    const id = next.activeId!;
    const scenes = images.map((image, index) => ({ ...newComicScene(image.sceneId ? t(COMIC_SCENES.find(scene => scene.id === image.sceneId)!.label) : t('comicDay.ai.sceneTitle', { count: index + 1 })), image: image.sceneId ?? character.scenes[0].id, artworkUri: image.uri }));
    next = updateComicDiary(next, id, { scenes });
    commit(next); saveComicNavigation(character.id, 'board', id);
    if (useServiceTutorial.getState().active) useServiceTutorial.getState().pause();
    setChooserReturn(null); setCreating(false); Keyboard.dismiss();
  };
  const reuseGeneratedArtwork = (image: HeroAiLibraryImage) => {
    const original = image.uri.includes('/hero-photos/');
    const source = COMIC_CHARACTERS[0];
    const blank = { ...newComicScene(''), image: image.sceneId ?? source.scenes[0].id, artworkUri: image.uri };
    const target = library.diaries.find(item => item.id === addingToId);
    let next = library;
    if (target) {
      next = { ...updateComicDiary(library, target.id, { scenes: [...target.scenes, blank] }), activeId: target.id };
    } else {
      let number = library.diaries.length + 1;
      while (library.diaries.some(item => item.title === t('comicDiary.defaultTitle', { number }))) number++;
      next = createComicDiary(library, source.id, t('comicDiary.defaultTitle', { number }), loadComicCharacterName(original ? 'original-photos' : 'generated-illustrations') ?? t(original ? 'comicDay.gallery.originalPhotos' : 'comicDay.gallery.generated'));
      next = updateComicDiary(next, next.activeId!, { scenes: [blank] });
    }
    next = { ...next, diaries: next.diaries.map(item => item.id === next.activeId ? { ...item, artworkCollection: original ? 'original' as const : 'generated' as const } : item) };
    commit(next);
    saveComicNavigation(target?.characterId ?? source.id, 'board', next.activeId!);
    setFocusSceneId(blank.id);
    setWritingSceneId(blank.id);
    setCharacterPickerOpen(false); setCharacterListOpen(false); setAddingToId(null); setAdditionChoice(null);
    setChooserReturn(null); setCreating(false); setLibraryOpen(false); Keyboard.dismiss();
    if (useServiceTutorial.getState().active) useServiceTutorial.getState().pause();
  };
  const createRandomDiary = (image: ComicSceneId, text: HeroCardText, addAnother = false) => {
    const character = COMIC_CHARACTERS[0];
    let number = library.diaries.length + 1;
    for (let attempt = 0; attempt <= library.diaries.length && library.diaries.some(item => item.title === t('comicDiary.defaultTitle', { number })); attempt++) number++;
    let next = createComicDiary(library, character.id, t('comicDiary.defaultTitle', { number }), loadComicCharacterName(character.id) ?? t(character.name));
    const id = next.activeId!;
    next = updateComicDiary(next, id, { scenes: [{ ...newComicScene(text.title), image, memo: text.memo, ...(text.paper ? { paper: text.paper } : {}), ...(text.pen ? { pen: text.pen } : {}) }] });
    if (addAnother) {
      const choices = character.scenes.filter(scene => scene.id !== image);
      const random = choices[Math.floor(Math.random() * choices.length)] ?? character.scenes[0];
      next = updateComicDiary(next, id, { scenes: [...next.diaries.find(item => item.id === id)!.scenes, { ...newComicScene(''), image: random.id }] });
    }
    commit(next); saveComicNavigation(character.id, 'board', id);
    if (useServiceTutorial.getState().active) useServiceTutorial.getState().pause();
    setCreating(false); setChooserReturn(null); Keyboard.dismiss();
  };
  const cancelCreate = () => {
    Keyboard.dismiss();
    const tutorial = useServiceTutorial.getState();
    if (tutorial.active && tutorial.mode === 'comic') tutorial.pause();
    if (chooserReturn === 'board' && diary && character) saveComicNavigation(character.id, 'board', diary.id);
    setAddingToId(null);
    setCreating(false);
    setLibraryOpen(chooserReturn === 'library');
    setChooserReturn(null);
  };
  const removeMany = (ids: string[]) => {
    const selected = new Set(ids);
    const targets = library.diaries.filter(item => selected.has(item.id));
    if (!targets.length) return;
    Alert.alert(t('comicDiary.delete'), targets.length === 1 ? t('comicDiary.deleteMessage', { title: targets[0].title }) : t('comicDiary.deleteManyMessage', { count: targets.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => {
        tapHaptic('confirm');
        const current = localStorageClient.getJson<LibraryState>(COMIC_DIARY_STORAGE_KEY) ?? library;
        const next = deleteComicDiaries(current, targets.map(item => item.id));
        const active = next.diaries.find(item => item.id === next.activeId);
        if (active) saveComicNavigation(active.characterId, 'board', active.id); else clearComicNavigation();
        commit(next);
      } },
    ], { cancelable: true });
  };
  const showEmptyBoard = !diary?.scenes.length;
  const showPlanner = Boolean(diary?.scenes.length && character);
  const showChooser = !showEmptyBoard && !showPlanner;
  const inlineRecovery = recoveryJob?.story ? recoveryJob : undefined;
  const inline = inlineRecovery ? {
    diaryId: inlineRecovery.targetDiaryId, sceneId: inlineRecovery.targetSceneId,
    image: inlineRecovery.scenes[0] ?? COMIC_CHARACTERS[0].scenes[0].id,
    text: { title: '', memo: inlineRecovery.story!.text } as HeroCardText,
  } : inlineTarget;
  const applyInline = async (text: HeroCardText, uri: string) => {
    // Read the latest library: generation can finish after other local edits.
    let next = loadComicDiaryLibrary(props.date, number => t('comicDiary.defaultTitle', { number }));
    const duplicate = next.diaries.find(value => comicDiaryDate(value) === props.date && value.scenes.some(scene => scene.artworkUri === uri));
    const isOriginalPhoto = /\/hero-photos\/photo-[a-zA-Z0-9-]+\./i.test(uri);
    if (!duplicate && isOriginalPhoto) {
      const target = next.diaries.find(value => value.id === inline?.diaryId && value.artworkCollection === 'original' && comicDiaryDate(value) === props.date)
        ?? next.diaries.find(value => value.artworkCollection === 'original' && comicDiaryDate(value) === props.date);
      const personalName = t('comicDay.photo.originalTitle');
      if (target) {
        const photoScene = { ...newComicScene(text.title), ...text, image: COMIC_CHARACTERS[0].scenes[0].id, artworkUri: uri };
        next = { ...updateComicDiary(next, target.id, { scenes: [...target.scenes, photoScene] }), activeId: target.id };
      } else {
        const photoScene = { ...newComicScene(text.title), ...text, image: COMIC_CHARACTERS[0].scenes[0].id, artworkUri: uri };
        next = createComicDiary(next, COMIC_CHARACTERS[0].id, personalName, personalName);
        const id = next.activeId!;
        next = updateComicDiary(next, id, { scenes: [photoScene] });
        next = { ...next, diaries: next.diaries.map(value => value.id === id ? { ...value, artworkCollection: 'original' as const } : value) };
      }
    } else if (!duplicate) {
      let target = next.diaries.find(value => value.id === inline?.diaryId);
      if (!target) {
        next = createComicDiary(next, COMIC_CHARACTERS[0].id, t('comicDiary.defaultTitle', { number: next.diaries.length + 1 }));
        target = next.diaries.find(value => value.id === next.activeId)!;
      }
      const existing = target.scenes.find(value => value.id === inline?.sceneId);
      // Generation always creates a separate card; its source card is read-only.
      const updated = { ...newComicScene(text.title), ...text, paper: text.paper ?? existing?.paper ?? '#F5E8CF', pen: text.pen ?? existing?.pen ?? props.ink, fontId: text.fontId ?? existing?.fontId, image: inline?.image ?? COMIC_CHARACTERS[0].scenes[0].id, artworkUri: uri };
      next = { ...updateComicDiary(next, target.id, { scenes: [...target.scenes, updated] }), activeId: target.id };
    } else next = { ...next, activeId: duplicate.id };
    const completedScene = next.diaries.find(value => value.id === next.activeId)?.scenes.find(scene => scene.artworkUri === uri);
    setFocusSceneId(completedScene?.id ?? null);
    commit(next);
    await flushLocalStorageClientWrites();
    saveComicNavigation(COMIC_CHARACTERS[0].id, 'board', next.activeId!);
    closeCameraImport();
    setPhotoEntryOpen(false); setInlineTarget(null); setRecoveryJob(null); setCreating(false);
    props.onDiarySaved?.(uri);
  };
  const photoEntryVisible = !!(inline && photoEntryOpen);
  const cameraEntryVisible = photoEntryVisible && !inlineTarget?.original;
  useLayoutEffect(() => { props.onPhotoEntryChange?.(cameraEntryVisible); }, [props.onPhotoEntryChange, cameraEntryVisible]);
  const hasThumbnailCards = showPlanner && !!diary?.scenes.length && !photoEntryVisible;
  useLayoutEffect(() => { useHeroTabArtwork.getState().setHasCards(hasThumbnailCards); }, [hasThumbnailCards]);
  useLayoutEffect(() => () => { useHeroTabArtwork.getState().setHasCards(false); }, []);
  const inlineComposer = inline ? <HeroInlineComposer fullScreen importedPhotoEmbedded={cameraImportOpen} initialOriginalPhoto={inlineTarget?.selectedPhoto} visible={photoEntryVisible} key={inlineRecovery?.id ?? `${inlineTarget?.original ? 'original' : 'ai'}:${inline.sceneId ?? 'new'}`} photoOnly={!!inlineTarget?.original} sceneId={inline.image} {...inline.text} ink={inline.text.pen ?? props.ink} targetDiaryId={inline.diaryId} targetSceneId={inline.sceneId} initialMode={inlineTarget?.original ? 'original' : 'character'} recoveryJob={inlineRecovery} onApply={applyInline} onClose={() => { closeCameraImport(); setPhotoEntryOpen(false); setInlineTarget(null); setRecoveryJob(null); }} /> : null;
  return <TutorialGuideLayer><View style={{ flex: 1 }}>
    {characterPickerOpen ? <HeroCharacterPickerOverlay onChooseGenerated={reuseGeneratedArtwork} selectedId={character?.id} isDark={props.isDark} onClose={() => setCharacterPickerOpen(false)} onSelect={next => { setCharacterPickerOpen(false); selectHeaderCharacter(next); }} /> : null}
    {!props.onHeaderCharacterListChange ? <HeroCharacterList open={characterListOpen} ink={props.ink} muted={props.muted} selectedId={character?.id} onSelect={selectHeaderCharacter} /> : null}
    <ServiceTutorialCoach characterChoosing={showChooser} steps={showChooser ? [] : showPlanner ? ['comicStart'] : ['comicStart', 'comicCharacter', 'comicName', 'comicReady']} />
    <DayPlanTabFocusContext.Provider value={tabFocused && !photoEntryVisible}>
    <View collapsable={false} style={{ flex: 1 }}>
    {props.homeCalendar ? <View testID="hero-home-calendar-surface" style={{ flex: 1 }} pointerEvents={photoEntryVisible ? 'none' : 'auto'}>
      {props.homeCalendar(library.diaries)}
    </View> : <Animated.View key={showChooser ? `chooser:${characterDraft}` : diary?.id ?? 'today-draft'}
      testID="comic-board-transition"
      style={StyleSheet.absoluteFill} pointerEvents={photoEntryVisible ? 'none' : 'auto'}>
    {showEmptyBoard ? <ComicDayBoard overviewOpen onOverviewChange={props.onOverviewChange} diaryTitle={diary?.title || 'Diary'} items={[]} choices={{}} ink={props.ink} muted={props.muted} isDark={props.isDark} onOpen={() => undefined} onAdd={openCameraAlbum} onAddPhoto={openCameraAlbum} /> : showPlanner ? <CharacterComicPlanner key={diary!.id} {...props} diary={diary!} character={character!} focusSceneId={focusSceneId} writingSceneId={writingSceneId} onWritingOpened={() => setWritingSceneId(null)} onActiveSceneChange={captureActiveScene} onAdditionComplete={() => setAdditionChoice(null)} onAddOriginalPhoto={openCameraAlbum} onOpenCameraAlbum={openCameraAlbum} additionCharacter={additionChoice?.diaryId === diary!.id ? additionChoice.character : null}
      onAddCharacter={openCameraAlbum}
      onUpdate={scenes => commit(updateComicDiary(library, diary!.id, { scenes }))}
      onSelectCharacter={() => { if (!diary!.scenes.length) commit(deleteComicDiaries(library, [diary!.id])); clearComicNavigation(); setChooserReturn('board'); setCharacterDraft(value => value + 1); openCameraAlbum(); }} /> : null}
    </Animated.View>}
    </View>
    </DayPlanTabFocusContext.Provider>
    {cameraImportOpen ? <Modal testID="hero-camera-import-host" visible transparent presentationStyle="overFullScreen" animationType="none" onShow={() => { void pickCameraPhoto(); }} onRequestClose={closeCameraImport}>
      {inlineTarget?.selectedPhoto ? inlineComposer : <HeroPhotoImportPending />}
    </Modal> : null}
    {inline && !cameraImportOpen ? <Animated.View entering={FadeIn.duration(400).reduceMotion(ReduceMotion.System)} exiting={FadeOut.duration(240).reduceMotion(ReduceMotion.System)} testID="hero-inline-workspace" pointerEvents={photoEntryVisible ? 'auto' : 'none'} accessibilityElementsHidden={!photoEntryVisible} style={[StyleSheet.absoluteFill, { display: photoEntryVisible ? 'flex' : 'none', backgroundColor: props.isDark ? '#262B28' : '#F7F6F4', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0 }]}>
      {inlineComposer}
    </Animated.View> : null}
    {recoveryJob && !recoveryJob.story ? <Modal visible onRequestClose={() => setRecoveryJob(null)}><View style={{ flex: 1, paddingTop: 40, paddingBottom: 24 }}><HeroPersonalizationFlow recoveryJob={recoveryJob} onClose={() => setRecoveryJob(null)} onApply={images => { const target = library.diaries.find(item => item.id === recoveryJob.targetDiaryId);
      if (target) {
        const character = COMIC_CHARACTERS[0];
        const scenes = images.map((image, index) => ({ ...newComicScene(image.sceneId ? t(COMIC_SCENES.find(scene => scene.id === image.sceneId)!.label) : t('comicDay.ai.sceneTitle', { count: index + 1 })), image: image.sceneId ?? character.scenes[0].id, artworkUri: image.uri }));
        commit({ ...updateComicDiary(library, target.id, { scenes: [...target.scenes, ...scenes.filter(scene => !target.scenes.some(existing => existing.artworkUri === scene.artworkUri))] }), activeId: target.id });
        saveComicNavigation(target.characterId, 'board', target.id);
      } else createGenerated(images, recoveryJob.characterName ?? loadComicCharacterName(COMIC_CHARACTERS[0].id) ?? t(COMIC_CHARACTERS[0].name));
      setRecoveryJob(null); }} /></View></Modal> : null}
    {calendarOpen ? <HeroDiaryCalendar diaries={library.diaries} today={props.date} ink={props.ink} muted={props.muted} isDark={props.isDark} onClose={() => setCalendarOpen(false)} onOpen={id => {
      rememberComicDiaryHistorySelection(props.date, id);
      const opened = library.diaries.find(item => item.id === id);
      if (!opened) return;
      saveComicNavigation(opened.characterId, 'board', id);
      commit({ ...library, activeId: id });
      setChooserReturn(null); setCreating(false); setCalendarOpen(false);
    }} /> : null}
    {libraryOpen ? <ComicDiaryLibrary diaries={library.diaries} activeId={library.activeId} initialRenameId={renameTarget}
      onClose={() => setLibraryOpen(false)} onCreate={() => { setChooserReturn('library'); setCharacterDraft(value => value + 1); openCameraAlbum(); setLibraryOpen(false); }}
      onOpen={id => { rememberComicDiaryHistorySelection(props.date, id); const opened = library.diaries.find(item => item.id === id)!; saveComicNavigation(opened.characterId, 'board', id); commit({ ...library, activeId: id }); setChooserReturn(null); setCreating(false); setLibraryOpen(false); }}
      onRename={(id, title) => commit(updateComicDiary(library, id, { title }))} onDelete={id => removeMany([id])} onDeleteMany={removeMany} /> : null}
  </View></TutorialGuideLayer>;
});
function CharacterComicPlanner({ pendingPrintUri, overviewOpen, onOverviewChange, date, writingSceneId, onWritingOpened, focusSceneId, ink, muted, isDark, character, diary, onUpdate, onSelectCharacter, hideCharacterHeading, onOpenBag, onAddCharacter, onAddOriginalPhoto, onOpenCameraAlbum, additionCharacter, onActiveSceneChange, onAdditionComplete }: PlannerProps & { writingSceneId?: string | null; onWritingOpened: () => void; focusSceneId?: string | null; onAdditionComplete: () => void; onActiveSceneChange?: (id: string) => void; onAddCharacter: () => void; onAddOriginalPhoto: () => void; onOpenCameraAlbum: () => void; additionCharacter: ComicCharacter | null; diary: ComicDiary; onUpdate: (scenes: ComicDayScene[]) => void; character: ComicCharacter; onSelectCharacter: () => void }) {
  const { t } = useTranslation();
  const scenes = diary.scenes;
  const addingGenerated = useRef(false);
  const [additionImages, setAdditionImages] = useState<HeroAiLibraryImage[] | null>(null);
  const [pickingSingle, setPickingSingle] = useState(false);
  const originalCollection = diary.artworkCollection === 'original';
  const generatedCollection = diary.artworkCollection === 'generated' || (scenes.length > 0 && scenes.every(scene => scene.artworkUri?.includes('/hero-ai/')));
  const [pickerOpen, setPickerOpen] = useState(false);
  const showPicker = (open: boolean) => {
    if (!open) {
      const tut = useServiceTutorial.getState();
      // Never rewind comicPick → comicStart: that left an empty board after Start
      // when Close was hit as the name keyboard dismissed.
      tut.advance('comicReturn', 'comicOpen');
    }
    saveComicNavigation(character.id, open ? 'picker' : 'board', diary.id);
    setPickerOpen(open);
  };
  const [photoId, setPhotoId] = useState<string | null>(null);
  const photo = scenes.find(scene => scene.id === photoId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!writingSceneId || !scenes.some(scene => scene.id === writingSceneId)) return;
    setSelectedId(writingSceneId);
    onWritingOpened();
  }, [writingSceneId, scenes, onWritingOpened]);
  useEffect(() => { if (pickerOpen) useServiceTutorial.getState().advance('comicStart', 'comicPick'); }, [pickerOpen]);
  const selected = scenes.find(scene => scene.id === selectedId);
  const selectedArtwork = selected ? COMIC_SCENES.find(scene => scene.id === selected.image) ?? character.scenes[0] : null;
  const update = (next: ComicDayScene[]) => { onUpdate(next); };
  const patch = (id: string, fields: Partial<ComicDayScene>) => {
    update(scenes.map(scene => scene.id === id ? { ...scene, ...fields } : scene));

  };
  const open = (id: string) => {
    setPhotoId(id);
  };
  const activeTutorialStep = useServiceTutorial(state => state.active && state.mode === 'comic' ? state.step : null);
  const tutorialScene = useServiceTutorial(state => state.sceneKey);
  // Tutorial progress is the source of truth on the very first render, including
  // remounts with a stale saved board route. Do not wait for an effect to open it.
  const tutorialPicking = activeTutorialStep === 'comicPick' || activeTutorialStep === 'comicReturn';
  const pickerVisible = false;
  useEffect(() => {
    if (activeTutorialStep !== 'comicMemo' || selectedId || !tutorialScene) return;
    if (!scenes.some(scene => scene.id === tutorialScene)) return;
    setSelectedId(tutorialScene);
  }, [activeTutorialStep, tutorialScene, selectedId, scenes]);
  const addOrResume = () => { Keyboard.dismiss(); onAddOriginalPhoto(); };
  const finishClose = () => {
    if (selectedId) completeTutorialSceneClose(selectedId);
    setSelectedId(null);
  };
  // 「나중에」등으로 튜토리얼만 넘어가면 장면 창이 남을 수 있어 강제로 닫는다.
  useEffect(() => {
    if (activeTutorialStep !== 'comicSuccess' || !selectedId) return;
    const timer = setTimeout(() => {
      setSelectedId(null);
    }, 700);
    return () => clearTimeout(timer);
  }, [activeTutorialStep, selectedId]);
  const removeScene = (id: string) => Alert.alert(t('comicDay.deleteScene'), `${scenes.find(scene => scene.id === id)?.title ?? ''}\n\n${t('comicDay.deleteHint')}`, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('comicDay.deleteScene'), style: 'destructive', onPress: () => {
      update(scenes.filter(scene => scene.id !== id));
      if (selectedId === id) setSelectedId(null);
      if (photoId === id) setPhotoId(null);
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

  const hasWallpaper = useWallpaperStore(state => !!state.wallpaper);
  return <View style={{ flex: 1, backgroundColor: !hasWallpaper && isDark ? '#262B28' : 'transparent' }}>
    {photo ? <HeroImageActions initialDraft={photo.polaroidSettings} onSaveDraft={async draft => { patch(photo.id, await applyPolaroidDraft(draft, photo.originalArtworkUri ?? photo.artworkUri)); }} onDelete={() => removeScene(photo.id)} key={photo.id} onSaveText={text => patch(photo.id, text)} editorOnly onEditorClose={() => setPhotoId(null)} uri={photo.originalArtworkUri ?? photo.artworkUri} source={(COMIC_SCENES.find(scene => scene.id === photo.image) ?? character.scenes[0]).source} title={photo.title} memo={photo.memo} paper={photo.paper} pen={photo.pen} fontId={photo.fontId} exportDate={comicDiaryDate(diary) ?? date} /> : null}
    {!selected ? <ServiceTutorialCoach steps={['comicTools', 'comicOpen', 'comicMemo', 'comicTask', 'comicCheck', 'comicSuccess']} /> : null}
    <ComicDayBoard overviewOpen={overviewOpen} onOverviewChange={onOverviewChange} focusSceneId={focusSceneId} onActiveSceneChange={onActiveSceneChange} onOpenBag={onOpenBag} character={character} sceneLibrary={character.scenes} detailOpen={!!selected} hideCharacterHeading={hideCharacterHeading} diaryTitle={diary.title} onSelectCharacter={onSelectCharacter} items={scenes.filter(scene => !pendingPrintUri || scene.artworkUri !== pendingPrintUri).map(scene => ({ key: scene.id, label: scene.title, memo: scene.memo, artworkUri: scene.artworkUri, exportDate: comicDiaryDate(diary) ?? date, icon: '', faceColor: scene.paper, inkColor: scene.pen, fontId: scene.fontId }))}
      ink={ink} muted={muted} isDark={isDark} choices={Object.fromEntries(scenes.map(scene => [scene.id, scene.image]))}
      onOpen={open}
      onEditCard={(id, text) => patch(id, text)}
      onRemove={removeScene}
      onRemoveMany={removeScenes}
      onAddPhoto={onOpenCameraAlbum}
      onAdd={addOrResume} />
    {pickerVisible ? <ComicScenePicker targetDiaryId={diary.id} embedded={!pickingSingle} library={(additionCharacter ?? character).scenes} scenes={scenes} onChange={update} selectionPurpose={pickingSingle ? 'add' : undefined} onSelectScene={pickingSingle ? image => {
      update([...scenes, { ...newComicScene(''), image }]);
      setPickingSingle(false); onAdditionComplete(); showPicker(false);
    } : undefined} onClose={() => { setPickingSingle(false); onAdditionComplete(); showPicker(false); }} /> : null}
    {additionImages ? <Modal visible animationType="fade" onRequestClose={() => setAdditionImages(null)}><HeroGeneratedArtworkPicker images={additionImages} onChooseScene={image => { update([...scenes, { ...newComicScene(''), image }]); setAdditionImages(null); showPicker(false); }} ink={ink} paper={isDark ? '#262B28' : '#F7F6F4'} onClose={() => setAdditionImages(null)} onChoose={image => {
      update([...scenes, { ...newComicScene(''), image: image.sceneId ?? character.scenes[0].id, artworkUri: image.uri }]);
      setAdditionImages(null); showPicker(false);
    }} /></Modal> : null}
    {selected ? <HeroImageActions
      key={`detail-editor:${selected.id}`}
      initialDraft={selected.polaroidSettings}
      onSaveDraft={async draft => { patch(selected.id, await applyPolaroidDraft(draft, selected.originalArtworkUri ?? selected.artworkUri)); }}
      onDelete={() => removeScene(selected.id)}
      editorOnly
      onEditorClose={finishClose}
      onSaveText={text => patch(selected.id, text)}
      uri={selected.originalArtworkUri ?? selected.artworkUri}
      source={selectedArtwork?.source}
      title={selected.title}
      memo={selected.memo}
      paper={selected.paper}
      pen={selected.pen}
      fontId={selected.fontId}
      exportDate={comicDiaryDate(diary) ?? date}
    /> : null}
  </View>;
}
const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8 },
  headerClose: { width: 52, height: 52, marginTop: 4, marginRight: -4, alignItems: 'center', justifyContent: 'center' },
  closeButton: { marginLeft: 'auto', minWidth: 76, minHeight: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  memoHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginTop: 10, marginBottom: 8 },
  changeSceneButton: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: 'transparent' },
  detailFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 18, paddingVertical: 10 },
  touch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 24 }, detailFields: { paddingHorizontal: 20 }, title: { fontSize: 23, minHeight: 44, marginHorizontal: 20 },
  section: { fontSize: 19, marginTop: 22, marginBottom: 8 },
  todoEntry: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.7, borderColor: '#999', marginBottom: 4 }, todo: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 0.5, borderColor: '#B6B6B0', minHeight: 48 },
  palette: { gap: 10, paddingVertical: 18 },
  paletteRow: { flexDirection: 'row', gap: 4, alignItems: 'center', minHeight: 40 },
  paletteScroller: { flex: 1, minWidth: 0 },
  paletteScroll: { alignItems: 'center', gap: 4, paddingRight: 8 },
  paletteDivider: { height: 21, width: 0.5, backgroundColor: '#B6B6B0', marginHorizontal: 4 },
  colorTouch: { width: 28, height: 36, alignItems: 'center', justifyContent: 'center' },
  colorRing: { width: 27, height: 27, borderRadius: 15, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 22, height: 22, borderRadius: 11, borderWidth: 0.7, borderColor: '#777' },
  encourage: { color: '#888', textAlign: 'center', paddingVertical: 16, borderTopWidth: 0.5, borderColor: '#B6B6B0', fontSize: 14 },
});
