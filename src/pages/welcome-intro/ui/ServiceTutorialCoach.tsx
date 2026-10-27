import { MateTutorialGuide, MATE_GUIDE_HEIGHT } from './MateTutorialGuide';
import { TutorialPenHighlight } from './TutorialPenHighlight';
import { TutorialCompletion } from './TutorialCompletion';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { InteractionManager, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppAlert, useAppAlertStore } from '@shared/lib/app-alert';
import { useTranslation } from '@shared/lib/i18n';
import { clearTutorialOffPathHandler, setTutorialOffPathHandler, useTutorialGuideLayer, type GuideFrame } from '@shared/ui/tutorial-guide-layer';
import { ThemedText } from '@shared/ui/themed-text';
import { useServiceTutorial, tutorialStepProgress, type ServiceStep } from '../model/serviceTutorial';
import { tutorialCopy } from '../lib/tutorialCopy';
/** The guide waits until the destination screen has finished appearing. */
let settledRunId: string | null = null;
export function ServiceTutorialCoach({ steps, scenePicker = false, characterChoosing = false, onSkip, onSkipStep, onEnd }: { steps: ServiceStep[]; scenePicker?: boolean; characterChoosing?: boolean; onSkip?: () => void; onSkipStep?: () => void; onEnd?: () => void }) {
  const state = useServiceTutorial();
  const { locale } = useTranslation(); const c = tutorialCopy(locale); const router = useRouter();
  const hasComicSteps = steps.some(step => step.startsWith('comic'));
  const hasRhythmSteps = steps.some(step => step.startsWith('rhythm'));
  const modeMatches = hasComicSteps ? state.mode === 'comic' : hasRhythmSteps ? state.mode === 'rhythm' : true;
  const visible = state.active && modeMatches && steps.includes(state.step);
  const routedFinish = useRef<string | null>(null);
  const success = state.step === 'rhythmSuccess' || state.step === 'comicSuccess';
  const finishCelebration = useCallback(() => {
    const current = useServiceTutorial.getState();
    if (!current.active || !['rhythmSuccess', 'comicSuccess'].includes(current.step)) return;
    current.nextMode();
    const finished = useServiceTutorial.getState().step === 'finish';
    if (finished) router.replace({ pathname: '/welcome-intro', params: { outro: '1' } });
  }, [router]);
  useEffect(() => {
    const run = state.runId ?? 'legacy';
    if (!visible || state.step !== 'finish' || routedFinish.current === run) return;
    const timer = setTimeout(() => { routedFinish.current = run; router.push({ pathname: '/welcome-intro', params: { outro: '1' } }); }, 500);
    return () => clearTimeout(timer);
  }, [visible, state.step, state.runId, router]);
  const ko = locale === 'ko'; const ja = locale === 'ja'; const zh = locale === 'zh-TW';
  const copy: Record<ServiceStep, string> = {
    comicTools: ko ? '수납장 아이콘을 눌러보세요. 주인공의 하루를 챙기는 메이트 카드가 들어 있어요.' : ja ? '収納トレイを押しましょう。主人公の一日を支えるメイトカードがあります。' : zh ? '點一下收納工具。裡面有照顧主角這一天的夥伴卡片。' : 'Tap the tray tool. Mate cards help you care for your character’s day.',
    rhythmTemplate: ko ? '기록 방식을 고르고 만들기를 눌러요.' : ja ? '記録方法を選んで作成しましょう。' : zh ? '選好記錄方式，再按建立。' : 'Choose a record type and press Create.',
    comicCharacter: ko ? '함께할 주인공을 골라주세요.' : ja ? '主人公を選びましょう。' : zh ? '選一個要一起的主角。' : 'Choose your character.',
    comicName: ko ? '주인공의 이름을 적어주세요.' : ja ? '主人公の名前を書きましょう。' : zh ? '寫下主角的名字。' : 'Enter your character’s name.',
    comicReady: ko ? '아래 시작하기를 눌러요.' : ja ? '下の開始を押しましょう。' : zh ? '按下面的開始。' : 'Press Start below.',
    comicReturn: ko ? '장면이 담겼어요. 아래 시작 버튼을 눌러요.' : ja ? '下の開始で戻りましょう。' : zh ? '場景放好了。按下面的開始。' : 'Scene added. Press Start below.',

    rhythmAdd: ko ? '카드 그리드의 +를 눌러 메이트를 추가해요.' : ja ? 'カード一覧の＋からメイトを追加しましょう。' : zh ? '按卡片清單的 + 來新增夥伴。' : 'Tap + in the card grid to add a Mate.',
    rhythmPicker: ko ? '왼쪽 위 +로 새 메이트를 만들어요.' : ja ? '左上の＋から新しいカードを作りましょう。' : zh ? '用左上角的 + 做一張新夥伴卡片。' : 'Tap the create-card + at the top left.',
    rhythmForm: ko ? '이름을 적고 다음을 눌러요.' : ja ? '名前と記録方法を選んで、カードを作りましょう。' : zh ? '寫下名字，再按下一步。' : 'Choose a name and a record type, then create your card.',
    rhythmOpen: ko ? (state.routineKey ? '만든 카드 어디든 눌러 열어보세요.' : '메이트를 만들면 카드를 눌러 열 수 있어요.') : ja ? '作ったカードを押して開きましょう。' : zh ? (state.routineKey ? '點一下做好的卡片，把它打開。' : '做好夥伴之後，點卡片就能打開。') : 'Tap your new mate to open it.',
    rhythmRecord: ko ? '둘러본 뒤 × 또는 닫기로 닫으면 완료예요. 입력은 선택이에요.' : ja ? '書いて操作してみたら、×か閉じるボタンを押してください。' : zh ? '看過之後按 × 或關閉就完成。輸入可以稍後再寫。' : 'Try writing and tapping around, then press × or Close when you’re done.',
    rhythmCheck: c.rhythmSuccess,
    rhythmSuccess: c.rhythmSuccess,
    comicStart: characterChoosing ? (ko ? '주인공을 고르고 이름을 적은 뒤, 시작하기를 눌러주세요.' : ja ? '主人公を選び、名前を書いたら開始を押してください。' : zh ? '選好主角、寫下名字，再按開始。' : 'Choose a character, enter a name, then press Start.') : (ko ? '그림 아래 +로 첫 장면을 담아요.' : ja ? '絵の下の＋から、最初の場面を作りましょう。' : zh ? '按圖下面的 +，留下第一個場景。' : 'Tap + below the picture to create your first scene.'),
    comicPick: ko ? '담고 싶은 장면을 눌러주세요.' : ja ? '好きな場面を選んだら、下の開始ボタンを押しましょう。' : zh ? '點一個想留下的場景。' : 'Choose a scene, then use the Start button below to return.',
    comicOpen: c.comicOpen,
    comicMemo: ko ? '둘러본 뒤 × 또는 닫기로 닫으면 완료예요. 기록은 나중에 해도 좋아요.' : ja ? '書いて操作してみたら、×か閉じるボタンを押してください。' : zh ? '看過之後按 × 或關閉就完成。紀錄可以稍後再寫。' : 'Try writing and tapping around, then press × or Close when you’re done.',
    comicTask: ko ? '둘러본 뒤 × 또는 닫기로 닫으면 완료예요. 기록은 나중에 해도 좋아요.' : ja ? '書いて操作してみたら、×か閉じるボタンを押してください。' : zh ? '看過之後按 × 或關閉就完成。紀錄可以稍後再寫。' : 'Try writing and tapping around, then press × or Close when you’re done.',
    comicCheck: ko ? '둘러본 뒤 × 또는 닫기로 닫으면 완료예요. 기록은 나중에 해도 좋아요.' : ja ? '書いて操作してみたら、×か閉じるボタンを押してください。' : zh ? '看過之後按 × 或關閉就完成。紀錄可以稍後再寫。' : 'Try writing and tapping around, then press × or Close when you’re done.',
    comicSuccess: c.comicSuccess,
    comicWeather: ko ? '날씨 아이콘을 눌러 오늘의 날씨 정보를 확인해보세요.' : ja ? '天気アイコンを押して、今日の天気を確認しましょう。' : zh ? '點天氣圖示，看看今天的天氣。' : 'Tap the weather icon to see today’s weather.',
    finish: c.closingBody,
  };
  const { current, total } = tutorialStepProgress(state.mode, state.step);
  const instruction = copy[state.step];
  const lead = ko ? `${current}번째!` : ja ? `${current}番目！` : zh ? `第${current}步！` : `Step ${current}.`;
  const layer = useTutorialGuideLayer();
  const guideId = useId();
  const [guideHeight, setGuideHeight] = useState(0);
  const runKey = state.runId ?? 'legacy';
  const [arrived, setArrived] = useState(() => settledRunId === runKey);
  const settled = arrived || settledRunId === runKey;
  const present = visible && settled;
  useEffect(() => {
    if (!visible || success || state.step === 'finish') return;
    if (settledRunId === runKey) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const began = Date.now();
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        if (!live) return;
        settledRunId = runKey;
        setArrived(true);
      }, Math.max(0, 640 - (Date.now() - began)));
    });
    return () => { live = false; task.cancel(); if (timer) clearTimeout(timer); };
  }, [visible, success, state.step, runKey]);
  const progress = `${current}/${total}`;
  const guideText = `${lead} ${instruction}`;
  const goToOutro = useCallback(() => {
    useServiceTutorial.getState().pause();
    onEnd?.();
    const open = () => router.push({ pathname: '/welcome-intro', params: { outro: '1', endReview: '1' } });
    // A sheet still dismissing would present the review on top of itself. Close it first.
    if (onEnd) setTimeout(open, 420);
    else open();
  }, [onEnd, router]);
  const endTutorial = goToOutro;
  const askToEnd = useCallback(() => {
    if (useAppAlertStore.getState().queue.length > 0) return;
    AppAlert.alert(c.endTitle, c.endBody, [
      { text: c.endStay, style: 'cancel' },
      { text: c.endConfirm, style: 'destructive', onPress: goToOutro },
    ]);
  }, [c.endTitle, c.endBody, c.endStay, c.endConfirm, goToOutro]);
  const skipToNext = useCallback(() => {
    const current = useServiceTutorial.getState();
    if (!current.active || current.step === 'finish') return;
    // Modal steps finish only after their native dismissal callback.
    if (onSkip) { onSkip(); return; }
    const openingTools = current.step === 'comicTools';
    current.skipStep();
    if (openingTools) router.push('/day-plan');
    onSkipStep?.();
  }, [onSkip, onSkipStep, router]);
  const guarding = visible && !success && state.step !== 'finish';
  useEffect(() => {
    if (!guarding) return;
    setTutorialOffPathHandler(askToEnd);
    return () => clearTutorialOffPathHandler(askToEnd);
  }, [guarding, askToEnd]);
  const renderGuide = useCallback((frame: GuideFrame) => {
      const width = Math.min(360, frame.width - 24);
      const height = Math.max(guideHeight, MATE_GUIDE_HEIGHT);
      const top = Math.min(160, frame.height * 0.19);
      const bottom = Math.max(top, frame.height - 96 - height);
      const target = frame.target;
      const above = target ? target.y - height - 12 : top;
      const below = target ? target.y + target.height + 12 : top;
      const closingMate = state.mode === 'rhythm' && ['rhythmRecord', 'rhythmCheck'].includes(state.step);
      const y = closingMate ? Math.max(top, Math.min(bottom, (frame.height - height) / 2)) : above >= top ? Math.min(above, bottom) : below <= bottom ? Math.max(top, below) : top;
      return <>
      {target ? <TutorialPenHighlight target={target} width={frame.width} height={frame.height} /> : null}
      <View collapsable={false} pointerEvents="box-none" onLayout={event => {
        const height = event.nativeEvent.layout.height;
        if (height > 0) setGuideHeight(current => Math.abs(current - height) < 1 ? current : height);
      }} style={{ position: 'absolute', left: Math.max(12, (frame.width - width) / 2), top: y, width }}>
        <MateTutorialGuide text={guideText} progress={progress} later={c.skip} end={c.endConfirm} onEnd={endTutorial} thinking={state.step === 'rhythmForm'} onPause={skipToNext} />
      </View></>;
  }, [guideHeight, guideText, progress, c.skip, c.endConfirm, state.step, state.mode, skipToNext, endTutorial]);
  useEffect(() => {
    if (!present || success || state.step === 'finish' || !layer) {
      layer?.hide(guideId);
      return;
    }
    layer.show({ id: guideId, render: renderGuide });
    return () => layer.hide(guideId);
  }, [present, success, state.step, state.mode, layer, guideId, renderGuide]);
  if (!visible) return null;
  if (success) return <TutorialCompletion mode={state.mode} completedCount={new Set([...state.completed, state.mode]).size} onComplete={finishCelebration} />;

  if (state.step === 'finish') return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/welcome-intro', params: { outro: '1' } })}><ThemedText>{c.start}</ThemedText></Pressable>;
  return null;
}
