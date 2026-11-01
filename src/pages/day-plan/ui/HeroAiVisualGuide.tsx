import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, AppState, Easing, Pressable, StyleSheet, useAnimatedValue, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemedText } from '@shared/ui/themed-text';
import { ComicSceneImage } from './HeroSceneImage';
import { HeroPhotoIcon } from './HeroPhotoSource';
import { HeroGenerateIcon } from './HeroGenerateIcon';
import { PenFrame } from '@shared/ui/pen-frame';

const words = {
  ko: { modes: ['감정과 생각을 일러스트로', '추억을 일러스트로'], steps: ['준비', '일러스트 스타일', '글쓰기', '완성'], hints: ['사진 없이 시작하거나, +로 주인공 사진을 선택해요.', '상단의 원형 스타일을 눌러 일러스트 스타일을 확인해요.', 'Title과 이야기를 적고, 만년필 생성 버튼을 눌러요.', '완성된 카드에서 저장·공유·글 수정을 할 수 있어요.'], photoHint: '상단 사진 아이콘이나 사각형 영역을 눌러 사진을 골라요. 카메라로 촬영해도 좋아요.', photoWrite: '사진과 함께 남길 이야기를 적어요. 원본의 인물·구도를 유지하는 방향으로 일러스트 스타일을 바꿔요.', example: '카페에서 책을 읽던 오후', optional: '선택 사항', source: '원본 사진', result: '완성 예시', details: '자세한 사용 방법', play: '모션 재생', pause: '모션 정지', replay: '다시 보기', tools: ['다운로드', '공유', '글 수정'], toolHints: ['사진 앱에 이미지를 저장해요.', '다른 앱으로 이미지를 보내요.', '제목과 본문을 수정해요.'] },
  en: { modes: ['Draw from text', 'Illustrate a photo'], steps: ['Prepare', 'Style', 'Write', 'Result'], hints: ['Start without a photo, or choose a portrait with +.', 'Tap the round style thumbnail to explore the styles.', 'Write a title and story, then tap the generation pen.', 'Save, share or edit the finished card.'], photoHint: 'Choose a photo with the image icon or preview area, or take one with the camera.', photoWrite: 'Add a story for your photo. This mode aims to keep its people and composition while changing the style.', example: 'An afternoon reading at a café', optional: 'Optional', source: 'Source photo', result: 'Example result', details: 'Detailed instructions', play: 'Play motion', pause: 'Pause motion', replay: 'Replay', tools: ['Download', 'Share', 'Edit'], toolHints: ['Save the image to your photos.', 'Send the image to another app.', 'Edit the title and writing.'] },
  ja: { modes: ['文章から描く', '写真をイラストに'], steps: ['準備', '画風', '書く', '完成'], hints: ['写真なしで始めるか、+で人物写真を選びます。', '丸い画風画像を押して一覧を確認します。', 'Titleと物語を書き、生成の万年筆を押します。', '完成したカードは保存・共有・編集できます。'], photoHint: '写真アイコンや四角い領域から選ぶか、カメラで撮影します。', photoWrite: '写真と残す物語を書きます。人物と構図を保つ方向で画風を変えます。', example: 'カフェで読書した午後', optional: '任意', source: '元の写真', result: '完成イメージ', details: '詳しい使い方', play: '再生', pause: '停止', replay: 'もう一度', tools: ['保存', '共有', '編集'], toolHints: ['端末の写真に保存します。', '他のアプリへ送ります。', 'タイトルと文章を編集します。'] },
  'zh-TW': { modes: ['用文字描繪', '照片轉插畫'], steps: ['準備', '畫風', '寫故事', '完成'], hints: ['不需照片也能開始，或按 + 選人物照片。', '點圓形畫風圖片查看清單。', '輸入 Title 和故事，再按鋼筆生成。', '完成的卡片可下載、分享或編輯。'], photoHint: '點照片圖示或方形預覽選照片，也能用相機拍攝。', photoWrite: '寫下想和照片保留的故事。此模式會盡量保留人物與構圖，同時改變畫風。', example: '在咖啡廳看書的午後', optional: '選填', source: '原始照片', result: '完成示意', details: '詳細使用說明', play: '播放', pause: '暫停', replay: '重播', tools: ['下載', '分享', '編輯'], toolHints: ['儲存到裝置照片。', '傳送到其他應用程式。', '編輯標題和文字。'] },
};
export const visualGuideWords = (locale?: string) => words[locale as keyof typeof words] ?? words.ko;
const art = require('../../../../assets/activity-illustrations/protagonist-1/52-reading-cafe-960.webp');
const ink = '#343933';

function GuideSymbol({ kind, size = 25 }: { kind: 'pen' | 'download' | 'share' | 'edit' | 'arrow'; size?: number }) {
  const paths = { pen: 'm7 25 3-12L24 4l4 4-9 14-12 3Zm0 0 11-11m2-7 5 5', download: 'M16 4v17m-6-6 6 6 6-6M5 22v6h22v-6', share: 'M16 21V3m-6 6 6-6 6 6M10 13H6v15h20V13h-4', edit: 'm6 26 3-9L24 3l5 5-15 15-8 3Zm3-9 5 6M21 6l5 5', arrow: 'M5 16h21m-7-7 7 7-7 7' };
  return <Svg width={size} height={size} viewBox="0 0 32 32" accessible={false}><Path d={paths[kind]} fill="none" stroke={ink} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

/** A local demonstration: no picker, uploads, paid generation or draft mutations. */
export function HeroAiVisualGuide({ locale }: { locale?: string }) {
  const c = visualGuideWords(locale);
  const [mode, setMode] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background');
  const [tool, setTool] = useState<number | null>(null);
  const [replay, setReplay] = useState(0);
  const progress = useAnimatedValue(1);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduced(value); }).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    const state = AppState.addEventListener('change', value => setForeground(value === 'active'));
    return () => { live = false; motion.remove(); state.remove(); };
  }, []);
  useEffect(() => {
    progress.stopAnimation();
    if (reduced || !foreground) { progress.setValue(1); return; }
    if (!playing) return;
    progress.setValue(0);
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(progress, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      Animated.delay(1200),
    ]));
    animation.start();
    return () => animation.stop();
  }, [mode, step, replay, playing, reduced, foreground, progress]);
  const description = mode === 1 && step === 0 ? c.photoHint : mode === 1 && step === 2 ? c.photoWrite : c.hints[step];
  const reveal = progress.interpolate({ inputRange: [0, .45, .8, 1], outputRange: [0, 0, 1, 1] });
  return <View testID="hero-ai-visual-guide" style={s.root}>
    <View style={s.modes}>{c.modes.map((label, index) => <Pressable key={index} testID={`hero-help-mode-${index}`} accessibilityRole="tab" accessibilityState={{ selected: mode === index }} onPress={() => { setMode(index); setStep(0); setTool(null); }} style={[s.mode, mode === index && s.selected]}>
      <PenFrame color={mode === index ? '#719181' : '#A5AA9F'} />
      {index ? <HeroPhotoIcon camera size={23} colored /> : <GuideSymbol kind="pen" size={23} />}
      <ThemedText style={s.modeLabel}>{label}</ThemedText>
    </Pressable>)}</View>
    <View style={s.steps}>{c.steps.map((label, index) => <Pressable key={index} testID={`hero-help-step-${index}`} accessibilityRole="button" accessibilityState={{ selected: step === index }} onPress={() => { setStep(index); setTool(null); }} style={s.step}><View style={[s.number, step === index && s.selected]}><ThemedText style={s.stepNumber}>{index + 1}</ThemedText></View><ThemedText style={[s.stepLabel, step === index && { color: ink }]}>{label}</ThemedText></Pressable>)}</View>
    <View testID={`hero-help-demo-${step}`} accessible accessibilityLabel={description} style={s.demo}>
      {step === 0 ? <View style={s.diagram}>
        <View style={s.source}><HeroPhotoIcon portrait colored size={58} /><ThemedText style={s.caption}>{mode ? c.source : c.optional}</ThemedText></View>
        <Animated.View style={{ opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [.35, 1] }), transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-5, 5] }) }] }}><GuideSymbol kind="arrow" /></Animated.View>
        <View style={s.source}><ComicSceneImage imageKey="help-style:portrait" source={art} contentFit="cover" style={s.avatar} /><Animated.View style={[s.tap, { opacity: reveal }]} /></View>
      </View> : step === 1 ? <View style={s.diagram}>
        <View style={s.styleChoice}><ComicSceneImage imageKey="help-style:choose" source={art} contentFit="cover" style={s.avatar} /><Animated.View style={[s.selectionRing, { opacity: reveal }]} /></View>
        <GuideSymbol kind="arrow" />
        <ComicSceneImage imageKey="help-style:preview" source={art} contentFit="contain" style={s.smallArt} />
      </View> : step === 2 ? <View style={s.notebook}>
        <ThemedText style={s.exampleTitle}>Title</ThemedText>
        <ThemedText numberOfLines={2} style={s.example}>{c.example}</ThemedText>
        {[0, 1].map(index => <View key={index} style={s.rule}><Animated.View style={{ height: 2, width: '75%', backgroundColor: '#69776C', opacity: .5, transformOrigin: 'left', transform: [{ scaleX: progress }] }} /></View>)}
        <View style={s.miniGenerate}><HeroGenerateIcon ink={ink} /><Animated.View style={[s.tap, { opacity: reveal }]} /></View>
      </View> : <View style={s.diagram}>
        <View style={s.source}>{mode ? <HeroPhotoIcon portrait colored size={54} /> : <GuideSymbol kind="pen" size={54} />}</View>
        <GuideSymbol kind="arrow" />
        <View style={s.result}><ComicSceneImage imageKey="help-result:reading" source={art} contentFit="contain" style={s.resultArt} /><Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#EFE8D9', opacity: progress.interpolate({ inputRange: [0, .8, 1], outputRange: [1, 0, 0] }) }]} /><ThemedText style={s.caption}>{c.result}</ThemedText></View>
      </View>}
    </View>
    <View style={s.motionControls}>
      <View style={s.dots}>{c.steps.map((_, index) => <View key={index} style={[s.dot, step === index && { backgroundColor: '#76A898', width: 18 }]} />)}</View>
      {!reduced ? <Pressable testID="hero-help-motion-toggle" accessibilityRole="button" accessibilityLabel={playing ? c.pause : c.play} onPress={() => setPlaying(value => !value)} style={s.motionButton}><ThemedText style={s.motionLabel}>{playing ? 'Ⅱ' : '▷'}</ThemedText></Pressable> : null}
      {!reduced ? <Pressable testID="hero-help-replay" accessibilityRole="button" accessibilityLabel={c.replay} onPress={() => { setPlaying(true); setReplay(value => value + 1); }} style={s.motionButton}><ThemedText style={s.motionLabel}>↻</ThemedText></Pressable> : null}
    </View>
    <ThemedText testID="hero-help-step-description" style={s.description}>{description}</ThemedText>
    {step === 3 ? <><View style={s.tools}>{(['download', 'share', 'edit'] as const).map((kind, index) => <Pressable key={kind} testID={`hero-help-tool-${kind}`} accessibilityRole="button" onPress={() => setTool(index)} style={[s.tool, tool === index && s.selected]}><GuideSymbol kind={kind} /><ThemedText style={s.toolLabel}>{c.tools[index]}</ThemedText></Pressable>)}</View>{tool !== null ? <ThemedText accessibilityLiveRegion="polite" style={s.description}>{c.toolHints[tool]}</ThemedText> : null}</> : null}
  </View>;
}
const s = StyleSheet.create({
  root: { gap: 14 }, modes: { flexDirection: 'row', gap: 8 }, mode: { position: 'relative', flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 6 }, selected: { backgroundColor: '#DCE9DD' }, modeLabel: { color: ink, fontSize: 13, lineHeight: 19 },
  steps: { flexDirection: 'row' }, step: { flex: 1, alignItems: 'center', gap: 4, minHeight: 58 }, number: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#ECEBE4', alignItems: 'center', justifyContent: 'center' }, stepNumber: { fontSize: 13, color: ink, lineHeight: 20 }, stepLabel: { fontSize: 12, color: '#7D8276', lineHeight: 18 },
  demo: { height: 188, backgroundColor: '#F5E8CF', borderRadius: 16, overflow: 'hidden', padding: 16, justifyContent: 'center' }, diagram: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', gap: 8 }, source: { minWidth: 60, alignItems: 'center', gap: 8 }, caption: { fontSize: 10, lineHeight: 16, color: '#687061', textAlign: 'center' }, avatar: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden' }, tap: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#74A38D', backgroundColor: '#74A38D44', right: -2, bottom: 0 }, styleChoice: { padding: 7 }, selectionRing: { ...StyleSheet.absoluteFill, borderWidth: 2, borderColor: '#74A38D', borderRadius: 42 }, smallArt: { width: 90, height: 122 },
  notebook: { flex: 1, paddingHorizontal: 6 }, exampleTitle: { fontSize: 19, lineHeight: 27, color: ink, borderBottomWidth: .5, borderBottomColor: '#8D9384' }, example: { fontSize: 14, lineHeight: 25, color: ink }, rule: { height: 26, borderBottomWidth: .5, borderBottomColor: '#B2B4A8', justifyContent: 'center' }, miniGenerate: { position: 'absolute', right: 0, bottom: 0, width: 44, height: 44 }, result: { alignItems: 'center', borderRadius: 10, overflow: 'hidden' }, resultArt: { width: 104, height: 135 },
  motionControls: { flexDirection: 'row', alignItems: 'center', marginTop: -8 }, dots: { flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center' }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#C3C7BC' }, motionButton: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center' }, motionLabel: { color: ink, fontSize: 24, lineHeight: 30 }, description: { fontSize: 14, lineHeight: 22, color: '#565D51' }, tools: { flexDirection: 'row', gap: 8 }, tool: { flex: 1, minHeight: 68, borderRadius: 12, borderWidth: .5, borderColor: '#B6BAAD', alignItems: 'center', justifyContent: 'center', gap: 5 }, toolLabel: { fontSize: 12, lineHeight: 18, color: ink },
});
