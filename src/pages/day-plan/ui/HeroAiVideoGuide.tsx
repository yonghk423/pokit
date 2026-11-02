import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useVideoPlayer, VideoView } from 'expo-video';
import { penContour } from '@shared/ui/pen-frame';
import { ThemedText } from '@shared/ui/themed-text';
import { HeroPhotoIcon } from './HeroPhotoSource';
import { visualGuideWords } from './HeroAiVisualGuide';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';

import guideSummary from '../../../../assets/help-videos/guide-summary.json';

const sources = {
  ko: [require('../../../../assets/help-videos/writing-ko.mp4'), require('../../../../assets/help-videos/photo-ko.mp4')],
  en: [require('../../../../assets/help-videos/writing-en.mp4'), require('../../../../assets/help-videos/photo-en.mp4')],
  ja: [require('../../../../assets/help-videos/writing-ja.mp4'), require('../../../../assets/help-videos/photo-ja.mp4')],
  'zh-TW': [require('../../../../assets/help-videos/writing-zh-TW.mp4'), require('../../../../assets/help-videos/photo-zh-TW.mp4')],
};
const posters = {
  ko: [require('../../../../assets/help-videos/writing-ko-poster.jpg'), require('../../../../assets/help-videos/photo-ko-poster.jpg')],
  en: [require('../../../../assets/help-videos/writing-en-poster.jpg'), require('../../../../assets/help-videos/photo-en-poster.jpg')],
  ja: [require('../../../../assets/help-videos/writing-ja-poster.jpg'), require('../../../../assets/help-videos/photo-ja-poster.jpg')],
  'zh-TW': [require('../../../../assets/help-videos/writing-zh-TW-poster.jpg'), require('../../../../assets/help-videos/photo-zh-TW-poster.jpg')],
};
const words = {
  ko: { dismiss: '설명 닫기', loading: '준비 중…', play: '영상 재생', pause: '일시 정지', replay: '다시 보기', error: '영상을 불러오지 못했어요. 다시 보기를 눌러주세요.' },
  en: { dismiss: 'Close instructions', loading: 'Preparing…', play: 'Play video', pause: 'Pause', replay: 'Replay', error: 'The video could not load. Please try Replay.' },
  ja: { dismiss: '説明を閉じる', loading: '準備中…', play: '動画を再生', pause: '一時停止', replay: 'もう一度見る', error: '動画を読み込めませんでした。もう一度再生してください。' },
  'zh-TW': { dismiss: '關閉說明', loading: '準備中…', play: '播放影片', pause: '暫停', replay: '重播', error: '無法載入影片，請按重播再試一次。' },
};

function PenUnderline({ color }: { color: string }) {
  const [width, setWidth] = useState(0);
  const w = Math.max(24, width);
  const y = 3.2;
  const points = [
    [1.5, y + 0.35],
    [w * 0.22, y - 0.25],
    [w * 0.48, y + 0.45],
    [w * 0.74, y - 0.15],
    [w - 1.5, y + 0.3],
  ] as const;
  return (
    <View
      style={s.underlineSlot}
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width > 0 && Math.abs(layout.width - width) > 0.5) setWidth(layout.width);
      }}
    >
      {width > 0 ? (
        <Svg width="100%" height={7} viewBox={`0 0 ${w} 7`}>
          <Path d={penContour(points, 1.45, 0.6)} fill={color} />
          <Path d={penContour(points, 0.55, 2.1)} fill={color} opacity={0.35} />
        </Svg>
      ) : null}
    </View>
  );
}

export function HeroAiVideoGuide({ locale }: { locale?: string }) {
  const language = locale && locale in sources ? locale as keyof typeof sources : 'ko';
  const [mode, setMode] = useState(0);
  const labels = visualGuideWords(language);
  return <View testID="hero-ai-video-guide" style={s.root}>
    <View style={s.modes}>{labels.modes.map((label, index) => {
      const selected = mode === index;
      return <Pressable key={index} testID={`hero-help-mode-${index}`} accessibilityRole="tab" accessibilityState={{ selected }} onPress={() => { tapHaptic('select'); setMode(index); }} style={s.mode}>
        <View style={s.modeInner}>
          {index ? <HeroPhotoIcon camera colored size={18} /> : <Svg width={18} height={18} viewBox="0 0 24 24" accessible={false}><Path d="m5 15 9-11 5 4-9 11-6 2Z M13 5l5 4M5 15l5 4" stroke="#343933" strokeWidth={1.2} fill="none" /></Svg>}
          <ThemedText lineBreakStrategyIOS="hangul-word" numberOfLines={2} style={[s.label, selected ? s.labelSelected : null]}>{label}</ThemedText>
        </View>
        {selected ? <PenUnderline color="#50594E" /> : <View style={s.underlineSpacer} />}
      </Pressable>;
    })}</View>
    <GuideMovie source={sources[language][mode]} poster={posters[language][mode]} labels={words[language]} summary={guideSummary[language][mode]} />
  </View>;
}
function GuideMovie({ source, poster, labels, summary }: { source: number; poster: number; labels: typeof words.ko; summary: string }) {
  const [playing, setPlaying] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [starting, setStarting] = useState(() => AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const requested = useRef(false);
  const ended = useRef(false);
  const [initialSource] = useState(source);
  const currentSource = useRef(source);
  const replacementId = useRef(0);
  const replacementQueue = useRef(Promise.resolve());
  const replacing = useRef(false);
  const [firstFrame, setFirstFrame] = useState(false);
  const [error, setError] = useState(false);
  const player = useVideoPlayer(initialSource, value => {
    value.bufferOptions = { waitsToMinimizeStalling: false, preferredForwardBufferDuration: 0.25 };
    value.timeUpdateEventInterval = 0.1;
    value.loop = false;
    value.muted = true;
    value.audioMixingMode = 'mixWithOthers';
    value.staysActiveInBackground = false;
    value.showNowPlayingNotification = false;
  });
  useEffect(() => () => { replacementId.current += 1; replacing.current = false; }, []);
  useEffect(() => {
    if (source === currentSource.current) return;
    currentSource.current = source;
    const id = ++replacementId.current;
    requested.current = AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
    replacing.current = true;
    player.pause();
    ended.current = false;
    setPlaying(false);
    setStarting(requested.current);
    setTipDismissed(false);
    setFirstFrame(false);
    setError(false);
    replacementQueue.current = replacementQueue.current.catch(() => undefined).then(async () => {
      if (id !== replacementId.current) return;
      try {
        await player.replaceAsync(source);
        if (id !== replacementId.current) return;
        replacing.current = false;
        if (requested.current) player.play();
      } catch {
        if (id !== replacementId.current) return;
        replacing.current = false;
        requested.current = false;
        setStarting(false);
        setError(true);
      }
    });
  }, [player, source]);
  useEffect(() => {
    const progress = player.addListener('playingChange', event => {
      setPlaying(event.isPlaying);
      if (event.isPlaying) { requested.current = false; setStarting(false); }
    });
    const status = player.addListener('statusChange', event => {
      setError(event.status === 'error');
      if (event.status === 'error') { requested.current = false; setStarting(false); }
      if (event.status === 'readyToPlay' && requested.current && !replacing.current) player.play();
    });
    const time = player.addListener('timeUpdate', event => {
      if (event.currentTime > 0) setFirstFrame(true);
    });
    const finish = player.addListener('playToEnd', () => {
      ended.current = true; requested.current = false; setPlaying(false); setStarting(false);
    });
    const background = AppState.addEventListener('change', state => {
      if (state !== 'active') { requested.current = false; setStarting(false); player.pause(); }
    });
    return () => { requested.current = false; progress.remove(); status.remove(); time.remove(); finish.remove(); background.remove(); };
  }, [player]);
  useEffect(() => {
    if (AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
    requested.current = true;
    if (player.status === 'readyToPlay') player.play();
  }, [player]);
  const start = async (fromBeginning = false) => {
    requested.current = true; setStarting(true);
    if (replacing.current) return;
    try {
      if (error || player.status === 'error') { setError(false); await player.replaceAsync(source); }
      if (!requested.current) return;
      if (fromBeginning || ended.current) { ended.current = false; player.replay(); }
      else if (player.status === 'readyToPlay') player.play();
    } catch { requested.current = false; setStarting(false); setError(true); }
  };
  const togglePlayback = () => {
    tapHaptic();
    if (requested.current || playing) { requested.current = false; setStarting(false); player.pause(); }
    else void start();
  };
  return <>
    <View style={s.frame}>
        <VideoView testID="hero-help-video" player={player} style={StyleSheet.absoluteFill} contentFit="contain" nativeControls fullscreenOptions={{ enable: true }} onFirstFrameRender={() => setFirstFrame(true)} />
      {!firstFrame ? <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={poster} style={StyleSheet.absoluteFill} resizeMode="contain" /></View> : null}
      {!tipDismissed ? <View pointerEvents="box-none" style={s.tipLayer}>
        <View testID="hero-help-tip" style={s.tip}>
          <ThemedText style={s.tipText}>{summary}</ThemedText>
          <Pressable testID="hero-help-dismiss-tip" accessibilityRole="button" accessibilityLabel={labels.dismiss} onPress={() => { tapHaptic(); setTipDismissed(true); }} style={s.tipClose} hitSlop={4}>
            <Svg width={16} height={16} viewBox="0 0 20 20" accessible={false}><Path d="M5 5l10 10M15 5 5 15" fill="none" stroke="#50594E" strokeWidth={1.5} strokeLinecap="round" /></Svg>
          </Pressable>
        </View>
      </View> : null}
    </View>
    <View style={s.controls}>
      <Pressable testID="hero-help-video-play" accessibilityRole="button" accessibilityLabel={starting ? labels.loading : playing ? labels.pause : labels.play} accessibilityState={{ busy: starting }} style={s.control} onPress={togglePlayback}>
        {starting ? <ActivityIndicator size="small" color="#343933" /> : <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d={playing ? 'M7 4h3v16H7ZM14 4h3v16h-3Z' : 'M7 3l14 9-14 9Z'} fill="#000000" /></Svg>}
        <ThemedText style={s.controlLabel}>{starting ? labels.loading : playing ? labels.pause : labels.play}</ThemedText>
      </Pressable>
      <Pressable testID="hero-help-video-replay" accessibilityRole="button" accessibilityLabel={labels.replay} style={s.control} onPress={() => { tapHaptic(); void start(true); }}>
        <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}><Path d="M5 8a8 8 0 1 1-1 7M5 3v6h6" stroke="#000000" strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <ThemedText style={s.controlLabel}>{labels.replay}</ThemedText>
      </Pressable>
    </View>
    {error ? <ThemedText accessibilityLiveRegion="polite" style={s.error}>{labels.error}</ThemedText> : null}
  </>;
}
const s = StyleSheet.create({
  root: { gap: 6 },
  modes: { width: '100%', maxWidth: 520, alignSelf: 'center', flexDirection: 'row', gap: 12, justifyContent: 'center' },
  mode: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, paddingTop: 6, gap: 4 },
  modeInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, maxWidth: '100%' },
  label: { flexShrink: 1, fontSize: 13, lineHeight: 18, textAlign: 'center', color: '#687061', includeFontPadding: false },
  labelSelected: { color: '#343933' },
  underlineSlot: { alignSelf: 'stretch', height: 7, marginHorizontal: 2, justifyContent: 'center' },
  underlineSpacer: { alignSelf: 'stretch', height: 7, marginHorizontal: 2 },
  frame: { width: '100%', maxWidth: 320, alignSelf: 'center', aspectRatio: 540 / 960, overflow: 'hidden', borderRadius: 14, backgroundColor: '#F7F6F4' },
  tipLayer: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center' },
  tip: { marginHorizontal: 18, paddingHorizontal: 18, paddingTop: 40, paddingBottom: 24, backgroundColor: '#FFFEF8', borderColor: '#50594E', borderWidth: 0.8, borderRadius: 12 },
  tipText: { color: '#343933', fontSize: 14, lineHeight: 22, textAlign: 'center', flexShrink: 0, alignSelf: 'stretch' },
  tipClose: { position: 'absolute', right: 2, top: 1, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: -4 }, control: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlLabel: { fontSize: 13, color: '#000000' }, error: { fontSize: 13, color: '#934C3C', textAlign: 'center' },
});
