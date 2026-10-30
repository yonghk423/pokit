import { HeroInlineComposer } from './HeroInlineComposer';
import { flushLocalStorageClientWrites } from '@shared/lib/storage/localStorageClient';
import type { HeroCardText } from './HeroCardCaption';
import type { ComicSceneId } from '../lib/heroSceneImages';
import { comicDiaryDate } from '../lib/heroCalendar';
import { loadComicDiaryHome, rememberComicDiaryHistorySelection } from '../lib/heroDiaryHome';
import { HeroDiaryCalendar } from './HeroDiaryCalendar';
import { getPendingHeroAiJob, type PendingHeroAiJob } from '../lib/heroAiClient';
import { HeroPersonalizationFlow } from './HeroPersonalizationFlow';
import type { HeroAiResult } from '../lib/heroAiClient';
import { HeroCardFlip, type HeroCardFlipHandle, type HeroCardOpen } from './HeroCardFlip';
import { TutorialGuideLayer } from '@shared/ui/tutorial-guide-layer';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { useServiceTutorial, tutorialDiaryId, completeTutorialSceneClose } from '../../welcome-intro/model/serviceTutorial';
import { ServiceTutorialCoach } from '../../welcome-intro/ui/ServiceTutorialCoach';
import { ComicTodoViewport } from './HeroTodoViewport';
import { ComicMemoField } from './HeroMemoField';
import { ComicDiaryLibrary } from './HeroDiaryLibrary';
import { COMIC_DIARY_STORAGE_KEY, loadComicDiaryLibrary, createComicDiary, deleteComicDiaries, saveComicDiaryLibrary, updateComicDiary, type ComicDiary, type ComicDiaryLibrary as LibraryState } from '../lib/heroDiaryStorage';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { PenFrame } from '@shared/ui/pen-frame';
import { PaperControl } from '@shared/ui/paper-control';
import { clearComicNavigation, loadComicNavigation, saveComicNavigation } from '../lib/heroNavigation';
import { ComicSceneImage } from './HeroSceneImage';
import { ComicCheck } from './HeroCheck';
import { loadComicCharacterName } from '../lib/heroCharacterName';
import { HeroCharacterList } from './HeroCharacterList';
import { ComicCharacterChooser } from './HeroCharacterChooser';
import { COMIC_CHARACTERS, type ComicCharacter } from '../lib/heroCharacters';
import Svg, { Path } from 'react-native-svg';
import { AppAlert as Alert } from '@shared/lib/app-alert';
import { AppModal as Modal } from '@shared/ui/app-modal';
import { ComicScenePicker } from './HeroScenePicker';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { forwardRef, useCallback, useEffect, useLayoutEffect, useImperativeHandle, useRef, useState } from 'react';
import { Image as NativeImage, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { PaperGrain } from '@shared/ui/paper-grain';
import { newComicScene, type ComicDayScene } from '../lib/heroDayStorage';
import { ComicDayBoard } from './HeroDayBoard';
import { COMIC_PAPER_COLORS, COMIC_PEN_COLORS } from '../lib/heroScenePalette';

type PlannerProps = { entryActionsInHeader?: boolean; onOpenBag?: () => void; date: string; ink: string; muted: string; isDark: boolean; onTitleChange?: (title: string | null) => void; onCharacterNameChange?: (name: string | null) => void; hideCharacterHeading?: boolean };
export type ComicDiaryHandle = { openLibrary: () => void; openCalendar: () => void; openToday: () => void; openPhotoEntry: () => void; openSceneEntry: () => void; renameDiary: () => void };
export const IndependentComicPlanner = forwardRef<ComicDiaryHandle, PlannerProps>(function IndependentComicPlanner(props, ref) {
  return <ComicPlannerForDate key={props.date} {...props} ref={ref} />;
});
const ComicPlannerForDate = forwardRef<ComicDiaryHandle, PlannerProps>(function ComicPlannerForDate(props, ref) {
  const { onTitleChange, onCharacterNameChange } = props;
  const activeSceneRef = useRef<string | null>(null);
  const draftRef = useRef<{ image: ComicSceneId; text: HeroCardText } | null>(null);
  const captureDraft = useCallback((image: ComicSceneId, text: HeroCardText) => { draftRef.current = { image, text }; }, []);
  const captureActiveScene = useCallback((id: string) => { activeSceneRef.current = id; }, []);
  const [inlineTarget, setInlineTarget] = useState<{ diaryId?: string; sceneId?: string; image: ComicSceneId; text: HeroCardText } | null>(null);
  const [photoEntryOpen, setPhotoEntryOpen] = useState(false);
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
  useEffect(() => { let active = true; void getPendingHeroAiJob().then(job => { if (active) setRecoveryJob(job); }).catch(() => undefined); return () => { active = false; }; }, []);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [characterListOpen, setCharacterListOpen] = useState(false);
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
  const tutorialStep = useServiceTutorial(state => state.active && state.mode === 'comic' ? state.step : null);
  useEffect(() => { if (tutorialStep === 'comicCharacter') setCreating(true); }, [tutorialStep]);
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
  const diary = library.diaries.find(item => item.id === activeDiaryKey);
  const character = COMIC_CHARACTERS.find(item => item.id === diary?.characterId);
  const commit = (next: LibraryState) => { saveComicDiaryLibrary(next); setLibrary(next); };
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
    const scene = diary?.scenes.find(value => value.id === activeSceneRef.current) ?? diary?.scenes[0];
    setInlineTarget(scene ? { diaryId: diary!.id, sceneId: scene.id, image: scene.image, text: { title: scene.title, memo: scene.memo, paper: scene.paper, pen: scene.pen } } : { image: draftRef.current?.image ?? COMIC_CHARACTERS[0].scenes[0].id, text: draftRef.current?.text ?? { title: '', memo: '' } });
    setCharacterListOpen(false); setPhotoEntryOpen(true); setLibraryOpen(false); setCalendarOpen(false);
    void getPendingHeroAiJob().then(job => { if (job?.story) setRecoveryJob(job); }).catch(() => undefined);
    if (useServiceTutorial.getState().active) useServiceTutorial.getState().pause();
  }, [diary]);
  const openSceneEntry = useCallback(() => {
    setAddingToId(diary?.id ?? null);
    setCharacterListOpen(value => !value);
    setLibraryOpen(false); setCalendarOpen(false); setPhotoEntryOpen(false);
    Keyboard.dismiss();
  }, [diary?.id]);
  useImperativeHandle(ref, () => ({ openPhotoEntry, openSceneEntry, openToday, openLibrary, openCalendar: () => setCalendarOpen(true), renameDiary }), [openPhotoEntry, openSceneEntry, openToday, openLibrary, renameDiary]);
  const headerName = !creating && character ? diary?.characterName ?? loadComicCharacterName(character.id) ?? t(character.name) : null;
  useLayoutEffect(() => { onCharacterNameChange?.(headerName); }, [headerName, onCharacterNameChange]);
  useLayoutEffect(() => { onTitleChange?.(creating ? null : diary?.title ?? null); }, [creating, diary?.title, onTitleChange]);
  const create = (next: ComicCharacter, characterName?: string) => {
    setCharacterListOpen(false);
    const target = library.diaries.find(item => item.id === addingToId);
    if (target) {
      commit({ ...library, activeId: target.id });
      saveComicNavigation(target.characterId, 'board', target.id);
      setAdditionChoice(null); setAddingToId(null); setChooserReturn(null); setCreating(false);
      Keyboard.dismiss(); return;
    }
    let number = library.diaries.length + 1;
    for (let attempt = 0; attempt <= library.diaries.length && library.diaries.some(item => item.title === t('comicDiary.defaultTitle', { number })); attempt++) number++;
    let nextLibrary = createComicDiary(library, next.id, t('comicDiary.defaultTitle', { number }), characterName?.trim() || t(next.name));
    const diaryKey = nextLibrary.activeId!;
    const image = next.scenes[Math.floor(Math.random() * next.scenes.length)] ?? next.scenes[0];
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
    const scenes = images.map((image, index) => ({ ...newComicScene(image.sceneId ? t(character.scenes.find(scene => scene.id === image.sceneId)!.label) : t('comicDay.ai.sceneTitle', { count: index + 1 })), image: image.sceneId ?? character.scenes[0].id, artworkUri: image.uri }));
    next = updateComicDiary(next, id, { scenes });
    commit(next); saveComicNavigation(character.id, 'board', id);
    if (useServiceTutorial.getState().active) useServiceTutorial.getState().pause();
    setChooserReturn(null); setCreating(false); Keyboard.dismiss();
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
  const showEmptyBoard = !diary && !creating;
  const showPlanner = Boolean(diary && character && !creating);
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
    const duplicate = next.diaries.find(value => value.scenes.some(scene => scene.artworkUri === uri));
    if (!duplicate) {
      let target = next.diaries.find(value => value.id === inline?.diaryId);
      if (!target) {
        next = createComicDiary(next, COMIC_CHARACTERS[0].id, t('comicDiary.defaultTitle', { number: next.diaries.length + 1 }));
        target = next.diaries.find(value => value.id === next.activeId)!;
      }
      const existing = target.scenes.find(value => value.id === inline?.sceneId);
      const updated = { ...(existing ?? newComicScene(text.title)), ...text, paper: text.paper ?? existing?.paper ?? '#F5E8CF', pen: text.pen ?? existing?.pen ?? props.ink, image: inline?.image ?? COMIC_CHARACTERS[0].scenes[0].id, artworkUri: uri };
      next = { ...updateComicDiary(next, target.id, { scenes: existing ? target.scenes.map(value => value.id === existing.id ? updated : value) : [...target.scenes, updated] }), activeId: target.id };
    } else next = { ...next, activeId: duplicate.id };
    commit(next);
    await flushLocalStorageClientWrites();
    saveComicNavigation(COMIC_CHARACTERS[0].id, 'board', next.activeId!);
    setPhotoEntryOpen(false); setInlineTarget(null); setRecoveryJob(null); setCreating(false);
  };
  return <TutorialGuideLayer><View style={{ flex: 1 }}>
    <HeroCharacterList open={characterListOpen} ink={props.ink} muted={props.muted} selectedId={character?.id} onSelect={next => create(next)} />
    <ServiceTutorialCoach characterChoosing={showChooser} steps={showChooser ? [] : showPlanner ? ['comicStart'] : ['comicStart', 'comicCharacter', 'comicName', 'comicReady']} />
    {showEmptyBoard ? <ComicDayBoard hideEntryActions={props.entryActionsInHeader} onDraftChange={captureDraft} onCreateRandom={createRandomDiary} onAddPhoto={openPhotoEntry} onOpenBag={props.onOpenBag} hideCharacterHeading={props.hideCharacterHeading} diaryTitle={t('comicDiary.title')} items={[]} choices={{}} ink={props.ink} muted={props.muted} isDark={props.isDark} onOpen={() => undefined} onAdd={() => { useServiceTutorial.getState().advance('comicStart', 'comicCharacter'); setChooserReturn('board'); setCharacterDraft(value => value + 1); setCreating(true); }} /> : showPlanner ? <CharacterComicPlanner key={diary!.id} {...props} diary={diary!} character={character!} onActiveSceneChange={captureActiveScene} onAdditionComplete={() => setAdditionChoice(null)} additionCharacter={additionChoice?.diaryId === diary!.id ? additionChoice.character : null}
      onAddCharacter={() => { clearComicNavigation(); setAddingToId(diary!.id); setChooserReturn('board'); setCharacterDraft(value => value + 1); setCreating(true); }}
      onUpdate={scenes => commit(updateComicDiary(library, diary!.id, { scenes }))}
      onSelectCharacter={() => { if (!diary!.scenes.length) commit(deleteComicDiaries(library, [diary!.id])); clearComicNavigation(); setChooserReturn('board'); setCharacterDraft(value => value + 1); setCreating(true); }} /> : <>
      <ComicCharacterChooser key={characterDraft} lockedCharacterName={addingToId ? (library.diaries.find(item => item.id === addingToId)?.characterName || t(COMIC_CHARACTERS[0].name)) : undefined} targetDiaryId={addingToId ?? undefined} requireExplicitChoice={tutorialActive} ink={props.ink} muted={props.muted} isDark={props.isDark} onPersonalize={() => { setCreating(false); setChooserReturn(null); setAddingToId(null); openPhotoEntry(); }} onStart={create} onGenerated={createGenerated} onClose={chooserReturn ? cancelCreate : undefined} />
    </>}
    {(photoEntryOpen || inlineRecovery) && inline ? <View testID="hero-inline-workspace" style={[StyleSheet.absoluteFill, { backgroundColor: props.isDark ? '#262B28' : '#F7F6F4', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16 }]}>
      <HeroInlineComposer key={inlineRecovery?.id ?? inline.sceneId ?? 'new'} sceneId={inline.image} {...inline.text} ink={inline.text.pen ?? props.ink} targetDiaryId={inline.diaryId} targetSceneId={inline.sceneId} recoveryJob={inlineRecovery} onApply={applyInline} onClose={() => { setPhotoEntryOpen(false); setInlineTarget(null); setRecoveryJob(null); }} />
    </View> : null}
    {recoveryJob && !recoveryJob.story ? <Modal visible onRequestClose={() => setRecoveryJob(null)}><View style={{ flex: 1, paddingTop: 40, paddingBottom: 24 }}><HeroPersonalizationFlow recoveryJob={recoveryJob} onClose={() => setRecoveryJob(null)} onApply={images => { const target = library.diaries.find(item => item.id === recoveryJob.targetDiaryId);
      if (target) {
        const character = COMIC_CHARACTERS[0];
        const scenes = images.map((image, index) => ({ ...newComicScene(image.sceneId ? t(character.scenes.find(scene => scene.id === image.sceneId)!.label) : t('comicDay.ai.sceneTitle', { count: index + 1 })), image: image.sceneId ?? character.scenes[0].id, artworkUri: image.uri }));
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
      onClose={() => setLibraryOpen(false)} onCreate={() => { setChooserReturn('library'); setCharacterDraft(value => value + 1); setCreating(true); setLibraryOpen(false); }}
      onOpen={id => { rememberComicDiaryHistorySelection(props.date, id); const opened = library.diaries.find(item => item.id === id)!; saveComicNavigation(opened.characterId, 'board', id); commit({ ...library, activeId: id }); setChooserReturn(null); setCreating(false); setLibraryOpen(false); }}
      onRename={(id, title) => commit(updateComicDiary(library, id, { title }))} onDelete={id => removeMany([id])} onDeleteMany={removeMany} /> : null}
  </View></TutorialGuideLayer>;
});
function CharacterComicPlanner({ ink, muted, isDark, character, diary, onUpdate, onSelectCharacter, hideCharacterHeading, onOpenBag, onAddCharacter, additionCharacter, onActiveSceneChange, onAdditionComplete }: PlannerProps & { onAdditionComplete: () => void; onActiveSceneChange?: (id: string) => void; onAddCharacter: () => void; additionCharacter: ComicCharacter | null; diary: ComicDiary; onUpdate: (scenes: ComicDayScene[]) => void; character: ComicCharacter; onSelectCharacter: () => void }) {
  const { t } = useTranslation();
  const scenes = diary.scenes;
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
  const [changingScene, setChangingScene] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [todoDraft, setTodoDraft] = useState('');
  const flipRef = useRef<HeroCardFlipHandle>(null);
  const [detailFrontReady, setDetailFrontReady] = useState(false);
  const markDetailFrontReady = useCallback(() => setDetailFrontReady(true), []);
  const restoreDetailFront = useCallback(() => setDetailFrontReady(false), []);
  const [openedCard, setOpenedCard] = useState<HeroCardOpen | null>(null);
  const { width } = useWindowDimensions();
  useEffect(() => { if (pickerOpen) useServiceTutorial.getState().advance('comicStart', 'comicPick'); }, [pickerOpen]);
  const selected = scenes.find(scene => scene.id === selectedId);
  const selectedArtwork = selected ? character.scenes.find(scene => scene.id === selected.image) ?? character.scenes[0] : null;
  const artworkAsset = selectedArtwork ? NativeImage.resolveAssetSource(selectedArtwork.source) : null;
  const detailImageRatio = selected?.artworkUri ? 2 / 3 : selectedArtwork?.id === '04-laundry' ? 1.5
    : artworkAsset && artworkAsset.width > 0 && artworkAsset.height > 0 ? artworkAsset.width / artworkAsset.height : 1.5;
  const detailImageWidth = Math.min(width - 24, 580);
  const update = (next: ComicDayScene[]) => { onUpdate(next); };
  const patch = (id: string, fields: Partial<ComicDayScene>) => {
    update(scenes.map(scene => scene.id === id ? { ...scene, ...fields } : scene));

  };
  const open = (id: string, card?: HeroCardOpen) => {
    useServiceTutorial.getState().advance('comicOpen', 'comicMemo', { sceneKey: id });
    setDetailFrontReady(false); setOpenedCard(card ?? null); setTodoDraft(''); setSelectedId(id);
  };
  const activeTutorialStep = useServiceTutorial(state => state.active && state.mode === 'comic' ? state.step : null);
  const tutorialScene = useServiceTutorial(state => state.sceneKey);
  // Tutorial progress is the source of truth on the very first render, including
  // remounts with a stale saved board route. Do not wait for an effect to open it.
  const tutorialPicking = activeTutorialStep === 'comicPick' || activeTutorialStep === 'comicReturn';
  const pickerVisible = pickerOpen || tutorialPicking || !!additionCharacter;
  useEffect(() => {
    if (activeTutorialStep !== 'comicMemo' || selectedId || !tutorialScene) return;
    if (!scenes.some(scene => scene.id === tutorialScene)) return;
    setDetailFrontReady(false); setOpenedCard(null); setTodoDraft(''); setSelectedId(tutorialScene);
  }, [activeTutorialStep, tutorialScene, selectedId, scenes]);
  const addOrResume = () => {
    const unused = character.scenes.filter(image => !scenes.some(scene => scene.image === image.id));
    const pool = unused.length ? unused : character.scenes;
    const image = pool[Math.floor(Math.random() * pool.length)] ?? character.scenes[0];
    update([...scenes, { ...newComicScene(''), image: image.id }]);
    showPicker(false);
    if (useServiceTutorial.getState().active) useServiceTutorial.getState().pause();
    Keyboard.dismiss();
  };
  const close = () => flipRef.current?.close();
  const finishClose = () => {
    if (selectedId) completeTutorialSceneClose(selectedId);
    setSelectedId(null); setOpenedCard(null); setDetailFrontReady(false); setChangingScene(false);
  };
  // 「나중에」등으로 튜토리얼만 넘어가면 장면 창이 남을 수 있어 강제로 닫는다.
  useEffect(() => {
    if (activeTutorialStep !== 'comicSuccess' || !selectedId) return;
    flipRef.current?.close();
    const timer = setTimeout(() => {
      setSelectedId(null); setOpenedCard(null); setDetailFrontReady(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [activeTutorialStep, selectedId]);
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
    {!selected ? <ServiceTutorialCoach steps={['comicTools', 'comicOpen', 'comicMemo', 'comicTask', 'comicCheck', 'comicSuccess']} /> : null}
    <ComicDayBoard onActiveSceneChange={onActiveSceneChange} onOpenBag={onOpenBag} sceneLibrary={character.scenes} detailOpen={!!selected && detailFrontReady} hideCharacterHeading={hideCharacterHeading} diaryTitle={diary.title} onSelectCharacter={onSelectCharacter} items={scenes.map(scene => ({ key: scene.id, label: scene.title, memo: scene.memo, artworkUri: scene.artworkUri, icon: '', faceColor: scene.paper, inkColor: scene.pen }))}
      ink={ink} muted={muted} isDark={isDark} choices={Object.fromEntries(scenes.map(scene => [scene.id, scene.image]))}
      onOpen={open}
      onEditCard={(id, text) => patch(id, text)}
      onRemove={removeScene}
      onRemoveMany={removeScenes}
      onAdd={addOrResume} />
    {pickerVisible ? <ComicScenePicker targetDiaryId={diary.id} embedded library={(additionCharacter ?? character).scenes} scenes={scenes} onChange={update} onClose={() => { onAdditionComplete(); showPicker(false); }} /> : null}
    {selected ? <HeroCardFlip ref={flipRef} transition="fade" cornerRadius={16} imageAspectRatio={detailImageRatio} isDark={isDark} card={openedCard} paper={selected.paper} closeLabel={t('common.close')} onClosed={finishClose} onFrontReady={markDetailFrontReady} onRestoreFront={restoreDetailFront}
      fallbackFront={<ComicSceneImage fillPortrait contentFit="contain" backgroundColor={selected.paper} imageKey={`${selected.artworkUri ?? selected.image}:flip-front`} source={selected.artworkUri ? { uri: selected.artworkUri } : (character.scenes.find(scene => scene.id === selected.image) ?? character.scenes[0]).source} style={{ width: '100%', height: '100%' }} />}>
          <ServiceTutorialTarget steps={['comicMemo', 'comicTask', 'comicCheck']} spotlight={false} style={{ flex: 1 }}>
          <PaperGrain />
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={s.head}><ThemedText style={{ color: selected.pen }}>{t('comicDay.sceneNumber', { number: String(scenes.indexOf(selected) + 1).padStart(2, '0') })}</ThemedText><ServiceTutorialTarget steps={['comicMemo', 'comicTask', 'comicCheck']}><Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); close(); }} style={s.headerClose}><ThemedText style={{ fontSize: 32, lineHeight: 36, color: selected.pen }}>×</ThemedText></Pressable></ServiceTutorialTarget></View>
            <ServiceTutorialCoach steps={['comicMemo', 'comicTask', 'comicCheck', 'comicSuccess']} onSkipStep={() => { flipRef.current?.close(); }} onEnd={() => { flipRef.current?.close(); }} />
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
              <ThemedTextInput accessibilityLabel={t('comicDay.sceneTitle')} value={selected.title} onChangeText={title => patch(selected.id, { title })} style={[s.title, { color: selected.pen }]} maxLength={80} placeholder={t('comicDay.sceneTitle')} placeholderTextColor="#888" />
              <ComicSceneImage contentFit="contain" contentPosition="center" backgroundColor={selected.paper} imageKey={`${selected.artworkUri ?? selected.image}:original`} source={selected.artworkUri ? { uri: selected.artworkUri } : selectedArtwork!.source} style={{ width: '100%', height: detailImageWidth / detailImageRatio }} />
              <Pressable testID="hero-detail-change-scene" accessibilityRole="button" accessibilityLabel={t('comicDay.change')} onPress={() => { tapHaptic(); Keyboard.dismiss(); setChangingScene(true); }} style={({ pressed }) => [s.changeSceneButton, { opacity: pressed ? 0.6 : 1 }]}>
                <PenFrame color={selected.pen} />
                <Svg width={17} height={17} viewBox="0 0 24 24" accessible={false}><Path d="M4 5q8-.5 16 0l-.2 15-15.9-.1ZM5 17l5-6 4 4 2-2 3 4M16 8h.1" fill="none" stroke={selected.pen} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" /></Svg>
                <ThemedText style={{ color: selected.pen, fontSize: 13 }}>{t('comicDay.change')}</ThemedText>
              </Pressable>
              <View style={s.detailFields}>
              <ThemedText style={[s.section, { color: selected.pen }]}>{t('comicDay.memo')}</ThemedText>
              <ComicMemoField key={`${selected.id}:memo`} value={selected.memo} ink={selected.pen} onChangeText={memo => patch(selected.id, { memo })} />
              <ThemedText style={[s.section, { color: selected.pen }]}>{t('comicDay.todos')}</ThemedText>
              <View style={s.todoEntry}>
                <ThemedTextInput accessibilityLabel={t('comicDay.todoHint')} placeholder={t('comicDay.todoHint')} placeholderTextColor="#888" value={todoDraft} onChangeText={setTodoDraft} onSubmitEditing={addTodo} returnKeyType="done" submitBehavior="submit" style={{ flex: 1, color: selected.pen, fontSize: 16, minHeight: 44 }} />
                <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.addTodo')} disabled={!todoDraft.trim()} accessibilityState={{ disabled: !todoDraft.trim() }} style={[s.touch, { opacity: todoDraft.trim() ? 1 : 0.35 }]} onPress={() => { tapHaptic(); addTodo(); }}><ThemedText style={{ color: selected.pen, fontSize: 28 }}>⊕</ThemedText></Pressable>
              </View>
              <ComicTodoViewport key={`${selected.id}:todos`}>{selected.todos.map(todo => <View key={todo.id} style={s.todo}>
                <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: todo.completed }} accessibilityLabel={todo.text || t('comicDay.todos')} style={s.touch} onPress={() => { tapHaptic('select'); patch(selected.id, { todos: selected.todos.map(item => item.id === todo.id ? { ...item, completed: !item.completed } : item) }); }}><ComicCheck checked={todo.completed} size={27} paper={selected.paper} /></Pressable>
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
                    {(kind === 'paper' ? COMIC_PAPER_COLORS : COMIC_PEN_COLORS).map(color => <Pressable key={color} accessibilityRole="button" accessibilityLabel={`${t(kind === 'paper' ? 'comicDay.paper' : 'comicDay.pen')} ${color}`} accessibilityState={{ selected: selected[kind] === color }} onPress={() => { tapHaptic('select'); patch(selected.id, { [kind]: color }); }} hitSlop={3} style={s.colorTouch}>
                      <View style={[s.colorRing, { borderColor: selected[kind] === color ? selected.pen : 'transparent' }]}>
                        <View style={[s.swatch, { backgroundColor: color }]} />
                      </View>
                    </Pressable>)}
                  </View>)}
                </ScrollView>
              </View>
              <ThemedText style={s.encourage}>{t('comicDay.encourage')}</ThemedText>
              <Pressable onPress={() => { tapHaptic('warn'); removeScene(selected.id); }}><ThemedText style={{ color: '#777', textAlign: 'right', fontSize: 12 }}>{t('comicDay.deleteScene')}</ThemedText></Pressable>
              </View>
            </ScrollView>
            <View style={s.detailFooter}>
              <ServiceTutorialTarget steps={['comicMemo', 'comicTask', 'comicCheck']}>
                <PaperControl accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { tapHaptic(); close(); }} style={s.closeButton}>
                  <ThemedText style={{ color: selected.pen, fontSize: 14 }}>{t('common.close')}</ThemedText>
                </PaperControl>
              </ServiceTutorialTarget>
            </View>
          </KeyboardAvoidingView>
          {changingScene ? <ComicScenePicker embedded library={character.scenes} scenes={scenes} onChange={update} selectedImage={selected.artworkUri ? undefined : selected.image} onSelectScene={image => { patch(selected.id, { image, artworkUri: undefined }); setChangingScene(false); }} onClose={() => setChangingScene(false)} /> : null}
          </ServiceTutorialTarget>
    </HeroCardFlip> : null}
  </View>;
}
const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 8 },
  headerClose: { width: 52, height: 52, marginTop: 4, marginRight: -4, alignItems: 'center', justifyContent: 'center' },
  closeButton: { marginLeft: 'auto', minWidth: 76, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#5F655C', borderRadius: 4 },
  changeSceneButton: { minHeight: 40, alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, marginRight: 18, marginVertical: 10 },
  detailFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 18, paddingVertical: 10 },
  touch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  content: { paddingBottom: 24 }, detailFields: { paddingHorizontal: 20 }, title: { fontSize: 23, minHeight: 44, marginHorizontal: 20 },
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
