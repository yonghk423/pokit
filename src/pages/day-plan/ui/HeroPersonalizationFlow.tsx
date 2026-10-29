import { HeroImageActions } from './HeroImageActions';
import { HeroGenerationLoading } from './HeroGenerationLoading';
import { flushLocalStorageClientWrites } from '@shared/lib/storage/localStorageClient';
import { dismissHeroAiJob, resumeHeroAiJob, type PendingHeroAiJob, generateHeroImages, getHeroAiRemaining, HeroAiError, type HeroAiResult } from '../lib/heroAiClient';
import { useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { PaperGrain } from '@shared/ui/paper-grain';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { SELECTABLE_COMIC_CHARACTERS } from '../lib/heroCharacters';
import { COMIC_SCENE_CATEGORIES, comicSceneMatchesCategory, type ComicSceneCategory, type ComicSceneId } from '../lib/heroSceneImages';
import { ComicGalleryCard } from './HeroGalleryCard';
import { HeroPhotoSource } from './HeroPhotoSource';

export const HERO_DAILY_IMAGE_LIMIT = 3;
/** Camera and hands artwork based on the supplied monochrome reference. */
export function HeroPhotoInvitation({ size = 140 }: { ink: string; size?: number }) {
  return <Image source={require('../../../../assets/control-illustrations/personal-camera-hands.png')} style={{ width: size, height: size }} resizeMode="contain" accessible={false} />;
}

/** Authenticated Supabase requests; the OpenAI API key never enters the app. */
export function HeroPersonalizationFlow({ onClose, initialMode = 'face', onApply, recoveryJob, targetDiaryId, characterName }: { targetDiaryId?: string; characterName?: string; recoveryJob?: PendingHeroAiJob; onClose: () => void; initialMode?: 'face' | 'photo'; onApply?: (images: HeroAiResult[]) => void }) {
  const { t } = useTranslation();
  const [layoutHeight, setLayoutHeight] = useState(620);
  const [recovering, setRecovering] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const requestId = useRef<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [results, setResults] = useState<HeroAiResult[]>([]);
  const [step, setStep] = useState<'source' | 'selection'>('source');
  const [mode, setMode] = useState<'face' | 'photo'>(recoveryJob?.mode ?? initialMode);
  const [uri, setUri] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [selected, setSelected] = useState<ComicSceneId[]>(recoveryJob?.scenes ?? []);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ComicSceneCategory>('all');
  const [visibleCount, setVisibleCount] = useState(12);
  const [columns, setColumns] = useState(2);
  const selectionLimit = Math.max(0, Math.min(HERO_DAILY_IMAGE_LIMIT, remaining ?? HERO_DAILY_IMAGE_LIMIT));
  const [width, setWidth] = useState(320);
  const back = () => busyRef.current ? undefined : step === 'selection' ? setStep('source') : onClose();
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (busyRef.current) return true; if (step === 'selection') setStep('source'); else onClose(); return true; });
    return () => sub.remove();
  }, [step, onClose]);
  useEffect(() => { void getHeroAiRemaining().then(setRemaining).catch(() => undefined); }, []);
  const generate = async () => {
    if (busyRef.current || (!uri && !recoveryJob) || (!recoveryJob && !recovering && (remaining === 0 || (remaining != null && (mode === 'face' ? selected.length : photos.length) > remaining)))) return;
    busyRef.current = true; setBusy(true); setProgress(0);
    requestId.current ??= recoveryJob?.id ?? `hero-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    try {
      const response = recoveryJob ? await resumeHeroAiJob(recoveryJob, setProgress) : await generateHeroImages({ id: requestId.current, mode, photo: uri!, photos, scenes: selected, onProgress: setProgress, targetDiaryId, characterName });
      setResults(response.images); setRemaining(response.remaining);
      if (response.error) Alert.alert(t('comicDay.ai.partial'));
    } catch (error) {
      setRecovering(true);
      const code = error instanceof HeroAiError ? error.code : 'generation_failed';
      if (['generation_failed'].includes(code)) { if (requestId.current) await dismissHeroAiJob(requestId.current); requestId.current = null; setRecovering(false); }
      Alert.alert(t('comicDay.ai.error'), t(code === 'connection' || code === 'unavailable' ? 'comicDay.ai.connection' : code === 'daily_limit' || code === 'attempt_limit' ? 'comicDay.ai.dailyLimit' : code === 'api_key_invalid' ? 'comicDay.ai.invalidKey' : code === 'api_quota' ? 'comicDay.ai.quota' : code === 'auth_unavailable' ? 'comicDay.ai.auth' : code === 'service_limit' ? 'comicDay.ai.serviceLimit' : 'comicDay.ai.failed'));
      void getHeroAiRemaining().then(setRemaining).catch(() => undefined);
    } finally { busyRef.current = false; setBusy(false); }
  };
  const recoveryStarted = useRef(false);
  useEffect(() => {
    if (recoveryJob && !recoveryStarted.current) { recoveryStarted.current = true; void generate(); }
    // A recovered request starts once; subsequent retries use the explicit button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recoveryJob]);
  const count = recoveryJob?.count ?? (mode === 'face' ? selected.length : photos.length);
  const full = count >= selectionLimit;
  useEffect(() => {
    if (recoveryJob || recovering || busyRef.current) return;
    setSelected(current => current.length > selectionLimit ? current.slice(0, selectionLimit) : current);
    setPhotos(current => current.length > selectionLimit ? current.slice(0, selectionLimit) : current);
  }, [selectionLimit, recoveryJob, recovering]);
  const toggle = (id: ComicSceneId) => { if (busyRef.current) return; requestId.current = null; setRecovering(false); setSelected(current => current.includes(id) ? current.filter(value => value !== id) : current.length < selectionLimit ? [...current, id] : current); };
  const sceneLibrary = SELECTABLE_COMIC_CHARACTERS[0].scenes;
  const categoryCounts = Object.fromEntries(COMIC_SCENE_CATEGORIES.map(item => [item.id, sceneLibrary.filter(scene => comicSceneMatchesCategory(scene.id, item.id)).length]));
  const library = sceneLibrary.filter(scene => comicSceneMatchesCategory(scene.id, category) && t(scene.label).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  if (results.length) return <View style={s.root}>
    <View style={s.resultHeader}>
      <ThemedText style={s.resultTitle}>{t('comicDay.ai.done')}</ThemedText>
    </View>
    <ScrollView style={s.resultImages} contentContainerStyle={s.content}>{results.map(image => <View key={image.uri}><Image source={{ uri: image.uri }} resizeMode="contain" style={{ width: '100%', aspectRatio: 2 / 3 }} /><HeroImageActions uri={image.uri} /></View>)}</ScrollView>
    <View style={s.footer}><ThemedText style={s.limit}>{remaining === 0 ? t('comicDay.ai.exhausted') : t('comicDay.ai.remaining', { count: remaining ?? 0 })}</ThemedText>
      <Pressable testID="hero-result-apply" accessibilityRole="button" style={s.next} onPress={() => { if (busyRef.current) return; busyRef.current = true; const id = requestId.current; if (onApply) onApply(results); else onClose(); void flushLocalStorageClientWrites().then(() => id ? dismissHeroAiJob(id) : undefined).finally(() => { busyRef.current = false; }); }}><HanddrawnFrame color="#252822" /><ThemedText style={s.label}>{t(onApply ? 'comicDay.ai.apply' : 'common.close')} →</ThemedText></Pressable>
    </View>
  </View>;
  if (busy) return <View style={s.root} accessibilityViewIsModal><PaperGrain opacity={0.2} /><HeroGenerationLoading completed={progress} total={count} /></View>;
  return <View testID="hero-personalization-flow" onLayout={event => setLayoutHeight(event.nativeEvent.layout.height)} style={s.root} accessibilityViewIsModal>
    <PaperGrain opacity={0.2} />
    <View style={s.header}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={back} style={s.touch}><ThemedText style={s.back}>‹</ThemedText></Pressable>
      <ThemedText style={s.title}>{step === 'source' ? (characterName?.trim() || t('comicDay.personal.title')) : t(mode === 'face' ? 'comicDay.personal.scenes' : 'comicDay.personal.photos')}</ThemedText>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} disabled={busy} onPress={onClose} style={s.touch}><ThemedText style={s.close}>×</ThemedText></Pressable>
    </View>
    <ScrollView pointerEvents={busy ? 'none' : 'auto'} scrollEnabled={step !== 'source'} style={{ flex: 1 }} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      {recoveryJob ? <ThemedText style={s.heading}>{t('comicDay.ai.recovering')}</ThemedText> : step === 'source' ? <>
        <HeroPhotoSource compactPreview previewHeight={Math.max(64, Math.min(145, layoutHeight - 475))} mode="photo" uri={uri} onChange={value => { requestId.current = null; setRecovering(false); setUri(value); setPhotos(selectionLimit > 0 ? [value] : []); }} />
        <ThemedText style={s.heading}>{t('comicDay.personal.how')}</ThemedText>
        {(['face', 'photo'] as const).map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={t(`comicDay.personal.mode.${value}`)} accessibilityState={{ checked: mode === value }} onPress={() => { requestId.current = null; setRecovering(false); setMode(value); }} style={s.option}>
          <HanddrawnFrame color={mode === value ? '#252822' : '#B6B6B0'} bold={mode === value} />
          <View style={[s.radio, mode === value && s.radioSelected]}>
            {mode === value ? <Svg width={17} height={17} viewBox="0 0 24 24" accessible={false}>
              <Path d="M4.6 12.4c1.1 1.05 2.55 2.55 4.35 4.7 2.05-3.55 5.35-7.85 10.1-11.55-.55-.35-1.05-.55-1.35-.45-3.95 3.05-6.85 6.85-8.55 9.85-1.25-1.35-2.35-2.35-3.55-3.15-.55.35-1 .7-1 .6z" fill="#F7F6F4" />
            </Svg> : null}
          </View>
          <View style={{ flex: 1 }}><ThemedText style={s.label}>{t(`comicDay.personal.mode.${value}`)}</ThemedText><ThemedText style={s.hint}>{t(`comicDay.personal.hint.${value}`)}</ThemedText></View>
        </Pressable>)}
      </> : <>
        <View style={s.identity}>{uri && mode === 'face' ? <Image source={{ uri }} style={s.avatar} /> : null}<View style={{ flex: 1 }}><ThemedText style={s.label}>{t(`comicDay.personal.mode.${mode}`)}</ThemedText><ThemedText style={s.hint}>{t(`comicDay.personal.hint.${mode}`)}</ThemedText></View></View>
        <ThemedText accessibilityLiveRegion="polite" style={s.heading}>{t('comicDay.personal.count', { count, limit: selectionLimit })}</ThemedText>
        {mode === 'face' ? <>
          <ThemedTextInput value={query} onChangeText={value => { setQuery(value); setVisibleCount(12); }} placeholder={t('comicDay.search')} accessibilityLabel={t('comicDay.search')} style={s.search} />
          <ScrollView horizontal style={{ height: 32, flexGrow: 0 }} showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryRow}>
            {COMIC_SCENE_CATEGORIES.map(item => { const active = category === item.id; return <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={t(item.label)} accessibilityState={{ selected: active }} onPress={() => { setCategory(item.id); setVisibleCount(12); }} style={s.categoryChip}>
              {active ? <HanddrawnFrame color="#171510" /> : null}<ThemedText numberOfLines={1} style={s.categoryLabel}>{t(item.label)}</ThemedText><ThemedText style={s.categoryCount}>{categoryCounts[item.id]}</ThemedText>
            </Pressable>; })}
          </ScrollView>
        </> : null}
        <View style={s.viewModes}>{([3, 2, 1] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={t(value === 3 ? 'comicDay.viewSmall' : value === 2 ? 'comicDay.viewTwo' : 'comicDay.viewOne')} accessibilityState={{ selected: columns === value }} onPress={() => setColumns(value)} style={s.viewMode}>
          {columns === value ? <HanddrawnFrame color="#252822" /> : null}
          <Svg width={18} height={18} viewBox="0 0 20 20" accessible={false}>{Array.from({ length: value === 3 ? 9 : value }, (_, i) => { const n = value === 3 ? 3 : value; const size = (16 - (n - 1) * 2) / n; return <Rect key={i} x={2 + i % n * (size + 2)} y={value === 3 ? 2 + Math.floor(i / n) * (size + 2) : 3} width={size} height={value === 3 ? size : 14} fill="none" stroke="#252822" strokeWidth={1.1} />; })}</Svg>
        </Pressable>)}</View>
        {mode === 'face' ? <>
          <View style={s.grid} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
            {library.slice(0, visibleCount).map(scene => <View key={scene.id} style={full && !selected.includes(scene.id) ? { opacity: 0.45 } : undefined}><ComicGalleryCard id={scene.id} label={t(scene.label)} width={Math.max(1, (width - (columns - 1) * 10) / columns)} columns={columns} order={selected.indexOf(scene.id) + 1} onToggle={toggle} /></View>)}
          </View>
          {visibleCount < library.length ? <Pressable accessibilityRole="button" onPress={() => setVisibleCount(value => value + 12)} style={s.touch}><ThemedText style={s.label}>{t('comicDay.personal.more')}</ThemedText></Pressable> : null}
          {!library.length ? <ThemedText style={s.hint}>{t('comicDay.noImages')}</ThemedText> : null}
        </> : <>
          <View style={s.grid} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
            {photos.map((photo, index) => <View key={photo} style={[s.photo, { width: photos.length === 1 ? width : Math.max(1, (width - (columns - 1) * 10) / columns) }]}>
              <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} resizeMode="cover" />
              <Pressable accessibilityRole="button" accessibilityLabel={t('comicDay.personal.remove', { count: index + 1 })} onPress={() => { requestId.current = null; setRecovering(false); setPhotos(current => current.filter(item => item !== photo)); }} style={s.remove}><ThemedText style={s.label}>{index + 1} ×</ThemedText></Pressable>
            </View>)}
          </View>
          {!full ? <HeroPhotoSource mode="photo" uri={null} actionsOnly selectionLimit={selectionLimit - photos.length} onChange={() => undefined} onSelect={values => { requestId.current = null; setRecovering(false); setPhotos(current => [...new Set([...current, ...values])].slice(0, selectionLimit)); }} /> : null}
        </>}
      </>}
    </ScrollView>
    <View style={s.footer}>
      <ThemedText style={s.limit}>{t('comicDay.personal.limit')}</ThemedText>
      {step === 'selection' && full && selectionLimit === HERO_DAILY_IMAGE_LIMIT ? <ThemedText testID="hero-daily-limit-warning" style={s.warning}>{t('comicDay.personal.lastThree')}</ThemedText> : null}
      {remaining != null ? <ThemedText style={s.hint}>{t('comicDay.ai.remaining', { count: remaining })}</ThemedText> : null}
      {busy ? <ThemedText accessibilityLiveRegion="polite" style={s.hint}>{t('comicDay.ai.processing', { count: progress, total: count })}</ThemedText> : null}
      <Pressable testID="hero-personal-next" accessibilityRole="button" disabled={busy || (!recoveryJob && !recovering && remaining === 0) || (!recoveryJob && step === 'source' ? !uri : count === 0 || (remaining != null && count > remaining && !recovering))} accessibilityState={{ disabled: busy || (!recoveryJob && !recovering && remaining === 0) || (!recoveryJob && step === 'source' ? !uri : count === 0 || (remaining != null && count > remaining && !recovering)), busy }} onPress={() => {
        if (recoveryJob) { void generate(); } else if (step === 'source') { if (!uri) return; if (!photos.length && selectionLimit > 0) setPhotos([uri]); setStep('selection'); }
        else void generate();
      }} style={[s.next, (!recoveryJob && step === 'source' ? !uri : count === 0) && { opacity: 0.4 }]}>
        <HanddrawnFrame color="#252822" /><ThemedText style={s.label}>{!recoveryJob && step === 'source' ? t('comicDay.personal.next') : t('comicDay.personal.generate', { count })} →</ThemedText>
      </Pressable>
    </View>
  </View>;
}
const s = StyleSheet.create({
  categoryRow: { gap: 6 },
  categoryChip: { height: 32, paddingHorizontal: 10, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', borderRadius: 6, borderWidth: 0.5, borderColor: '#BBBBB5' },
  categoryLabel: { color: '#171510', fontSize: 13, lineHeight: 18 },
  categoryCount: { color: '#666', fontSize: 10, lineHeight: 16 },
  viewModes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6 },
  viewMode: { width: 36, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#BBBBB5', borderRadius: 6 },
  resultHeader: { flexShrink: 0, paddingHorizontal: 20, paddingVertical: 20 },
  resultTitle: { fontSize: 21, lineHeight: 30, textAlign: 'center', color: '#20251F' },
  resultImages: { flex: 1, minHeight: 0 },
  root: { flex: 1, backgroundColor: '#F7F6F4' }, header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderColor: '#CCCBC4', paddingHorizontal: 8 }, touch: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, back: { fontSize: 34, color: '#20251F' }, close: { fontSize: 26, color: '#20251F' }, title: { flex: 1, fontSize: 21, lineHeight: 28, textAlign: 'center', color: '#20251F' },
  content: { padding: 16, gap: 12, paddingBottom: 24 }, heading: { color: '#252822', fontSize: 17, lineHeight: 24 }, option: { minHeight: 64, flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12 }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.2, borderColor: '#252822', alignItems: 'center', justifyContent: 'center' }, radioSelected: { backgroundColor: '#252822' }, label: { color: '#20251F', fontSize: 16, lineHeight: 23 }, hint: { color: '#73746E', fontSize: 13, lineHeight: 20 }, identity: { flexDirection: 'row', gap: 12, alignItems: 'center' }, avatar: { width: 52, height: 62, borderRadius: 5 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, photo: { aspectRatio: 3 / 4, overflow: 'hidden', borderRadius: 5 }, remove: { position: 'absolute', right: 4, top: 4, padding: 6, backgroundColor: '#FFFEF8', borderRadius: 5 }, search: { minHeight: 40, borderWidth: 0.6, borderColor: '#AAA', borderRadius: 7, paddingHorizontal: 12, color: '#20251F' },
  footer: { padding: 16, gap: 6, borderTopWidth: 0.5, borderColor: '#DDDCD5' }, limit: { fontSize: 13, lineHeight: 20, color: '#252822' }, warning: { fontSize: 13, lineHeight: 20, color: '#252822' }, next: { minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
});
