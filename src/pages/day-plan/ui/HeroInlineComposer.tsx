import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useAnimatedValue, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { AppAlert } from '@shared/lib/app-alert';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ComicSceneImage } from './HeroSceneImage';
import { HeroPhotoSource, HeroPhotoIcon } from './HeroPhotoSource';
import { COMIC_SCENES, type ComicSceneId } from '../lib/heroSceneImages';
import { generateHeroImages, resumeHeroAiJob, cancelHeroAiJob, getPendingHeroAiJob, dismissHeroAiJob, HeroAiError, type PendingHeroAiJob } from '../lib/heroAiClient';
import { loadHeroSavedFaces, saveHeroFace, deleteHeroFace, type HeroSavedFace } from '../lib/heroSavedFaces';
import type { HeroCardText } from './HeroCardCaption';

/** Two lightly varied pen strokes, matching the app's hand-drawn controls. */
function PenCircle({ selected = false, color }: { selected?: boolean; color: string }) {
  return <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 56 56" style={StyleSheet.absoluteFill}>
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
      <Path d="m223 52-36 13 36 41m5-1 74-22-24-27" fill="none" stroke={ink} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m211 70 5-1 6 3 1 5 7-1" fill="none" stroke={ink} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m272 14-15 23 18 12 18-23M257 37l-5 9 16 11 7-8m-19-3-14 13-4 26-5 10 9 2 10-12 16-11 1-18" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m234 94 17-28m1-7a2.5 2.5 0 1 0 .1 0" fill="none" stroke={ink} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" />
    </> : <>
      <Path d="m216 35 5-15 27-.2 5 15m-29-1 3-9 15 .2 3 9M202 35v-3l11 .2m55 2v-2l9 .3" fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M286 51q-1-15-16-16l-68-.4q-17 .1-17 16l-.4 33q0 14 13 15l68-.4" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M217 67c0-25 38-25 38 0s-38 25-38 0Zm5 0c-.1-18 28-19 28 .1 0 18-28 18-28-.1ZM194 49a4 4 0 1 0 .1 0" fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" />
      <Path d="m267 61 62-13 10 45-63 14Z" fill={paper} stroke={ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m277 102 13-25q4-5 9-1l12 12 5-9q3-4 7-1l13 13m-29-3 11 8M312 65a4.3 4.3 0 1 0 .1 0" fill="none" stroke={ink} strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" />
    </>}
  </Svg>;
}

function FountainNib({ ink }: { ink: string }) {
  return <Svg width={29} height={29} viewBox="0 0 32 32" accessible={false} pointerEvents="none">
    <Path d="M5.2 27.1 8.6 13.4 22.5 4.7 27.3 9.6 18.4 23.4 5.2 27.1Z" fill="none" stroke={ink} strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="m5.2 27.1 10.5-10.5M18.7 7.2l6.1 6.1" fill="none" stroke={ink} strokeWidth={0.9} strokeLinecap="round" />
    <Path d="M18.8 15.1a1.8 1.8 0 1 0-3.6 0 1.8 1.8 0 0 0 3.6 0Z" fill={ink} />
    <Path d="m7 29.1 13-.2" fill="none" stroke={ink} strokeWidth={0.65} strokeLinecap="round" />
  </Svg>;
}

function DrawingProgress({ elapsed, complete, ink }: { elapsed: number; complete: boolean; ink: string }) {
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
    <ThemedText style={[s.center, { color: ink }]}>{t('comicDay.inline.drawing')}</ThemedText>
    <ThemedText testID="hero-inline-progress-percent" style={[s.percent, { color: ink }]}>{percent}%</ThemedText>
    <View testID="hero-inline-progress" accessibilityRole="progressbar" accessibilityLabel={t('comicDay.loading.estimated')} accessibilityValue={{ min: 0, max: 100, now: percent }} style={s.progressTrack}>
      <View style={s.progressClip}><Animated.View style={[s.progressFill, { backgroundColor: ink, transform: [{ scaleX: fill }] }]} /></View>
      <Svg pointerEvents="none" width="100%" height="100%" viewBox="0 0 240 16" preserveAspectRatio="none" style={StyleSheet.absoluteFill}><Path d="M8 2.3Q119 1 231 2.2C240 2 239 14 231 13.8Q122 15 8 13.9C-.4 14.5.4 2.6 8 2.3Z" fill="none" stroke={ink} strokeWidth={1.1} /><Path d="M12 14.8Q104 15.4 193 14.7" fill="none" stroke={ink} strokeWidth={0.4} opacity={0.5} /></Svg>
    </View>
    <ThemedText style={s.hint}>{t('comicDay.loading.estimated')}</ThemedText>
    <ThemedText style={s.hint}>{t('comicDay.inline.elapsed', { seconds: elapsed })}</ThemedText>
    {elapsed >= 90 ? <ThemedText style={s.hint}>{t('comicDay.loading.longer')}</ThemedText> : null}
  </View>;
}

export function HeroInlineComposer({ sceneId, title = '', memo = '', paper: cardPaper = '#F5E8CF', ink: cardInk, targetDiaryId, targetSceneId, recoveryJob, onApply, onClose }: {
  sceneId: ComicSceneId; title?: string; memo?: string; paper?: string; ink: string; targetDiaryId?: string; targetSceneId?: string; recoveryJob?: PendingHeroAiJob;
  onApply: (text: HeroCardText, uri: string, jobId: string) => Promise<void>; onClose: () => void;
}) {
  const { t } = useTranslation();
  // Card customization belongs to the saved result, not the creation controls.
  const paper = '#F7F6F1';
  const ink = '#343933';
  const [mode, setMode] = useState<'character' | 'photo'>(recoveryJob?.story?.source ?? 'character');
  const [text, setText] = useState(recoveryJob?.story?.text ?? (memo || title));
  const [photo, setPhoto] = useState<string | null>(null);
  const [facesLoading, setFacesLoading] = useState(true);
  const [faces, setFaces] = useState<HeroSavedFace[]>([]);
  const [face, setFace] = useState<string | null>(null);
  const [register, setRegister] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [savingFace, setSavingFace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const operation = useRef<AbortController | null>(null);
  const [resultReady, setResultReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [offset, setOffset] = useState(0);
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
  const removeFace = (saved: HeroSavedFace) => AppAlert.alert(t('comicDay.inline.removeFace'), undefined, [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('comicDay.inline.removeFace'), style: 'destructive', onPress: () => { void deleteHeroFace(saved.id).then(values => { setFaces(values); if (face === saved.uri) setFace(null); }).catch(() => setError(t('comicDay.ai.failed'))); } },
  ]);
  const generate = async () => {
    if (locked.current) return;
    if (!job && (!text.trim() || (mode === 'photo' && !photo))) return;
    const controller = new AbortController(); operation.current = controller;
    locked.current = true; setCancelling(false); setBusy(true); setResultReady(false); setError(null); setElapsed(0); Keyboard.dismiss();
    const id = job?.id ?? `hero-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    try {
      const result = job ? await resumeHeroAiJob(job, () => undefined, controller.signal) : await generateHeroImages({
        id, mode: mode === 'character' && face ? 'face' : 'photo', photo: face ?? photo ?? '', photos: photo ? [photo] : [], scenes: [sceneId],
        signal: controller.signal, story: { text: text.trim(), source: mode }, targetDiaryId, targetSceneId, onProgress: () => undefined,
      });
      if (controller.signal.aborted) throw new HeroAiError('cancelled');
      if (!result.images[0]) throw new HeroAiError('generation_failed');
      if (alive.current) setResultReady(true);
      // Let the completed gauge render before the card displays the result.
      await new Promise(resolve => setTimeout(resolve, 450));
      if (controller.signal.aborted) throw new HeroAiError('cancelled');
      await onApply({ title: text.trim().split('\n')[0].slice(0, 80), memo: text.trim(), paper: cardPaper, pen: cardInk }, result.images[0].uri, id);
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
      const message = code === 'daily_limit' || code === 'attempt_limit' ? t('comicDay.ai.dailyLimit') : code === 'pending_job' ? t('comicDay.inline.pending') : code === 'face_missing' ? t('comicDay.ai.face_missing') : code === 'face_multiple' ? t('comicDay.ai.face_multiple') : code === 'face_unclear' ? t('comicDay.ai.face_unclear') : code === 'face_check_unavailable' ? t('comicDay.ai.face_check_unavailable') : code === 'connection' ? t('comicDay.ai.connection') : t('comicDay.ai.failed');
      if (alive.current) setError(message);
    } finally { locked.current = false; operation.current = null; if (alive.current) { setBusy(false); setCancelling(false); } }
  };
  const started = useRef(false);
  useEffect(() => { if (recoveryJob && !started.current) { started.current = true; void generate(); } }, [recoveryJob]); // eslint-disable-line react-hooks/exhaustive-deps
  const scene = COMIC_SCENES.find(value => value.id === sceneId) ?? COMIC_SCENES[0];
  const canGenerate = !!job || !!text.trim() && (mode !== 'photo' || !!photo);
  return <View ref={root} collapsable={false} testID="hero-inline-composer" style={s.root} onLayout={() => root.current?.measureInWindow((_x, y) => setOffset(y))}>
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={offset}>
      <View testID="hero-inline-paper" style={[s.paper, { backgroundColor: paper }]}><PaperGrain opacity={0.15} />
        <View style={s.heading}><Pressable accessibilityLabel={t('common.close')} accessibilityRole="button" disabled={savingFace || cancelling || resultReady} onPress={() => { if (busy) { setCancelling(true); operation.current?.abort(); } else onClose(); }} style={s.icon}><HanddrawnControl name="xmark" color={ink} size={22} /></Pressable></View>
        {busy ? <View style={s.loading}><DrawingProgress elapsed={elapsed} complete={resultReady} ink={ink} /><Pressable testID="hero-inline-cancel-generation" accessibilityRole="button" accessibilityLabel={t('comicDay.inline.cancelGeneration')} disabled={cancelling || resultReady} onPress={() => { setCancelling(true); operation.current?.abort(); }} style={s.cancelGeneration}><HanddrawnControl name="xmark" color={ink} size={18} /><ThemedText style={[s.cancelText, { color: ink }]}>{t(cancelling ? 'comicDay.inline.cancelling' : 'comicDay.inline.cancelGeneration')}</ThemedText></Pressable></View> : <>
          <ScrollView ref={scroll} style={s.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" onLayout={revealStory} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
            <View pointerEvents={job ? 'none' : 'auto'} style={s.content}>
              <View style={s.row}>{(['character', 'photo'] as const).map(value => <Pressable key={value} testID={`hero-inline-mode-${value}`} accessibilityRole="button" accessibilityLabel={t(value === 'character' ? 'comicDay.inline.fromText' : 'comicDay.inline.fromPhoto')} accessibilityState={{ selected: mode === value }} onPress={() => { setMode(value); setError(null); }} style={s.tab}><StoryModeIcon mode={value} ink={ink} paper={paper} selected={mode === value} /></Pressable>)}</View>
              <View style={s.references}>
                <View style={s.referenceMain}>
                  {mode === 'character' ? <>
                    <ThemedText style={[s.sectionLabel, { color: ink }]}>{t('comicDay.inline.face')}</ThemedText>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
                      {facesLoading ? <View testID="hero-inline-faces-loading" accessibilityState={{ busy: true }} style={s.row}>{[0, 1].map(index => <View key={index} style={[s.avatar, s.imagePlaceholder]} />)}</View> : null}
                      {faces.map((saved, index) => <Pressable key={saved.id} testID={`hero-inline-face-${index}`} accessibilityRole="button" accessibilityLabel={`${t('comicDay.inline.face')} ${index + 1}`} accessibilityState={{ selected: face === saved.uri }} onPress={() => { setFace(saved.uri); setRegister(false); }} onLongPress={() => removeFace(saved)} style={s.person}><ComicSceneImage imageKey={`saved-face-avatar:${saved.uri}`} source={{ uri: saved.uri }} contentFit="cover" showSkeletonOnMount transitionDuration={180} backgroundColor="#F1EEE6" style={[s.avatar, s.clippedImage, face === saved.uri && s.chosen]} /></Pressable>)}
                      <Pressable testID="hero-inline-add-face" onPress={() => setRegister(value => !value)} accessibilityRole="button" accessibilityLabel={t('comicDay.inline.addFace')} style={s.person}><View style={[s.avatar, s.add]}><ThemedText style={{ fontSize: 25 }}>+</ThemedText></View><ThemedText style={s.small}>{t('comicDay.inline.addFace')}</ThemedText></Pressable>
                    </ScrollView>
                    {register ? <View pointerEvents={savingFace ? 'none' : 'auto'}><HeroPhotoSource mode="face" uri={null} onChange={uri => { void addFace(uri); }} actionsOnly selectionLimit={1} /><ThemedText style={s.hint}>{t('comicDay.inline.localFace')}</ThemedText>{savingFace ? <ActivityIndicator /> : null}</View>
                      : facesLoading ? <View testID="hero-inline-portrait-loading" accessibilityState={{ busy: true }} style={[s.preview, s.imagePlaceholder]} />
                      : face ? <ComicSceneImage imageKey={`saved-face-preview:${face}`} source={{ uri: face }} contentFit="contain" showSkeletonOnMount transitionDuration={180} backgroundColor="#F7F6F1" style={s.preview} />
                      : <View style={s.emptyPortrait}><HeroPhotoIcon /><ThemedText style={s.hint}>{t('comicDay.inline.optionalFace')}</ThemedText></View>}
                  </> : <HeroPhotoSource mode="photo" uri={photo} onChange={setPhoto} compactPreview previewHeight={130} selectionLimit={1} />}
                  <ThemedText style={s.referenceHint}>{t(mode === 'photo' ? 'comicDay.inline.photoStyleHint' : face ? 'comicDay.inline.faceStyleHint' : 'comicDay.inline.styleHint')}</ThemedText>
                </View>
                <View testID="hero-inline-style-list" style={s.styles}>
                  <ThemedText style={[s.small, { color: ink }]}>{t('comicDay.inline.styles')}</ThemedText>
                  <Pressable testID="hero-inline-style-protagonist-1" accessibilityRole="button" accessibilityLabel={t('comicDay.character.one')} accessibilityState={{ selected: true }} onPress={() => setShowComingSoon(false)} style={s.styleItem}>
                    <View style={s.styleFrame}><View style={s.styleClip}><ComicSceneImage imageKey={`inline-style:${scene.id}`} source={scene.source} contentFit="contain" showSkeletonOnMount transitionDuration={180} backgroundColor="#F1EEE6" style={s.styleImage} /></View><PenCircle selected color={ink} /><View style={s.check}><HanddrawnControl name="checkmark" color={ink} size={13} /></View></View>
                    <ThemedText style={s.styleLabel}>{t('comicDay.character.one')}</ThemedText>
                  </Pressable>
                  {[0].map(index => <Pressable key={index} testID={`hero-inline-style-upcoming-${index}`} accessibilityRole="button" accessibilityLabel={t('comicDay.inline.comingSoon')} accessibilityState={{ selected: false }} onPress={() => setShowComingSoon(true)} style={s.styleItem}>
                    <View style={s.styleFrame}><View style={s.styleClip}><ComicSceneImage imageKey="inline-style:upcoming" source={require('../../../../assets/control-illustrations/coming-soon-coffee-walk.png')} contentFit="contain" showSkeletonOnMount transitionDuration={180} backgroundColor="#F1EEE6" style={s.styleImage} /></View><PenCircle color={ink} /></View>
                    <ThemedText style={s.futureLabel}>{t('comicDay.inline.comingSoon')}</ThemedText>
                  </Pressable>)}
                </View>
              </View>
              {showComingSoon ? <ThemedText testID="hero-inline-coming-soon" accessibilityLiveRegion="polite" style={s.hint}>{t('comicDay.inline.preparingStyles')}</ThemedText> : null}
              <ThemedTextInput testID="hero-inline-story" accessibilityLabel={t('comicDay.memo')} placeholder={t('comicDay.inline.hint')} placeholderTextColor="#7D8176" value={text} onFocus={() => { editing.current = true; revealStory(); }} onBlur={() => { editing.current = false; }} onChangeText={setText} maxLength={4000} multiline textAlignVertical="top" style={[s.input, { color: ink }]} />
            </View>
            {error ? <ThemedText accessibilityLiveRegion="polite" style={s.error}>{error}</ThemedText> : null}
          </ScrollView>
          <Pressable testID="hero-inline-generate" accessibilityRole="button" accessibilityLabel={t(job ? 'comicDay.inline.retry' : 'comicDay.inline.generateStyle')} accessibilityState={{ disabled: !canGenerate || savingFace }} disabled={!canGenerate || savingFace} onPress={() => { void generate(); }} style={[s.generate, (!canGenerate || savingFace) && { opacity: 0.4 }]}><PenCircle color={ink} />{job ? <HanddrawnControl name="arrow.clockwise" color={ink} size={26} /> : <FountainNib ink={ink} />}</Pressable>
        </>}
      </View>
    </KeyboardAvoidingView>
  </View>;
}
const s = StyleSheet.create({
  clippedImage: { overflow: 'hidden' },
  imagePlaceholder: { backgroundColor: '#E8E5DE', opacity: 0.7 },
  cancelGeneration: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14, marginTop: 12 },
  cancelText: { fontSize: 13, lineHeight: 20 },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { gap: 10, paddingBottom: 16 },
  progressContent: { width: '100%', alignItems: 'center', gap: 12 },
  percent: { fontSize: 20, lineHeight: 28, fontVariant: ['tabular-nums'], marginTop: 8 },
  progressTrack: { width: '100%', maxWidth: 240, height: 16, marginVertical: 3 },
  progressClip: { position: 'absolute', left: 4, right: 4, top: 4, bottom: 4, borderRadius: 4, overflow: 'hidden' },
  progressFill: { width: '100%', height: '100%', opacity: 0.68, transformOrigin: 'left' },
  references: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  referenceMain: { flex: 1, minWidth: 0, gap: 10 },
  sectionLabel: { fontSize: 13, lineHeight: 20 },
  emptyPortrait: { minHeight: 120, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 8 },
  referenceHint: { fontSize: 12, lineHeight: 18, color: '#666D60', marginTop: 4 },
  styles: { width: 62, alignItems: 'center', gap: 9, paddingTop: 1 },
  styleItem: { alignItems: 'center', gap: 4, minHeight: 44 },
  styleFrame: { width: 56, height: 56, padding: 5 },
  styleClip: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden' },
  styleImage: { width: 46, height: 46 },
  check: { position: 'absolute', bottom: -2, right: -2, width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5E8CF' },
  styleLabel: { fontSize: 10, lineHeight: 14, textAlign: 'center' },
  futureLabel: { fontSize: 10, lineHeight: 14, textAlign: 'center', color: '#767A6D' },
root: { flex: 1, minHeight: 0, width: '100%' }, paper: { flex: 1, borderRadius: 18, overflow: 'hidden', paddingHorizontal: 16, paddingBottom: 12 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', minHeight: 42 }, icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, content: { gap: 10 }, row: { flexDirection: 'row', gap: 10, alignItems: 'center' }, tab: { flex: 1, aspectRatio: 4, minHeight: 0, alignItems: 'center', justifyContent: 'center' }, avatar: { width: 48, height: 48, borderRadius: 24 }, chosen: { borderWidth: 1.2, borderColor: '#343933' }, person: { alignItems: 'center', gap: 4, minWidth: 70 }, small: { fontSize: 12, lineHeight: 18 }, add: { borderWidth: 0.6, alignItems: 'center', justifyContent: 'center' }, preview: { width: '100%', height: 140, borderRadius: 8 }, input: { flexShrink: 0, minHeight: 110, maxHeight: 150, borderBottomWidth: 0.5, borderColor: '#8A8C7E', fontSize: 16, lineHeight: 23, padding: 8 }, generate: { width: 54, height: 54, alignSelf: 'flex-end', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginRight: 2 }, loading: { flex: 1, gap: 16, alignItems: 'center', justifyContent: 'center', padding: 20 }, center: { textAlign: 'center', fontSize: 16 }, hint: { fontSize: 12, lineHeight: 18, textAlign: 'center', color: '#666D60' }, error: { fontSize: 13, lineHeight: 19, color: '#934C3C' } });
