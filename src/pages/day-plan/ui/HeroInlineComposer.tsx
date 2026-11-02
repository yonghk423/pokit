import { getHeroGenerationAspectRatio } from '../lib/heroGenerationFrame';
import { HeroColorPaletteSurface } from './HeroColorPaletteSurface';
import { HeroReorderableStyleRail } from './HeroReorderableStyleRail';
import { DayPlanComposerKeyboardContext } from '../model/dayPlanHeaderActions';
import { HeroInfoHint } from './HeroInfoHint';
import { completeHeroInfoHint } from '@shared/lib/storage/heroInfoHintStorage';
import { AppModal } from '@shared/ui/app-modal';
import { PenFrame } from '@shared/ui/pen-frame';
import { HeroStoryNotebook } from './HeroStoryNotebook';
import { HeroGenerateIcon } from './HeroGenerateIcon';
import { HeroAiHelpModal, heroAiHelpLabel } from './HeroAiHelpModal';
import { useContext, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Animated, Easing, Keyboard, Platform, Pressable, ScrollView, StyleSheet, useAnimatedValue, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppAlert } from '@shared/lib/app-alert';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ComicSceneImage } from './HeroSceneImage';
import { HeroPhotoSource } from './HeroPhotoSource';
import { SELECTABLE_COMIC_CHARACTERS } from '../lib/heroCharacters';
import { COMIC_PAPER_COLORS, COMIC_PEN_COLORS } from '../lib/heroScenePalette';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { type ComicSceneId } from '../lib/heroSceneImages';
import { getHeroAiRemaining, generateHeroImages, resumeHeroAiJob, cancelHeroAiJob, getPendingHeroAiJob, dismissHeroAiJob, HeroAiError, type PendingHeroAiJob } from '../lib/heroAiClient';
import { loadHeroSavedFaces, saveHeroFace, deleteHeroFace, type HeroSavedFace } from '../lib/heroSavedFaces';
import type { HeroCardText } from './HeroCardCaption';

export const HERO_SELECTED_STYLE_KEY = 'pokit:hero-selected-illustration-style-v1';

/** Two lightly varied pen strokes, matching the app's hand-drawn controls. */
function PenCircle({ selected = false, color, size }: { selected?: boolean; color: string; size?: number }) {
  return <Svg pointerEvents="none" width={size ?? '100%'} height={size ?? '100%'} viewBox="0 0 56 56" style={StyleSheet.absoluteFill}>
    <Path d="M28 2.5C14 1.6 2.8 12.8 2.4 27.4 1.7 41.4 13.1 53.1 27.6 53.5 42.2 54.1 53.4 42.4 53.6 28.2 54 14.2 42.3 2.1 28 2.5Z" fill="none" stroke={color} strokeWidth={selected ? 1.5 : 0.85} strokeLinecap="round" />
    {selected ? <Path d="M8.2 13.5C3.4 20.7 3.3 34.8 8.4 42.3M35.6 51.6C46.7 48.7 52.4 39.9 52 28.4" fill="none" stroke={color} strokeWidth={0.55} strokeLinecap="round" opacity={0.55} /> : null}
  </Svg>;
}

/** Traced proportions from the approved 5:45 reference, including the capsule. */
function StoryModeIcon({ mode, ink, paper, selected }: { mode: 'character' | 'photo'; ink: string; paper: string; selected: boolean }) {
  return <Svg width="100%" height="100%" viewBox="0 0 500 125" accessible={false} pointerEvents="none" style={StyleSheet.absoluteFill}>
    <Path d="M62 3Q251 2 439 3C471 3 495 28 496 61c1 33-24 61-57 61L62 121C29 121 4 96 4 63 3 30 29 3 62 3Z" fill="none" stroke={ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" opacity={selected ? 1 : .8} />
    {selected ? <Path d="M21 103Q38 120 64 120L439 121q29-1 45-20" fill="none" stroke={ink} strokeWidth={4.3} strokeLinecap="round" /> : null}
    {mode === 'character' ? <>
      <Path d="m223 52-36 13 36 41 79-23-24-27Z" fill="#FFFFFF" />
      <Path d="m272 14-15 23 18 12 18-23Z" fill="#75B9A5" />
      <Path d="m256 46-14 13-4 26-5 10 9 2 10-12 16-11 1-18Z" fill="#D8BD72" />
      <Path d="m223 52-36 13 36 41m5-1 74-22-24-27" fill="none" stroke={ink} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m211 70 5-1 6 3 1 5 7-1" fill="none" stroke={ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m272 14-15 23 18 12 18-23M257 37l-5 9 16 11 7-8m-19-3-14 13-4 26-5 10 9 2 10-12 16-11 1-18" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m234 94 17-28m1-7a2.5 2.5 0 1 0 .1 0" fill="none" stroke={ink} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    </> : <>
      <Path d="M183 49q0-6 6-6l28-1 4-6 32-.5 3 6h23q5 0 5 5v39q0 6-6 6h-89q-6 0-6-6Z" fill="#F8F7EF" />
      <Path d="M184 60h99v26q0 5-5 5h-89q-5 0-5-5Z" fill="#315E63" />
      <Path d="M250 68c0-28-42-28-42 0s42 28 42 0Z" fill="#B8BAB4" />
      <Path d="M241 68c0-16-24-16-24 0s24 16 24 0Z" fill="#303634" />
      <Path d="M220 65q1-5 5-6" stroke="#F7F5EC" strokeWidth={2} strokeLinecap="round" />
      <Path d="M183 49q0-6 6-6l28-1 4-6 32-.5 3 6h23q5 0 5 5v39q0 6-6 6h-89q-6 0-6-6Zm2 11h96m-96 26h90m-82-44v-4h9v4m9-2v-5h12v5m44 8h11v9h-11Z" fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M250 68c0-28-42-28-42 0s42 28 42 0Zm-4 0c0-22-34-22-34 0s34 22 34 0Zm-5 0c0-16-24-16-24 0s24 16 24 0ZM197 64a3.3 3.3 0 1 0 .1 0" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
      <Path d="m286 38 47 10-13 59-48-10Z" fill="#F8F7EF" stroke={ink} strokeWidth={2.6} strokeLinejoin="round" />
      <Path d="m290 44 36 8-9 42-36-8Z" fill="#FFFFFF" stroke={ink} strokeWidth={1.7} strokeLinejoin="round" />
      <Path d="m286 80-1 6 6 1m19 4 6 1 2-6" fill="none" stroke="#315E63" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </>}
  </Svg>;
}

function DrawingProgress({ elapsed, complete, ink, submitted }: { elapsed: number; complete: boolean; ink: string; submitted: boolean }) {
  const { t } = useTranslation();
  // The API returns finished images, so intermediate progress is explicitly estimated.
  const percent = complete ? 100 : Math.min(95, Math.floor(95 * (1 - Math.exp(-elapsed / 50))));
  const fill = useAnimatedValue(0);
  useEffect(() => {
    const animation = Animated.timing(fill, { toValue: percent / 100, duration: 400, easing: Easing.out(Easing.quad), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [fill, percent]);
  return <View style={s.progressContent}>
    <ThemedText style={[s.center, { color: ink }]}>{t(submitted ? 'comicDay.inline.drawing' : 'comicDay.inline.uploadingTitle')}</ThemedText>
    <ThemedText testID="hero-inline-progress-percent" style={[s.percent, { color: ink }]}>{percent}%</ThemedText>
    <View testID="hero-inline-progress" accessibilityRole="progressbar" accessibilityLabel={t('comicDay.loading.estimated')} accessibilityValue={{ min: 0, max: 100, now: percent }} style={s.progressTrack}>
      <View style={s.progressClip}><Animated.View style={[s.progressFill, { backgroundColor: '#69BFAE', transform: [{ scaleX: fill }] }]} /></View>
      <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 240 16" preserveAspectRatio="none" style={StyleSheet.absoluteFill}><Path d="M8 2.3Q119 1 231 2.2C240 2 239 14 231 13.8Q122 15 8 13.9C-.4 14.5.4 2.6 8 2.3Z" fill="none" stroke={ink} strokeWidth={1.1} /><Path d="M12 14.8Q104 15.4 193 14.7" fill="none" stroke={ink} strokeWidth={0.4} opacity={0.5} /></Svg>
    </View>
    <ThemedText style={s.hint}>{t('comicDay.loading.estimated')}</ThemedText>
    <ThemedText style={s.hint}>{t('comicDay.inline.elapsed', { seconds: elapsed })}</ThemedText>
    {elapsed >= 90 ? <ThemedText style={s.hint}>{t('comicDay.loading.longer')}</ThemedText> : null}
  </View>;
}

export function HeroInlineComposer({ visible = true, sceneId, title = '', memo = '', paper: cardPaper = '#F5E8CF', ink: cardInk, targetDiaryId, targetSceneId, recoveryJob, onApply, onClose }: {
  visible?: boolean; sceneId: ComicSceneId; title?: string; memo?: string; paper?: string; ink: string; targetDiaryId?: string; targetSceneId?: string; recoveryJob?: PendingHeroAiJob;
  onApply: (text: HeroCardText, uri: string, jobId: string) => Promise<void>; onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const setComposerKeyboardOpen = useContext(DayPlanComposerKeyboardContext);
  const [keyboardOpen, setKeyboardOpen] = useState(() => Keyboard.isVisible?.() ?? false);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(() => Keyboard.metrics?.()?.screenY ?? null);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', event => {
      if (Platform.OS === 'ios' && event) Keyboard.scheduleLayoutAnimation?.(event);
      setKeyboardTop(event?.endCoordinates.screenY ?? null);
      setKeyboardOpen(true);
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', event => {
      if (Platform.OS === 'ios' && event) Keyboard.scheduleLayoutAnimation?.(event);
      setKeyboardTop(null);
      setKeyboardOpen(false);
    });
    return () => { show.remove(); hide.remove(); };
  }, []);
  useEffect(() => {
    setComposerKeyboardOpen?.(visible && keyboardOpen);
    return () => setComposerKeyboardOpen?.(false);
  }, [visible, keyboardOpen, setComposerKeyboardOpen]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [stylesOpen, setStylesOpen] = useState(false);
  const [generationWidth, setGenerationWidth] = useState(320);
  const [styleId, setStyleId] = useState(() => {
    const saved = localStorageClient.getItemRaw(HERO_SELECTED_STYLE_KEY);
    const recoveryStyle = recoveryJob?.story?.styleId ?? (recoveryJob?.scenes[0] ? SELECTABLE_COMIC_CHARACTERS.find(character => character.scenes.some(scene => scene.id === recoveryJob.scenes[0]))?.id : undefined);
    return SELECTABLE_COMIC_CHARACTERS.find(character => character.id === (recoveryStyle ?? saved))?.id
      ?? SELECTABLE_COMIC_CHARACTERS.find(character => character.scenes.some(scene => scene.id === sceneId))?.id
      ?? SELECTABLE_COMIC_CHARACTERS[0].id;
  });
  const selectedStyle = SELECTABLE_COMIC_CHARACTERS.find(character => character.id === styleId) ?? SELECTABLE_COMIC_CHARACTERS[0];
  const styleSceneId = selectedStyle.id === 'protagonist-3' ? 'p3-14-dog-walk'
    : selectedStyle.id === 'protagonist-4' ? 'p4-19-station-wait'
    : selectedStyle.id === 'protagonist-5' ? 'p5-01-platform'
    : selectedStyle.id === 'protagonist-6' ? 'p6-01-rush-hour-commute'
    : selectedStyle.scenes.some(scene => scene.id === sceneId) ? sceneId : selectedStyle.preview[0].id;
  useEffect(() => { if (!visible) { setHelpOpen(false); setStylesOpen(false); setPalette(null); } }, [visible]);
  const styleReveal = useAnimatedValue(0);
  useEffect(() => {
    const animation = Animated.timing(styleReveal, { toValue: stylesOpen ? 1 : 0, duration: stylesOpen ? 220 : 160, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [stylesOpen, styleReveal]);
  const [paper, setPaper] = useState(recoveryJob?.cardAppearance?.paper ?? cardPaper);
  const [ink, setInk] = useState(recoveryJob?.cardAppearance?.pen ?? cardInk);
  const [palette, setPalette] = useState<'paper' | 'pen' | null>(null);
  const [mode, setMode] = useState<'character' | 'photo'>(recoveryJob?.story?.source ?? 'character');
  const [draftTitle, setDraftTitle] = useState(recoveryJob?.story?.title ?? title);
  const [text, setText] = useState(recoveryJob?.story?.text ?? memo);
  const [photo, setPhoto] = useState<string | null>(null);
  const [facesLoading, setFacesLoading] = useState(true);
  const [faces, setFaces] = useState<HeroSavedFace[]>([]);
  const [face, setFace] = useState<string | null>(null);
  const [register, setRegister] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [savingFace, setSavingFace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const operation = useRef<AbortController | null>(null);
  const [resultReady, setResultReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!visible) { setQuotaLoading(true); return; }
    if (busy) return;
    let current = true;
    const refresh = () => {
      setQuotaLoading(true);
      void getHeroAiRemaining().then(value => {
        if (current && Number.isFinite(value)) setRemaining(value);
      }).catch(() => undefined).finally(() => {
        if (current) setQuotaLoading(false);
      });
    };
    refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refresh(); });
    return () => { current = false; subscription.remove(); };
  }, [visible, busy]);
  const [elapsed, setElapsed] = useState(0);
  const [workspaceBottom, setWorkspaceBottom] = useState(0);
  const root = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const editing = useRef(false);
  const revealStory = () => {
    if (editing.current) scroll.current?.scrollToEnd({ animated: true });
  };
  useEffect(() => {
    const listener = Keyboard.addListener('keyboardDidShow', revealStory);
    return () => listener.remove();
  }, []);
  const locked = useRef(false);
  const [job, setJob] = useState<PendingHeroAiJob | null>(recoveryJob ?? null);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; void loadHeroSavedFaces().then(value => { if (alive.current) { setFaces(value); setFace(value.at(-1)?.uri ?? null); } }).catch(() => undefined).finally(() => { if (alive.current) setFacesLoading(false); }); return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  const addFace = async (uri: string) => {
    if (locked.current) return;
    locked.current = true; setSavingFace(true);
    try { const values = await saveHeroFace(uri); setFaces(values); setFace(values.at(-1)!.uri); setRegister(false); }
    catch { setError(t('comicDay.photo.pickError')); }
    finally { locked.current = false; setSavingFace(false); }
  };
  const cancelPromptOpen = useRef(false);
  const resultReadyRef = useRef(resultReady);
  resultReadyRef.current = resultReady;
  const confirmCancelGeneration = () => {
    const controller = operation.current;
    if (!controller || controller.signal.aborted || resultReadyRef.current || cancelPromptOpen.current) return;
    cancelPromptOpen.current = true;
    const dismiss = () => { cancelPromptOpen.current = false; };
    AppAlert.alert(t('comicDay.inline.confirmCancelTitle'), t('comicDay.inline.confirmCancelMessage'), [
      { text: t('comicDay.inline.keepGenerating'), style: 'cancel', onPress: dismiss },
      { text: t('comicDay.inline.cancelGeneration'), style: 'destructive', onPress: () => {
        dismiss();
        if (operation.current !== controller || resultReadyRef.current || controller.signal.aborted) return;
        setCancelling(true); controller.abort();
      } },
    ], { cancelable: true, onDismiss: dismiss });
  };
  const removeFace = (saved: HeroSavedFace) => AppAlert.alert(t('comicDay.inline.removeFace'), undefined, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('comicDay.inline.removeFace'), style: 'destructive', onPress: () => { void deleteHeroFace(saved.id).then(values => { setFaces(values); if (face === saved.uri) setFace(null); }).catch(() => setError(t('comicDay.ai.failed'))); } },
  ]);
  const generate = async () => {
    if (locked.current) return;
    if (!canGenerate) return;
    setPalette(null); setStylesOpen(false);
    const controller = new AbortController(); operation.current = controller;
    locked.current = true; setCancelling(false); setBusy(true); setSubmitted(false); setResultReady(false); setError(null); setElapsed(0); Keyboard.dismiss();
    const id = job?.id ?? `hero-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    const onSubmitted = () => { if (alive.current && !controller.signal.aborted) setSubmitted(true); };
    try {
      const result = job ? await resumeHeroAiJob(job, () => undefined, controller.signal, onSubmitted) : await generateHeroImages({
        id, mode: mode === 'character' ? 'face' : 'photo', photo: face ?? photo ?? '', photos: photo ? [photo] : [], scenes: [styleSceneId],
        signal: controller.signal, onSubmitted, cardAppearance: { paper, pen: ink }, story: { text: text.trim(), source: mode, cardAspectRatio: getHeroGenerationAspectRatio(text), styleId: selectedStyle.id, ...(draftTitle.trim() ? { title: draftTitle.trim() } : {}) }, targetDiaryId, targetSceneId, onProgress: () => undefined,
      });
      if (controller.signal.aborted) throw new HeroAiError('cancelled');
      setRemaining(result.remaining);
      if (!result.images[0]) throw new HeroAiError('generation_failed');
      if (alive.current) setResultReady(true);
      // Let the completed gauge render before the card displays the result.
      await new Promise(resolve => setTimeout(resolve, 450));
      if (controller.signal.aborted) throw new HeroAiError('cancelled');
      await onApply({ title: draftTitle.trim() || text.trim().split('\n')[0].slice(0, 80), memo: text.trim(), paper, pen: ink }, result.images[0].uri, id);
      await dismissHeroAiJob(id);
    } catch (failure) {
      if (controller.signal.aborted || failure instanceof HeroAiError && failure.code === 'cancelled') {
        try {
          await cancelHeroAiJob(id);
          if (alive.current) { setJob(null); setError(null); setResultReady(false); }
        } catch {
          const pending = await getPendingHeroAiJob().catch(() => null);
          if (alive.current) { setJob(pending); setError(t('comicDay.inline.cancelFailed')); }
        }
        return;
      }
      const pending = await getPendingHeroAiJob().catch(() => null);
      setJob(pending?.id === id ? pending : null);
      const code = failure instanceof HeroAiError ? failure.code : '';
      const message = (code === 'result_unavailable' || code === 'interrupted') ? t('comicDay.ai.result_unavailable') : code === 'daily_limit' || code === 'attempt_limit' ? t('comicDay.ai.dailyLimit') : code === 'pending_job' ? t('comicDay.inline.pending') : code === 'face_missing' ? t('comicDay.ai.face_missing') : code === 'face_multiple' ? t('comicDay.ai.face_multiple') : code === 'face_unclear' ? t('comicDay.ai.face_unclear') : code === 'face_check_unavailable' ? t('comicDay.ai.face_check_unavailable') : code === 'connection' ? t('comicDay.ai.connection') : t('comicDay.ai.failed');
      if (alive.current) setError(message);
    } finally { locked.current = false; operation.current = null; if (alive.current) { setBusy(false); setCancelling(false); } }
  };
  const started = useRef(false);
  useEffect(() => { if (recoveryJob && !started.current) { started.current = true; void generate(); } }, [recoveryJob]); // eslint-disable-line react-hooks/exhaustive-deps
  const canGenerate = !!job || !!(draftTitle.trim() || text.trim()) && (mode === 'character' ? !!face && !facesLoading : !!photo);
  return <View ref={root} collapsable={false} testID="hero-inline-composer" style={s.root} onLayout={() => root.current?.measureInWindow((_x, y, _width, height) => setWorkspaceBottom(y + height))}>
    {/* Measure the unpadded workspace in screen coordinates so collapsing the header
        cannot leave keyboard padding calculated from the previous header position. */}
    <View testID="hero-inline-keyboard-space" style={[s.root, { paddingBottom: keyboardTop === null ? 0 : Math.max(0, workspaceBottom - keyboardTop) }]}>
      <View testID="hero-inline-paper" style={[s.paper, { backgroundColor: paper }]}><PaperGrain opacity={0.15} />
        <View style={[s.heading, { alignItems: 'flex-start', zIndex: 30 }]}>
          {!busy ? <>
            <View pointerEvents={job ? 'none' : 'auto'} style={{ flex: 1, minWidth: 0 }}>{mode === 'character' ? <View style={s.faceHeader}>
                    <ScrollView testID="hero-inline-face-rail" horizontal style={s.faceRail} showsHorizontalScrollIndicator={false} contentContainerStyle={s.faceRailContent}>
                      {facesLoading ? <View testID="hero-inline-faces-loading" accessibilityState={{ busy: true }} style={s.faceRailContent}>{[0, 1].map(index => <View key={index} style={[s.avatar, s.imagePlaceholder]} />)}</View> : null}
                      {faces.map((saved, index) => <Pressable key={saved.id} testID={`hero-inline-face-${index}`} accessibilityRole="button" accessibilityLabel={`${t('comicDay.inline.face')} ${index + 1}`} accessibilityState={{ selected: face === saved.uri }} onPress={() => { setFace(saved.uri); setRegister(false); }} delayLongPress={500} onLongPress={() => { tapHaptic('select'); removeFace(saved); }} accessibilityActions={[{ name: 'delete', label: t('comicDay.inline.removeFace') }]} onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete') removeFace(saved); }} style={s.person}><View testID={`hero-inline-face-frame-${index}`} style={s.avatarFrame}><View style={s.avatar}><ComicSceneImage imageKey={`saved-face-avatar:${saved.uri}`} source={{ uri: saved.uri }} contentFit="cover" showSkeletonOnMount transitionDuration={180} backgroundColor="#F1EEE6" style={[s.clippedImage, s.avatar]} />{face === saved.uri ? <View testID={`hero-inline-face-ring-${index}`} pointerEvents="none" style={[StyleSheet.absoluteFill, s.chosen, { borderRadius: 21 }]} /> : null}</View></View></Pressable>)}
                    </ScrollView>
                      <Pressable testID="hero-inline-add-face" onPress={() => { editing.current = false; Keyboard.dismiss(); setStylesOpen(false); setRegister(true); }} accessibilityRole="button" accessibilityLabel={t('comicDay.inline.addFace')} style={s.addPerson}><View testID="hero-inline-add-face-icon-slot" style={s.addSlot}><View style={s.add}><Svg width={18} height={18} viewBox="0 0 20 20" accessible={false}><Path d="M10 3.5v13M3.5 10h13" stroke={ink} strokeWidth={1.6} strokeLinecap="round" /></Svg></View></View><ThemedText style={[s.small, { fontSize: 10, lineHeight: 14 }]}>{t('comicDay.inline.addFace')}</ThemedText></Pressable>
                  </View> : <HeroPhotoSource variant="toolbar" mode="photo" uri={photo} onChange={setPhoto} actionsOnly selectionLimit={1} />}</View>
          </> : <View style={{ flex: 1 }} />}
          <Pressable accessibilityLabel={t('common.close')} accessibilityRole="button" disabled={savingFace || cancelling || resultReady} onPress={() => { if (busy) confirmCancelGeneration(); else onClose(); }} style={s.icon}><HanddrawnControl name="xmark" color={ink} size={22} /></Pressable></View>
        {busy ? <View style={s.loading}><DrawingProgress elapsed={elapsed} complete={resultReady} ink={ink} submitted={submitted} /><ThemedText testID="hero-inline-keep-app-open" accessibilityLiveRegion="polite" style={s.hint}>{t(submitted ? 'comicDay.inline.backgroundReady' : 'comicDay.inline.uploading')}</ThemedText><Pressable testID="hero-inline-cancel-generation" accessibilityRole="button" accessibilityLabel={t('comicDay.inline.cancelGeneration')} disabled={cancelling || resultReady} onPress={confirmCancelGeneration} style={s.cancelGeneration}><HanddrawnControl name="xmark" color={ink} size={18} /><ThemedText style={[s.cancelText, { color: ink }]}>{t(cancelling ? 'comicDay.inline.cancelling' : 'comicDay.inline.cancelGeneration')}</ThemedText></Pressable></View> : <>
          <ScrollView testID="hero-inline-story-scroll" ref={scroll} style={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" onLayout={revealStory} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View pointerEvents={job ? 'none' : 'auto'} style={s.content}>

              <View style={s.references}>
                <View style={s.referenceMain}>
                  {mode === 'character' ? null : <HeroPhotoSource variant="strip" mode="photo" uri={photo} onChange={setPhoto} compactPreview previewHeight={130} selectionLimit={1} />}
                </View>
              </View>
              {showComingSoon ? <ThemedText testID="hero-inline-coming-soon" accessibilityLiveRegion="polite" style={s.hint}>{t('comicDay.inline.preparingStyles')}</ThemedText> : null}
              <HeroStoryNotebook title={draftTitle} text={text} ink={ink} autoFocus={visible && !recoveryJob} onTitleChange={setDraftTitle} onTextChange={setText}
                onFocus={() => { setStylesOpen(false); setPalette(null); editing.current = true; revealStory(); }} onBlur={() => { editing.current = false; }} />
            </View>
            {error ? <View testID="hero-inline-error" style={s.errorRow}>
              <Svg width={17} height={17} viewBox="0 0 24 24" accessible={false} style={{ marginTop: 1, flexShrink: 0 }}><Path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19ZM12 7v6m0 3v.5" fill="none" stroke="#934C3C" strokeWidth={1.5} strokeLinecap="round" /></Svg>
              <ThemedText accessibilityLiveRegion="polite" style={[s.error, { flex: 1 }]}>{error}</ThemedText>
            </View> : null}
          </ScrollView>
          <View testID="hero-inline-generation-row" onLayout={({ nativeEvent: { layout } }) => { if (layout.width > 0) setGenerationWidth(layout.width); }} style={s.generationRow}>
            <View pointerEvents={job ? 'none' : 'auto'}>
                <View testID="hero-inline-style-list" style={s.styles}>
                  <Pressable testID="hero-inline-style-toggle" accessibilityRole="button" accessibilityLabel={t(selectedStyle.name)} accessibilityState={{ selected: true, expanded: stylesOpen }} onPress={() => { setPalette(null); setStylesOpen(open => !open); setShowComingSoon(false); }} style={[s.styleItem, s.selectedStyleItem]}>
                    <View style={s.styleFrame}><View style={s.styleClip}><ComicSceneImage imageKey={`inline-style:${selectedStyle.id}`} source={selectedStyle.cover} contentFit="contain" showSkeletonOnMount transitionDuration={180} backgroundColor="#F1EEE6" style={s.styleImage} /></View><PenCircle selected color={ink} size={42} /></View>
                                    <ThemedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[s.styleLabel, { color: ink, alignSelf: 'stretch' }]}>{t(selectedStyle.name)}</ThemedText>
</Pressable>
                  <Animated.View testID="hero-inline-style-options" pointerEvents={stylesOpen ? 'auto' : 'none'} accessibilityElementsHidden={!stylesOpen} importantForAccessibility={stylesOpen ? 'auto' : 'no-hide-descendants'} style={[s.styleOptions, { width: Math.max(1, generationWidth - 56), opacity: styleReveal, transform: [{ translateY: styleReveal.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] }) }] }]}>
                  <HeroReorderableStyleRail>
                  {SELECTABLE_COMIC_CHARACTERS.map(character => <Pressable key={character.id} testID={`hero-inline-style-${character.id}`} accessibilityRole="button" accessibilityLabel={t(character.name)} accessibilityState={{ selected: styleId === character.id }} onPress={() => { localStorageClient.setItemRaw(HERO_SELECTED_STYLE_KEY, character.id); setStyleId(character.id); setShowComingSoon(false); setStylesOpen(false); }} style={s.styleItem}>
                    <View style={s.styleFrame}><View style={s.styleClip}><ComicSceneImage imageKey={`inline-style:${character.id}`} source={character.cover} contentFit="contain" showSkeletonOnMount transitionDuration={180} backgroundColor="#F1EEE6" style={s.styleImage} /></View><PenCircle selected={styleId === character.id} color={ink} size={42} /></View>
                    <ThemedText style={s.styleLabel}>{t(character.name)}</ThemedText>
                  </Pressable>)}
                  {[0].map(index => <Pressable key={index} testID={`hero-inline-style-upcoming-${index}`} accessibilityRole="button" accessibilityLabel={t('comicDay.inline.comingSoon')} accessibilityState={{ selected: false }} onPress={() => setShowComingSoon(true)} style={s.styleItem}>
                    <View style={s.styleFrame}><View style={s.styleClip}><ComicSceneImage imageKey="inline-style:upcoming" source={require('../../../../assets/control-illustrations/coming-soon-coffee-walk.png')} contentFit="contain" showSkeletonOnMount transitionDuration={180} backgroundColor="#F1EEE6" style={s.styleImage} /></View><PenCircle color={ink} size={42} /></View>
                    <ThemedText style={s.futureLabel}>{t('comicDay.inline.comingSoon')}</ThemedText>
                  </Pressable>)}
                  </HeroReorderableStyleRail>
                  </Animated.View>
                </View>
</View>
          <View pointerEvents={job ? 'none' : 'auto'} style={s.colorControls}>
            <Pressable testID="hero-inline-paper-color" accessibilityRole="button" accessibilityLabel={t('comicDay.paper')} accessibilityState={{ expanded: palette === 'paper' }} onPress={() => { tapHaptic('select'); setStylesOpen(false); setPalette(value => value === 'paper' ? null : 'paper'); }} style={s.colorButton}>
              <Svg width={25} height={28} viewBox="0 0 28 30" accessible={false}><Path d="M7 3 22 4 21 22 16 27 6 26Z" fill={paper} stroke={ink} strokeWidth={1.2} strokeLinejoin="round" /><Path d="M16 27 16 22 21 22M4 7 3 28 13 28M10 10 18 10M10 14 18 14" fill="none" stroke={ink} strokeWidth={0.85} strokeLinecap="round" /></Svg>
            </Pressable>
            <Pressable testID="hero-inline-pen-color" accessibilityRole="button" accessibilityLabel={t('comicDay.pen')} accessibilityState={{ expanded: palette === 'pen' }} onPress={() => { tapHaptic('select'); setStylesOpen(false); setPalette(value => value === 'pen' ? null : 'pen'); }} style={s.colorButton}><ThemedText style={{ color: ink, fontSize: 22, lineHeight: 30 }}>Aa</ThemedText></Pressable>
          </View>
          {(['paper', 'pen'] as const).map(paletteType => <HeroColorPaletteSurface key={paletteType} open={palette === paletteType} style={s.colorPalette}>
            <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={s.colorSwatches}>
              {(paletteType === 'paper' ? COMIC_PAPER_COLORS : COMIC_PEN_COLORS).map(color => <Pressable key={color} testID={`hero-inline-${paletteType}-${color}`} accessibilityRole="button" accessibilityLabel={`${t(paletteType === 'paper' ? 'comicDay.paper' : 'comicDay.pen')} ${color}`} accessibilityState={{ selected: (paletteType === 'paper' ? paper : ink) === color }} onPress={() => { tapHaptic('select'); if (paletteType === 'paper') setPaper(color); else setInk(color); }} style={s.colorSwatchTouch}>
                <View style={{ width: 25, height: 25, borderRadius: 13, backgroundColor: color, borderWidth: (paletteType === 'paper' ? paper : ink) === color ? 2 : 0.5, borderColor: ink }} />
              </Pressable>)}
            </ScrollView>
          </HeroColorPaletteSurface>)}
          <View style={s.generateSlot}>
          <View testID="hero-inline-quota-slot" accessibilityState={{ busy: quotaLoading }} style={s.remainingSlot}>
            <ThemedText testID="hero-inline-remaining" accessibilityLiveRegion="polite" accessibilityElementsHidden={quotaLoading} importantForAccessibility={quotaLoading ? 'no-hide-descendants' : 'auto'} numberOfLines={2} style={[s.remaining, { color: ink }, remaining === 0 && s.remainingExhausted, quotaLoading && { opacity: 0 }]}>{remaining == null ? '…' : remaining === 0 ? t('comicDay.ai.exhausted') : t(remaining >= 100000 ? 'comicDay.inline.unlimited' : 'comicDay.inline.remaining', { count: remaining })}</ThemedText>
            {quotaLoading ? <View testID="hero-inline-quota-skeleton" pointerEvents="none" accessible={false} style={s.remainingSkeleton} /> : null}
          </View>
          <Pressable testID="hero-inline-generate" accessibilityRole="button" accessibilityLabel={t(job ? 'comicDay.inline.retry' : 'comicDay.inline.generateStyle')} accessibilityState={{ disabled: !canGenerate || savingFace }} disabled={!canGenerate || savingFace} onPress={() => { void generate(); }} style={[s.generate, (!canGenerate || savingFace) && { opacity: 0.4 }]}><PenCircle color={ink} />{job ? <HanddrawnControl name="arrow.clockwise" color={ink} size={26} /> : <HeroGenerateIcon ink={ink} />}</Pressable>
          </View>
          </View>
        </>}
        <View testID="hero-inline-bottom-toolbar" style={s.bottomToolbar}><Pressable testID="hero-inline-dismiss-keyboard" accessibilityRole="button" accessibilityLabel={locale === 'en' ? 'Hide keyboard' : locale === 'ja' ? 'キーボードを閉じる' : locale === 'zh-TW' ? '收起鍵盤' : '키보드 내리기'} onPress={() => { tapHaptic(); editing.current = false; Keyboard.dismiss(); }} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}><Svg width={25} height={25} viewBox="0 0 28 28" accessible={false}><Path d="M4 4.5q10-.5 20 0v13H4ZM7 8h1m4 0h1m4 0h1m4 0h.2M7 11.5h1m4 0h1m4 0h1m4 0h.2M9 15h10m-9 7 4 3.5 4-3.5" fill="none" stroke={ink} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>{!busy ? <View pointerEvents={job ? 'none' : 'auto'} style={[s.row, { flex: 1, justifyContent: 'center' }]}>{(['character', 'photo'] as const).map(value => <Pressable key={value} testID={`hero-inline-mode-${value}`} accessibilityRole="button" accessibilityLabel={t(value === 'character' ? 'comicDay.inline.fromText' : 'comicDay.inline.fromPhoto')} accessibilityState={{ selected: mode === value }} onPress={() => { tapHaptic('select'); setMode(value); setError(null); setStylesOpen(false); }} style={s.tab}><StoryModeIcon mode={value} ink={ink} paper={paper} selected={mode === value} /></Pressable>)}</View> : <View style={{ flex: 1 }} />}<Pressable testID="hero-inline-help" accessibilityRole="button" accessibilityLabel={heroAiHelpLabel(locale)} onPress={() => { tapHaptic(); completeHeroInfoHint('ai'); Keyboard.dismiss(); setHelpOpen(true); }} style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}><HeroInfoHint kind="ai" enabled={visible && !busy}><Svg width={21} height={21} viewBox="0 0 24 24" accessible={false}><Path d="M12 2.2C6.6 1.9 2 6.4 2.1 12c-.2 5.4 4.3 10 9.9 9.8 5.5.2 10-4.3 9.8-9.8.2-5.5-4.2-10-9.8-9.8Z" stroke={ink} strokeWidth={1.2} fill="#9FCAD8" /><Path d="M12 10.5v6.2M12 7.3v.3" stroke={ink} strokeWidth={1.6} strokeLinecap="round" /></Svg></HeroInfoHint></Pressable></View>
      </View>
    </View>
    {visible && register ? <AppModal transparent animationType="fade" onRequestClose={() => { if (!savingFace) setRegister(false); }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(25,30,25,0.24)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { if (!savingFace) setRegister(false); }} style={StyleSheet.absoluteFill} />
        <View testID="hero-face-registration-modal" accessibilityViewIsModal style={{ width: '100%', maxWidth: 360, alignSelf: 'center', padding: 10, backgroundColor: paper }}>
          <PenFrame color={ink} />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12 }}>
            <ThemedText accessibilityRole="header" style={{ flex: 1, color: ink, fontSize: 18 }}>{t('tabs.comicDay')}</ThemedText>
            <Pressable testID="hero-face-registration-close" accessibilityRole="button" accessibilityLabel={t('common.close')} disabled={savingFace} onPress={() => setRegister(false)} hitSlop={4} style={{ width: 36, height: 32, alignItems: 'center', justifyContent: 'center' }}><HanddrawnControl name="xmark" color={ink} size={20} /></Pressable>
          </View>
          <View testID="hero-face-photo-actions" pointerEvents={savingFace ? 'none' : 'auto'}>
            <HeroPhotoSource mode="face" uri={null} onChange={uri => { void addFace(uri); }} actionsOnly selectionLimit={1} />
            {savingFace ? <ActivityIndicator color={ink} /> : null}
          </View>
        </View>
      </View>
    </AppModal> : null}
    {helpOpen ? <HeroAiHelpModal onClose={() => setHelpOpen(false)} /> : null}
  </View>;
}
const s = StyleSheet.create({
  colorControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colorButton: { width: 44, height: 48, alignItems: 'center', justifyContent: 'center' },
  colorPalette: { position: 'absolute', left: 0, right: 0, bottom: '100%', marginBottom: 10, paddingHorizontal: 4 },
  colorSwatches: { alignItems: 'center', gap: 2 },
  colorSwatchTouch: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  generationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, zIndex: 30 },
  bottomToolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginTop: 8 },
  clippedImage: { overflow: 'hidden' },
  generateSlot: { width: 120, alignItems: 'center', gap: 3 },
  remainingSlot: { width: '100%', minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  remainingSkeleton: { width: 64, height: 16, borderRadius: 6, backgroundColor: '#DDDCD5', opacity: 0.72 },
  remaining: { fontSize: 15, lineHeight: 20, textAlign: 'center', alignSelf: 'stretch' },
  remainingExhausted: { fontSize: 12, lineHeight: 15 },
  errorRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  imagePlaceholder: { backgroundColor: '#E8E5DE', opacity: 0.7 },
  cancelGeneration: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, marginTop: 12 },
  cancelText: { fontSize: 13, lineHeight: 20 },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { flexGrow: 1, gap: 10, paddingBottom: 16 },
  progressContent: { width: '100%', alignItems: 'center', gap: 12 },
  percent: { fontSize: 20, lineHeight: 28, fontVariant: ['tabular-nums'], marginTop: 8 },
  progressTrack: { width: '100%', maxWidth: 240, height: 16, marginVertical: 3 },
  progressClip: { position: 'absolute', left: 4, right: 4, top: 4, bottom: 4, borderRadius: 4, overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', opacity: 0.68, transformOrigin: 'left' },
  references: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', zIndex: 20 },
  referenceMain: { flex: 1, minWidth: 0, gap: 10 },
  sectionLabel: { fontSize: 13, lineHeight: 20 },
  emptyPortrait: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 8 },
  referenceHint: { fontSize: 12, lineHeight: 18, color: '#666D60', marginTop: 4 },
  styles: { width: 88, alignItems: 'center', gap: 7, paddingTop: 1 },
  styleOptions: { position: 'absolute', left: 0, bottom: '100%', height: 82, backgroundColor: 'transparent', zIndex: 30 },
  styleOptionsContent: { paddingVertical: 8, paddingHorizontal: 4, gap: 12, alignItems: 'flex-start' },
  styleItem: { width: 50, flexShrink: 0, alignItems: 'center', gap: 4, minHeight: 44 },
  selectedStyleItem: { width: '100%' },
  styleFrame: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  styleClip: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden' },
  styleImage: { width: 34, height: 34 },
  check: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5E8CF' },
  styleLabel: { fontSize: 10, lineHeight: 14, textAlign: 'center' },
  futureLabel: { fontSize: 10, lineHeight: 14, textAlign: 'center', color: '#767A6D' },
root: { flex: 1, minHeight: 0, width: '100%' }, paper: { flex: 1, borderRadius: 18, overflow: 'hidden', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minHeight: 44, marginBottom: 2 }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, content: { flexGrow: 1, gap: 10 }, row: { flexDirection: 'row', gap: 10, alignItems: 'center' }, tab: { flex: 1, maxWidth: 140, aspectRatio: 4, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, avatar: { width: 42, height: 42, borderRadius: 21 }, avatarFrame: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }, chosen: { borderWidth: 1.5, borderColor: '#368F80' }, faceHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, minWidth: 0 }, faceRail: { flex: 1, minWidth: 0 }, faceRailContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 }, person: { alignItems: 'center', width: 56, flexShrink: 0 }, addPerson: { width: 52, flexShrink: 0, alignItems: 'center' }, addSlot: { width: 52, height: 56, alignItems: 'center', justifyContent: 'center' }, small: { fontSize: 12, lineHeight: 18 }, add: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.6, borderColor: '#343933', alignItems: 'center', justifyContent: 'center' }, input: { flexShrink: 0, minHeight: 110, maxHeight: 150, borderBottomWidth: 0.5, borderBottomColor: '#AFB1A7', fontSize: 16, lineHeight: 23, padding: 8 }, generate: { width: 44, height: 44, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginRight: 2 }, loading: { flex: 1, gap: 16, alignItems: 'center', justifyContent: 'center', padding: 20 }, center: { textAlign: 'center', fontSize: 16 }, hint: { fontSize: 12, lineHeight: 18, textAlign: 'center', color: '#666D60' }, error: { fontSize: 13, lineHeight: 19, color: '#934C3C' } });
