import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import type { PolaroidDraft } from './HeroPolaroidEditor';
import { HeroPhotoImportPreview, type ImportedHeroPhoto } from './HeroPhotoImportPreview';
import { HeroPhotoDiaryComposer } from './HeroPhotoDiaryComposer';
import { useColorScheme } from '@shared/lib/hooks/use-color-scheme';
import { selectIsPro, useSubscriptionStore } from '@features/subscriptions/model/subscriptionStore';
import { ProPreviewPage } from '../../settings/ui/ProPreviewPage';
import { getHeroGenerationAspectRatio } from '../lib/heroGenerationFrame';
import { HeroReorderableStyleRail } from './HeroReorderableStyleRail';
import { DayPlanShellBackgroundContext, DayPlanComposerKeyboardContext } from '../model/dayPlanHeaderActions';
import { HeroInfoHint } from './HeroInfoHint';
import { completeHeroInfoHint } from '@shared/lib/storage/heroInfoHintStorage';
import { AppModal } from '@shared/ui/app-modal';
import { PenFrame } from '@shared/ui/pen-frame';
import { HeroStoryNotebook } from './HeroStoryNotebook';
import { HeroGenerateBloom } from './HeroGenerateBloom';
import { HeroGenerateIcon } from './HeroGenerateIcon';
import { HeroAiHelpModal, heroAiHelpLabel } from './HeroAiHelpModal';
import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Animated, Easing, Keyboard, Platform, Pressable, ScrollView, StyleSheet, useAnimatedValue, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppAlert } from '@shared/lib/app-alert';
import { useTranslation } from '@shared/lib/i18n';
import { useComicCharacterNames } from '../lib/heroCharacterName';
import { ThemedText } from '@shared/ui/themed-text';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ComicSceneImage } from './HeroSceneImage';
import { HeroPhotoSource } from './HeroPhotoSource';
import { SELECTABLE_COMIC_CHARACTERS } from '../lib/heroCharacters';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { localStorageClient } from '@shared/lib/storage/localStorageClient';
import { type ComicSceneId } from '../lib/heroSceneImages';
import { getHeroAiRemaining, generateHeroImages, resumeHeroAiJob, cancelHeroAiJob, getPendingHeroAiJob, dismissHeroAiJob, HeroAiError, type PendingHeroAiJob } from '../lib/heroAiClient';
import { loadHeroSavedFaces, saveHeroFace, deleteHeroFace, type HeroSavedFace } from '../lib/heroSavedFaces';
import type { HeroCardText } from './HeroCardCaption';
import { saveHeroOriginalPhoto, saveHeroOriginalPhotoMetadata } from '../lib/heroOriginalPhoto';

export const HERO_SELECTED_STYLE_KEY = 'pokit:hero-selected-illustration-style-v1';
export const HERO_SELECTED_FACE_KEY = 'pokit:hero-selected-face-v1';
export const HERO_SELECTED_PAPER_KEY = 'pokit:hero-selected-generation-paper-v1';

/** Two lightly varied pen strokes, matching the app's hand-drawn controls. */
function PenCircle({ selected = false, color, size }: { selected?: boolean; color: string; size?: number }) {
  return <Svg pointerEvents="none" width={size ?? '100%'} height={size ?? '100%'} viewBox="0 0 56 56" style={StyleSheet.absoluteFill}>
    <Path d="M28 2.5C14 1.6 2.8 12.8 2.4 27.4 1.7 41.4 13.1 53.1 27.6 53.5 42.2 54.1 53.4 42.4 53.6 28.2 54 14.2 42.3 2.1 28 2.5Z" fill="none" stroke={color} strokeWidth={selected ? 1.5 : 0.85} strokeLinecap="round" />
    {selected ? <Path d="M8.2 13.5C3.4 20.7 3.3 34.8 8.4 42.3M35.6 51.6C46.7 48.7 52.4 39.9 52 28.4" fill="none" stroke={color} strokeWidth={0.55} strokeLinecap="round" opacity={0.55} /> : null}
  </Svg>;
}

/** Soft oval selection fills in without changing the tab geometry. */
function StoryModeIcon({ mode, ink, paper, selected }: { mode: 'character' | 'photo' | 'original'; ink: string; paper: string; selected: boolean }) {
  const { t } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const selection = useAnimatedValue(selected ? 1 : 0);
  useEffect(() => {
    const animation = Animated.timing(selection, { toValue: selected ? 1 : 0, duration: 240, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [selected, selection]);
  const label = t(mode === 'character' ? 'comicDay.inline.fromText' : mode === 'photo' ? 'comicDay.inline.fromPhoto' : 'comicDay.inline.asIs');
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
    <Animated.View testID={`hero-mode-fill-${mode}`} style={{ position: 'absolute', left: 0, right: 0, top: 3, bottom: 3, borderRadius: 999, backgroundColor: isDark ? '#465043' : '#E1E7DC', opacity: selection, transform: [{ scaleX: selection.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }} />

    <ThemedText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: ink, fontSize: 14, lineHeight: 22, textAlign: 'center', paddingHorizontal: 2 }}>{label}</ThemedText>
    {/* Original mode artwork — retained for a future icon variant.
    <Svg width={54} height={36} viewBox="175 0 170 125" accessible={false}>
    {mode === 'original' ? <>
      <Path d="m205 29 67-5 5 75-67 4Z" fill={paper} stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
      <Path d="m224 24 66 9-10 74-66-9Z" fill="#F8F7EF" stroke={ink} strokeWidth={2.5} strokeLinejoin="round" />
      <Path d="m231 35 49 7-7 45-49-7Z" fill="#D8E5DC" stroke={ink} strokeWidth={1.7} />
      <Path d="m225 73 17-15 10 11 10-7 12 18M264 49a5 5 0 1 0 .1 0" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M290 80v24m-12-12h24" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
    </> : mode === 'character' ? <>
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
  </Svg> */}
  </View>;
}

const GENERATION_PROGRESS_INK = '#000000';

function DrawingProgress({ elapsed, complete, submitted }: { elapsed: number; complete: boolean; submitted: boolean }) {
  const ink = GENERATION_PROGRESS_INK;
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
    <ThemedText style={[s.hint, { color: ink }]}>{t('comicDay.loading.estimated')}</ThemedText>
    <ThemedText style={[s.hint, { color: ink }]}>{t('comicDay.inline.elapsed', { seconds: elapsed })}</ThemedText>
    {elapsed >= 90 ? <ThemedText style={[s.hint, { color: ink }]}>{t('comicDay.loading.longer')}</ThemedText> : null}
  </View>;
}

export function HeroInlineComposer({ visible = true, sceneId, title = '', memo = '', paper: cardPaper, ink: cardInk, targetDiaryId, targetSceneId, recoveryJob, initialMode = 'character', initialOriginalPhoto, importedPhotoEmbedded = false, fullScreen = false, photoOnly = false, hideClose = false, onApply, onClose }: {
  importedPhotoEmbedded?: boolean; initialOriginalPhoto?: ImportedHeroPhoto; hideClose?: boolean; photoOnly?: boolean; fullScreen?: boolean; visible?: boolean; sceneId: ComicSceneId; title?: string; memo?: string; paper?: string; ink: string; targetDiaryId?: string; targetSceneId?: string; recoveryJob?: PendingHeroAiJob; initialMode?: 'character' | 'photo' | 'original';
  onApply: (text: HeroCardText, uri: string, jobId: string) => Promise<void>; onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const isDark = useColorScheme() === 'dark';
  const mainBackground = isDark ? '#262B28' : '#F7F6F4';
  const nameFor = useComicCharacterNames();
  const setComposerKeyboardOpen = useContext(DayPlanComposerKeyboardContext);
  const setShellBackground = useContext(DayPlanShellBackgroundContext);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(() => Keyboard.metrics?.()?.screenY ?? null);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', event => {
      if (visible && Platform.OS === 'ios' && event) Keyboard.scheduleLayoutAnimation?.(event);
      setKeyboardTop(event?.endCoordinates.screenY ?? null);
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', event => {
      if (visible && Platform.OS === 'ios' && event) Keyboard.scheduleLayoutAnimation?.(event);
      setKeyboardTop(null);
    });
    return () => { show.remove(); hide.remove(); };
  }, [visible]);
  useLayoutEffect(() => {
    setComposerKeyboardOpen?.(visible && keyboardTop !== null);
    return () => setComposerKeyboardOpen?.(false);
  }, [visible, keyboardTop, setComposerKeyboardOpen]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
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
    : selectedStyle.id === 'protagonist-5' ? 'p5-01-platform'
    : selectedStyle.id === 'protagonist-6' ? 'p6-01-rush-hour-commute'
    : selectedStyle.scenes.some(scene => scene.id === sceneId) ? sceneId : selectedStyle.preview[0].id;
  useEffect(() => { if (!visible) { setHelpOpen(false); setStylesOpen(false); } }, [visible]);
  const styleReveal = useAnimatedValue(0);
  useEffect(() => {
    const animation = Animated.timing(styleReveal, { toValue: stylesOpen ? 1 : 0, duration: stylesOpen ? 220 : 160, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [stylesOpen, styleReveal]);
  const [paper] = useState(() => {
    const saved = localStorageClient.getItemRaw(HERO_SELECTED_PAPER_KEY);
    const savedPaper = saved && /^#[0-9a-f]{6}$/i.test(saved) ? saved : undefined;
    return recoveryJob?.cardAppearance?.paper ?? savedPaper ?? cardPaper ?? '#FFFFFF';
  });
  const [ink] = useState(recoveryJob?.cardAppearance?.pen ?? cardInk);
  // Editing colors belong to the record; controls must remain legible on its paper.
  const uiInk = fullScreen ? (isDark ? '#EEECE6' : '#202020') : paper.toUpperCase() === '#000000' ? '#FFFFFF' : '#202020';
  useEffect(() => {
    if (!fullScreen || !visible) return;
    setShellBackground?.(mainBackground);
    return () => setShellBackground?.(null);
  }, [fullScreen, visible, mainBackground, setShellBackground]);
  const [mode, setMode] = useState<'character' | 'photo' | 'original'>(recoveryJob?.story?.source ?? initialMode);
  const modeFade = useAnimatedValue(1);
  const previousMode = useRef(mode);
  useLayoutEffect(() => {
    if (previousMode.current === mode) return;
    previousMode.current = mode;
    modeFade.stopAnimation();
    modeFade.setValue(0.35);
    const animation = Animated.timing(modeFade, { toValue: 1, duration: 230, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [mode, modeFade]);

  const [draftTitle, setDraftTitle] = useState(recoveryJob?.story?.title ?? title);
  const [text, setText] = useState(recoveryJob?.story?.text ?? memo);
  const [photo, setPhoto] = useState<string | null>(null);
  const [originalPhoto, setOriginalPhoto] = useState<ImportedHeroPhoto | null>(initialOriginalPhoto ?? null);
  const [facesLoading, setFacesLoading] = useState(true);
  const [faces, setFaces] = useState<HeroSavedFace[]>([]);
  const [face, setFace] = useState<string | null>(null);
  const [register, setRegister] = useState(false);
  const [savingFace, setSavingFace] = useState(false);
  const [importingPhoto, setImportingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [paintPressed, setPaintPressed] = useState(false);
  const feedback = useAnimatedValue(1);
  useEffect(() => {
    // The progress surface keeps this native animated node for its entire life.
    // Ending the button flourish must leave progress visible, not reset it to 0.
    if (!paintPressed) { feedback.setValue(1); return; }
    feedback.setValue(0);
    // Requests start immediately. Keep the pressed button visible briefly while
    // the loading surface fades over it, rather than removing it on this frame.
    const animation = Animated.timing(feedback, { toValue: 1, duration: 580, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    animation.start();
    const timer = setTimeout(() => setPaintPressed(false), 600);
    return () => { clearTimeout(timer); animation.stop(); };
  }, [paintPressed, feedback]);
  const [quotaLoading, setQuotaLoading] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const isPro = useSubscriptionStore(selectIsPro);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [quotaRevision, setQuotaRevision] = useState(0);
  const closeUpgrade = () => { setUpgradeOpen(false); setQuotaRevision(value => value + 1); };
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
  }, [visible, busy, quotaRevision]);
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
  useEffect(() => { alive.current = true; void loadHeroSavedFaces().then(value => { if (alive.current) { setFaces(value); const selectedId = localStorageClient.getItemRaw(HERO_SELECTED_FACE_KEY); setFace((value.find(saved => saved.id === selectedId) ?? value.at(-1))?.uri ?? null); } }).catch(() => undefined).finally(() => { if (alive.current) setFacesLoading(false); }); return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [busy]);
  const addFace = async (uri: string) => {
    if (locked.current) return;
    locked.current = true; setSavingFace(true);
    try { const values = await saveHeroFace(uri); setFaces(values); setFace(values.at(-1)!.uri); localStorageClient.setItemRaw(HERO_SELECTED_FACE_KEY, values.at(-1)!.id); setRegister(false); }
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
    { text: t('comicDay.inline.removeFace'), style: 'destructive', onPress: () => { void deleteHeroFace(saved.id).then(values => { setFaces(values); if (face === saved.uri) { setFace(null); localStorageClient.removeItem(HERO_SELECTED_FACE_KEY); } }).catch(() => setError(t('comicDay.ai.failed'))); } },
  ]);
  const chooseOriginalPhoto = async () => {
    if (locked.current || job) return;
    locked.current = true; setImportingPhoto(true); setError(null);
    editing.current = false; Keyboard.dismiss();
    try {
      // Local photo selection does not call AI or reserve a generation job.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const picker = require('expo-image-picker') as typeof import('expo-image-picker');
      const result = await picker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false, allowsMultipleSelection: false, presentationStyle: picker.UIImagePickerPresentationStyle.FULL_SCREEN });
      if (alive.current && !result.canceled && result.assets[0]?.uri) {
        const asset = result.assets[0];
        setOriginalPhoto({ uri: asset.uri, fileName: asset.fileName, width: asset.width, height: asset.height });
      }
    } catch {
      if (alive.current) setError(t('comicDay.photo.pickError'));
    } finally {
      locked.current = false;
      if (alive.current) setImportingPhoto(false);
    }
  };
  const saveOriginalPhoto = async (draft?: PolaroidDraft) => {
    if (locked.current || job || !originalPhoto) return;
    locked.current = true; setImportingPhoto(true); setError(null); Keyboard.dismiss();
    try {
      let photoUri = originalPhoto.uri;
      if (draft?.processedUri) {
        const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
        const processed = await manipulateAsync(draft.processedUri, [], { format: SaveFormat.JPEG, compress: 0.9 });
        photoUri = processed.uri;
      }
      let uri: string;
      try { uri = await saveHeroOriginalPhoto(photoUri, originalPhoto.fileName); }
      finally {
        if (photoUri !== originalPhoto.uri) {
          const fs = await import('expo-file-system/legacy');
          await fs.deleteAsync(photoUri, { idempotent: true }).catch(() => undefined);
        }
      }
      if (!alive.current) return;
      await onApply({ title: (draft?.title ?? draftTitle).trim(), memo: (draft?.memo ?? text).trim(), paper, pen: draft?.pen ?? ink, ...(draft?.fontId ? { fontId: draft.fontId } : {}) }, uri, '');
      saveHeroOriginalPhotoMetadata({ uri, title: (draft?.title ?? draftTitle).trim(), memo: (draft?.memo ?? text).trim(), createdAt: Date.now() });
    } catch {
      if (alive.current) setError(t('comicDay.photo.saveError'));
    } finally {
      locked.current = false;
      if (alive.current) setImportingPhoto(false);
    }
  };
  const generate = async () => {
    if (mode === 'original') return;
    if (locked.current) return;
    if (!canGenerate) return;
    setStylesOpen(false);
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
  const needsFirstFace = !facesLoading && faces.length === 0;
  const addFaceLabel = t(needsFirstFace ? 'comicDay.inline.addFirstFace' : 'comicDay.inline.addFace');
  const needsFace = !job && mode === 'character' && !face && !facesLoading;
  const missingFaceHint = draftTitle.trim() || text.trim() ? 'comicDay.inline.faceRequired' : 'comicDay.inline.textAndFaceRequired';
  const canGenerate = !!job || remaining !== 0 && !!(draftTitle.trim() || text.trim()) && (mode === 'character' ? !!face && !facesLoading : !!photo);
  if (initialOriginalPhoto && mode === 'original' && originalPhoto) return <HeroPhotoImportPreview embedded={importedPhotoEmbedded} photo={originalPhoto} title={draftTitle} memo={text} ink={uiInk} onTitleChange={setDraftTitle} onMemoChange={setText} onPick={() => { void chooseOriginalPhoto(); }} visible={visible} busy={importingPhoto} error={error} onSave={saveOriginalPhoto} onClose={onClose} />;
  return <View ref={root} collapsable={false} testID="hero-inline-composer" style={s.root} onLayout={() => root.current?.measureInWindow((_x, y, _width, height) => setWorkspaceBottom(y + height))}>
    {/* Measure the unpadded workspace in screen coordinates so collapsing the header
        cannot leave keyboard padding calculated from the previous header position. */}
    <View testID="hero-inline-keyboard-space" style={[s.root, { paddingBottom: keyboardTop === null ? 0 : Math.max(0, workspaceBottom - keyboardTop) }]}>
      <View testID="hero-inline-paper" style={[s.paper, { backgroundColor: fullScreen ? mainBackground : paper }, fullScreen && s.fullScreenPaper]}>{!fullScreen && paper !== '#000000' ? <PaperGrain opacity={0.15} /> : null}
        <Animated.View style={[s.heading, { opacity: modeFade, alignItems: 'flex-start', zIndex: 30 }]}>
          {!busy ? <>
            <View pointerEvents={job ? 'none' : 'auto'} style={{ flex: 1, minWidth: 0 }}>{mode === 'original' ? null : mode === 'character' ? <View style={s.faceHeader}>
                      <Pressable testID="hero-inline-add-face" onPress={() => { tapHaptic(); editing.current = false; Keyboard.dismiss(); setStylesOpen(false); setRegister(true); }} accessibilityRole="button" accessibilityLabel={addFaceLabel} style={[s.addPerson, needsFirstFace && s.emptyAddPerson]}><View testID="hero-inline-add-face-icon-slot" style={s.addSlot}><View style={[s.add, { borderColor: uiInk }]}><Svg width={18} height={18} viewBox="0 0 20 20" accessible={false}><Path d="M10 3.5v13M3.5 10h13" stroke={uiInk} strokeWidth={1.6} strokeLinecap="round" /></Svg></View></View>{needsFirstFace ? <ThemedText testID="hero-inline-add-face-label" style={[s.emptyAddFaceLabel, { color: uiInk }]}>{addFaceLabel}</ThemedText> : null}</Pressable>
                    {!needsFirstFace ? <ScrollView testID="hero-inline-face-rail" horizontal style={s.faceRail} showsHorizontalScrollIndicator={false} contentContainerStyle={s.faceRailContent}>
                      {facesLoading ? <View testID="hero-inline-faces-loading" accessibilityState={{ busy: true }} style={s.faceRailContent}>{[0, 1].map(index => <View key={index} style={[s.avatar, s.imagePlaceholder]} />)}</View> : null}
                      {faces.map((saved, index) => <Pressable key={saved.id} testID={`hero-inline-face-${index}`} accessibilityRole="button" accessibilityLabel={`${t('comicDay.inline.face')} ${index + 1}`} accessibilityState={{ selected: face === saved.uri }} onPress={() => { tapHaptic('select'); localStorageClient.setItemRaw(HERO_SELECTED_FACE_KEY, saved.id); setFace(saved.uri); setRegister(false); }} delayLongPress={500} onLongPress={() => { tapHaptic('select'); removeFace(saved); }} accessibilityActions={[{ name: 'delete', label: t('comicDay.inline.removeFace') }]} onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete') removeFace(saved); }} style={s.person}><View testID={`hero-inline-face-frame-${index}`} style={s.avatarFrame}><View style={s.avatar}><ComicSceneImage imageKey={`saved-face-avatar:${saved.uri}`} source={{ uri: saved.uri }} contentFit="cover" showSkeletonOnMount transitionDuration={180} backgroundColor="#F1EEE6" style={[s.clippedImage, s.avatar]} /></View>{face === saved.uri ? <View testID={`hero-inline-face-ring-${index}`} pointerEvents="none" style={s.chosen} /> : null}</View></Pressable>)}
                    </ScrollView> : null}
                  </View> : null}</View>
          </> : <View style={{ flex: 1 }} />}
          {!hideClose && (!fullScreen || photoOnly) ? <Pressable testID="hero-inline-close" accessibilityLabel={t('common.close')} accessibilityRole="button" disabled={savingFace || importingPhoto || cancelling || resultReady} onPress={() => { tapHaptic(); if (busy) confirmCancelGeneration(); else onClose(); }} style={s.icon}><HanddrawnControl name="xmark" color={uiInk} size={22} /></Pressable> : null}</Animated.View>
        <Animated.View style={{ flex: 1, minHeight: 0, opacity: modeFade }}>
        {mode === 'original' ? <HeroPhotoDiaryComposer uri={originalPhoto?.uri} title={draftTitle} memo={text} busy={importingPhoto} error={error} ink={uiInk} onPick={() => { tapHaptic(); void chooseOriginalPhoto(); }} onTitleChange={setDraftTitle} onMemoChange={setText} onSave={() => { tapHaptic(); void saveOriginalPhoto(); }} /> : <>
        {busy ? <Animated.View testID="hero-inline-progress-surface" style={[s.loading, StyleSheet.absoluteFill, { zIndex: 20, opacity: feedback }]}><DrawingProgress elapsed={elapsed} complete={resultReady} submitted={submitted} /><ThemedText testID="hero-inline-keep-app-open" accessibilityLiveRegion="polite" style={[s.hint, { color: GENERATION_PROGRESS_INK }]}>{t(submitted ? 'comicDay.inline.backgroundReady' : 'comicDay.inline.uploading')}</ThemedText><Pressable testID="hero-inline-cancel-generation" accessibilityRole="button" accessibilityLabel={t('comicDay.inline.cancelGeneration')} disabled={cancelling || resultReady} onPress={confirmCancelGeneration} style={s.cancelGeneration}><HanddrawnControl name="xmark" color={GENERATION_PROGRESS_INK} size={18} /><ThemedText style={[s.cancelText, { color: GENERATION_PROGRESS_INK }]}>{t(cancelling ? 'comicDay.inline.cancelling' : 'comicDay.inline.cancelGeneration')}</ThemedText></Pressable></Animated.View> : null}
        {!busy || paintPressed ? <Animated.View pointerEvents={busy ? 'none' : 'auto'} style={[{ flex: 1 }, busy && { opacity: feedback.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
          {mode === 'photo' ? <HeroPhotoDiaryComposer hideSave uri={photo ?? undefined} title={draftTitle} memo={text} busy={busy} error={error} ink={uiInk} onPick={() => { Keyboard.dismiss(); setStylesOpen(false); setPhotoPickerOpen(true); }} onTitleChange={setDraftTitle} onMemoChange={setText} onSave={() => {}} /> : <ScrollView testID="hero-inline-story-scroll" ref={scroll} style={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" onLayout={revealStory} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View pointerEvents={job ? 'none' : 'auto'} style={s.content}>

              <View style={s.references}>
                <View style={s.referenceMain}>
                  {mode === 'character' ? null : <HeroPhotoSource variant="strip" mode="photo" uri={photo} onChange={setPhoto} compactPreview previewHeight={130} selectionLimit={1} />}
                </View>
              </View>
              <HeroStoryNotebook title={draftTitle} text={text} ink={ink} autoFocus={false} onTitleChange={setDraftTitle} onTextChange={setText}
                onFocus={field => { setStylesOpen(false); editing.current = field === 'body'; revealStory(); }} onBlur={() => { editing.current = false; }} />
            </View>
            {error ? <View testID="hero-inline-error" style={s.errorRow}>
              <Svg width={17} height={17} viewBox="0 0 24 24" accessible={false} style={{ marginTop: 1, flexShrink: 0 }}><Path d="M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19ZM12 7v6m0 3v.5" fill="none" stroke="#934C3C" strokeWidth={1.5} strokeLinecap="round" /></Svg>
              <ThemedText accessibilityLiveRegion="polite" style={[s.error, { flex: 1 }]}>{error}</ThemedText>
            </View> : null}
          </ScrollView>}
          <View style={s.generationArea}>
          {needsFace ? <ThemedText testID="hero-inline-face-required" accessibilityLiveRegion="polite" style={{ color: uiInk, fontSize: 14, lineHeight: 21, textAlign: 'right', marginBottom: 6 }}>{t(missingFaceHint)}</ThemedText> : null}
          <View testID="hero-inline-quota-slot" accessibilityState={{ busy: quotaLoading }} style={[s.remainingSlot, FEATURE_FLAGS.proSubscriptions && FEATURE_FLAGS.proAiUpgrade && remaining === 0 && !quotaLoading && !isPro && s.upgradeSlot]}>
            <ThemedText testID="hero-inline-remaining" accessibilityLiveRegion="polite" accessibilityElementsHidden={quotaLoading} importantForAccessibility={quotaLoading ? 'no-hide-descendants' : 'auto'} numberOfLines={2} style={[s.remaining, { color: uiInk }, remaining === 0 && s.remainingExhausted, quotaLoading && { opacity: 0 }]}>{remaining == null ? '…' : remaining === 0 ? t('comicDay.ai.exhausted') : t(remaining >= 100000 ? 'comicDay.inline.unlimited' : 'comicDay.inline.remaining', { count: remaining })}</ThemedText>
            {quotaLoading ? <View testID="hero-inline-quota-skeleton" pointerEvents="none" accessible={false} style={s.remainingSkeleton} /> : null}
            {FEATURE_FLAGS.proSubscriptions && FEATURE_FLAGS.proAiUpgrade && remaining === 0 && !quotaLoading && !isPro && !job ? <Pressable testID="hero-inline-upgrade" accessibilityRole="button" onPress={() => { Keyboard.dismiss(); tapHaptic(); setStylesOpen(false); setUpgradeOpen(true); }} style={[s.upgradeButton, { backgroundColor: isDark ? '#394B40' : '#E4EBDD' }]}>
              <ThemedText style={{ color: uiInk, fontSize: 13, lineHeight: 19, textAlign: 'center' }}>{t('comicDay.ai.upgrade')}</ThemedText>
            </Pressable> : null}
          </View>
          <View testID="hero-inline-generation-row" onLayout={({ nativeEvent: { layout } }) => { if (layout.width > 0) setGenerationWidth(layout.width); }} style={s.generationRow}>
            <View testID="hero-inline-appearance-controls" pointerEvents={job ? 'none' : 'auto'} style={s.appearanceControls}>
                <View testID="hero-inline-style-list" style={s.styles}>
                  <Pressable testID="hero-inline-style-toggle" accessibilityRole="button" accessibilityLabel={nameFor(selectedStyle.id, t(selectedStyle.name))} accessibilityState={{ selected: true, expanded: stylesOpen }} onPress={() => { tapHaptic('select'); setStylesOpen(open => !open); }} style={[s.styleItem, s.selectedStyleItem]}>
                    <View style={s.styleFrame}><View style={s.styleClip}><ComicSceneImage imageKey={`inline-style:${selectedStyle.id}`} source={selectedStyle.cover} contentFit="contain" showSkeletonOnMount transitionDuration={180} backgroundColor="#F1EEE6" style={s.styleImage} /></View></View>
</Pressable>
                  <Animated.View testID="hero-inline-style-options" pointerEvents={stylesOpen ? 'auto' : 'none'} accessibilityElementsHidden={!stylesOpen} importantForAccessibility={stylesOpen ? 'auto' : 'no-hide-descendants'} style={[s.styleOptions, { backgroundColor: fullScreen ? mainBackground : paper, width: Math.max(1, generationWidth - 56), opacity: styleReveal, transform: [{ translateY: styleReveal.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] }) }] }]}>
                  <HeroReorderableStyleRail itemWidth={44}>
                  {SELECTABLE_COMIC_CHARACTERS.map(character => <Pressable key={character.id} testID={`hero-inline-style-${character.id}`} accessibilityRole="button" accessibilityLabel={nameFor(character.id, t(character.name))} accessibilityState={{ selected: styleId === character.id }} onPress={() => { tapHaptic('select'); localStorageClient.setItemRaw(HERO_SELECTED_STYLE_KEY, character.id); setStyleId(character.id); setStylesOpen(false); }} style={[s.styleItem, styleId === character.id && s.selectedStyleCard]}>
                    <View style={s.styleFrame}><View style={s.styleClip}><ComicSceneImage imageKey={`inline-style:${character.id}`} source={character.cover} contentFit="contain" showSkeletonOnMount transitionDuration={180} backgroundColor="#F1EEE6" style={s.styleImage} /></View></View>
                  </Pressable>)}
                  {null}
                  </HeroReorderableStyleRail>
                  </Animated.View>
                </View>
          </View>
          <Pressable testID="hero-inline-generate" accessibilityRole="button" accessibilityLabel={t(job ? 'comicDay.inline.retry' : 'comicDay.inline.generateStyle')} accessibilityState={{ disabled: !canGenerate || savingFace || importingPhoto }} disabled={!canGenerate || savingFace || importingPhoto} onPress={() => { if (!canGenerate || savingFace || importingPhoto || locked.current) return; tapHaptic(); setPaintPressed(true); void generate(); }} onPressIn={() => { if (canGenerate && !savingFace && !importingPhoto && !locked.current) setPaintPressed(true); }} style={[s.generate, (!canGenerate || savingFace || importingPhoto) && { opacity: 0.4 }]}><HeroGenerateBloom active={paintPressed} /><PenCircle color={uiInk} />{job ? <HanddrawnControl name="arrow.clockwise" color={uiInk} size={26} /> : <HeroGenerateIcon ink={uiInk} />}</Pressable>
          </View>
          </View>
        </Animated.View> : null}
        </>}
        </Animated.View>
        <View testID="hero-inline-bottom-toolbar" style={s.bottomToolbar}><Pressable testID="hero-inline-dismiss-keyboard" accessibilityRole="button" accessibilityLabel={locale === 'en' ? 'Hide keyboard' : locale === 'ja' ? 'キーボードを閉じる' : locale === 'zh-TW' ? '收起鍵盤' : '키보드 내리기'} onPress={() => { tapHaptic(); editing.current = false; Keyboard.dismiss(); }} style={{ width: 40, height: 44, alignItems: 'center', justifyContent: 'center' }}><Svg width={25} height={25} viewBox="0 0 28 28" accessible={false}><Path d="M4 4.5q10-.5 20 0v13H4ZM7 8h1m4 0h1m4 0h1m4 0h.2M7 11.5h1m4 0h1m4 0h1m4 0h.2M9 15h10m-9 7 4 3.5 4-3.5" fill="none" stroke={uiInk} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" /></Svg></Pressable>{!busy && !photoOnly ? <View pointerEvents={job ? 'none' : 'auto'} style={[s.row, { flex: 1, justifyContent: 'center' }]}>{(['character', 'photo'] as const).map(value => <Pressable key={value} testID={`hero-inline-mode-${value}`} accessibilityRole="button" accessibilityLabel={t(value === 'character' ? 'comicDay.inline.fromText' : 'comicDay.inline.fromPhoto')} disabled={importingPhoto} accessibilityState={{ selected: mode === value, disabled: importingPhoto }} onPress={() => { tapHaptic('select'); setMode(value); setError(null); setStylesOpen(false); }} style={s.tab}><StoryModeIcon mode={value} ink={uiInk} paper={paper} selected={mode === value} /></Pressable>)}</View> : <View style={{ flex: 1 }} />}{mode !== 'original' ? <Pressable testID="hero-inline-help" accessibilityRole="button" accessibilityLabel={heroAiHelpLabel(locale)} onPress={() => { tapHaptic(); completeHeroInfoHint('ai'); Keyboard.dismiss(); setHelpOpen(true); }} style={{ width: 32, height: 44, alignItems: 'center', justifyContent: 'center' }}><HeroInfoHint kind="ai" enabled={visible && !busy}><Svg width={21} height={21} viewBox="0 0 24 24" accessible={false}><Path d="M12 2.2C6.6 1.9 2 6.4 2.1 12c-.2 5.4 4.3 10 9.9 9.8 5.5.2 10-4.3 9.8-9.8.2-5.5-4.2-10-9.8-9.8Z" stroke={uiInk} strokeWidth={1.2} fill="#9FCAD8" /><Path d="M12 10.5v6.2M12 7.3v.3" stroke={uiInk} strokeWidth={1.6} strokeLinecap="round" /></Svg></HeroInfoHint></Pressable> : <View style={{ width: 32 }} />}</View>
      </View>
    </View>
    {visible && photoPickerOpen ? <AppModal transparent animationType="fade" onRequestClose={() => setPhotoPickerOpen(false)}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(25,30,25,0.24)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => setPhotoPickerOpen(false)} style={StyleSheet.absoluteFill} />
        <View style={{ padding: 16, backgroundColor: paper }}>
          <HeroPhotoSource mode="photo" uri={photo} actionsOnly selectionLimit={1} onChange={value => { setPhoto(value); setPhotoPickerOpen(false); }} />
          <Pressable accessibilityRole="button" onPress={() => setPhotoPickerOpen(false)} style={{ padding: 12, alignItems: 'center' }}><ThemedText>{t('common.close')}</ThemedText></Pressable>
        </View>
      </View>
    </AppModal> : null}
    {visible && register ? <AppModal transparent animationType="fade" onRequestClose={() => { if (!savingFace) setRegister(false); }}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(25,30,25,0.24)' }}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={() => { if (!savingFace) setRegister(false); }} style={StyleSheet.absoluteFill} />
        <View testID="hero-face-registration-modal" accessibilityViewIsModal style={{ width: '100%', maxWidth: 360, alignSelf: 'center', padding: 10, backgroundColor: paper }}>
          <PenFrame color={uiInk} straight />
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 12 }}>
            <ThemedText accessibilityRole="header" style={{ flex: 1, color: uiInk, fontSize: 18 }}>{t('tabs.comicDay')}</ThemedText>
            <Pressable testID="hero-face-registration-close" accessibilityRole="button" accessibilityLabel={t('common.close')} disabled={savingFace} onPress={() => { tapHaptic(); setRegister(false); }} hitSlop={4} style={{ width: 36, height: 32, alignItems: 'center', justifyContent: 'center' }}><HanddrawnControl name="xmark" color={uiInk} size={20} /></Pressable>
          </View>
          <View testID="hero-face-photo-actions" pointerEvents={savingFace ? 'none' : 'auto'}>
            <HeroPhotoSource mode="face" uri={null} onChange={uri => { void addFace(uri); }} actionsOnly selectionLimit={1} />
            {savingFace ? <ActivityIndicator color={uiInk} /> : null}
          </View>
        </View>
      </View>
    </AppModal> : null}
    {helpOpen ? <HeroAiHelpModal onClose={() => setHelpOpen(false)} /> : null}
    {upgradeOpen ? <AppModal visible presentationStyle="fullScreen" animationType="slide" onRequestClose={() => { if (!upgradeBusy) closeUpgrade(); }}><ProPreviewPage onBusyChange={setUpgradeBusy} onClose={closeUpgrade} onActivated={closeUpgrade} /></AppModal> : null}
  </View>;
}
const s = StyleSheet.create({
  fullScreenPaper: { borderRadius: 0, paddingHorizontal: 16, paddingTop: 0, paddingBottom: 0 },
  appearanceControls: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  colorControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  emptyAddPerson: { flex: 1, width: 'auto', minWidth: 0, alignItems: 'flex-start' },
  emptyAddFaceLabel: { fontSize: 12, lineHeight: 18, color: '#000000' },
  colorButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  colorPalette: { position: 'absolute', left: 0, right: 0, bottom: '100%', marginBottom: 10, paddingHorizontal: 4 },
  colorSwatches: { alignItems: 'center', gap: 2 },
  colorSwatchTouch: { width: 38, height: 42, alignItems: 'center', justifyContent: 'center' },
  generationArea: { marginTop: 10, zIndex: 30 },
  generationRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  bottomToolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginTop: 8 },
  clippedImage: { overflow: 'hidden' },
  remainingSlot: { width: 120, alignSelf: 'flex-end', minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  upgradeSlot: { width: '100%', maxWidth: 280, gap: 6, paddingBottom: 6 },
  upgradeButton: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, justifyContent: 'center', alignItems: 'center', alignSelf: 'stretch' },
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
  styles: { width: 48, alignItems: 'center', gap: 7, paddingTop: 1 },
  styleOptions: { position: 'absolute', left: 0, bottom: '100%', height: 90, backgroundColor: 'transparent', zIndex: 30 },
  styleOptionsContent: { paddingVertical: 8, paddingHorizontal: 4, gap: 12, alignItems: 'flex-start' },
  styleItem: { width: 44, flexShrink: 0, alignItems: 'center', gap: 3, paddingHorizontal: 4, paddingTop: 3, paddingBottom: 5, backgroundColor: '#FFFEFA', borderWidth: 1, borderColor: 'transparent', shadowColor: '#403624', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.30, shadowRadius: 3, elevation: 4 },
  selectedStyleItem: { width: 44, borderColor: '#9FCAD8' }, selectedStyleCard: { borderColor: '#9FCAD8' },
  styleFrame: { width: 34, height: 38, alignItems: 'center', justifyContent: 'center' },
  styleClip: { width: 34, height: 38, overflow: 'hidden' },
  styleImage: { width: 34, height: 38 },
  check: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5E8CF' },
  styleLabel: { fontSize: 10, lineHeight: 14, textAlign: 'center', color: '#30332D' },
root: { flex: 1, minHeight: 0, width: '100%' }, paper: { flex: 1, borderRadius: 18, overflow: 'hidden', paddingHorizontal: 12, paddingTop: 4, paddingBottom: 8 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6, minHeight: 44, marginBottom: 2 }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, content: { flexGrow: 1, gap: 10 }, row: { flexDirection: 'row', gap: 10, alignItems: 'center' }, tab: { flex: 1, maxWidth: 140, aspectRatio: 4, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, avatar: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden' }, avatarFrame: { width: 44, height: 54, alignItems: 'center', justifyContent: 'center' }, chosen: { position: 'absolute', top: 9, left: 4, width: 36, height: 36, borderRadius: 18, borderWidth: 3, borderColor: '#69B6C5' }, faceHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, minWidth: 0 }, faceRail: { flex: 1, minWidth: 0 }, faceRailContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 }, person: { alignItems: 'center', width: 48, flexShrink: 0 }, addPerson: { width: 52, flexShrink: 0, alignItems: 'center' }, addSlot: { width: 52, height: 54, alignItems: 'center', justifyContent: 'center' }, small: { fontSize: 12, lineHeight: 18 }, add: { width: 36, height: 36, borderRadius: 18, borderWidth: 0.6, borderColor: '#343933', alignItems: 'center', justifyContent: 'center' }, input: { flexShrink: 0, minHeight: 110, maxHeight: 150, borderBottomWidth: 0.5, borderBottomColor: '#AFB1A7', fontSize: 16, lineHeight: 23, padding: 8 }, generate: { width: 44, height: 44, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center', marginRight: 2 }, loading: { flex: 1, gap: 16, alignItems: 'center', justifyContent: 'center', padding: 20 }, center: { textAlign: 'center', fontSize: 16 }, hint: { fontSize: 12, lineHeight: 18, textAlign: 'center', color: '#666D60' }, error: { fontSize: 13, lineHeight: 19, color: '#934C3C' } });
