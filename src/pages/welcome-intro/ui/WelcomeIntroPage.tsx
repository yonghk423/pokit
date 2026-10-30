import { TutorialHeroImage } from './TutorialHeroImage';
import { TutorialSceneBackdrop } from './TutorialSceneBackdrop';
import { requestTutorialReviewOnce } from '../lib/tutorialLifecycle';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { InteractionManager, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDayPlanDraftStore } from '@entities/day-plan';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { openAppStoreWriteReview } from '@shared/lib/support';
import { SettingsPenFrame as PenFrame } from '../../settings/lib/settingsPen';
import { PaperGrain } from '@shared/ui/paper-grain';
import { setTutorialOffPathHandler } from '@shared/ui/tutorial-guide-layer';
import { ThemedText } from '@shared/ui/themed-text';
import { tutorialCopy } from '../lib/tutorialCopy';
import { loadServiceTutorial, useServiceTutorial, type ServiceMode } from '../model/serviceTutorial';
/** Only the introduction and ending live here. All teaching happens in the service UI. */
export function WelcomeIntroPage() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const { locale } = useTranslation(); const c = tutorialCopy(locale);
  const { outro, endReview } = useLocalSearchParams<{ outro?: string; chooseNext?: string; endReview?: string }>();
  const [saved] = useState(loadServiceTutorial);
  const tutorial = useServiceTutorial();
  const { width, height } = useWindowDimensions();
  const availableIntroHeight = Math.max(1, height - insets.top - insets.bottom - 58);
  const introImageHeight = Math.min(280, availableIntroHeight * 0.38, Math.max(1, width - 48) * 1672 / 940);
  const finished = endReview === '1' || (outro === '1' && (saved.step === 'finish' || tutorial.step === 'finish'));
  const reviewRequestedOnEnding = useRef(false);
  const bothCompleted = tutorial.completed.length === 2 || saved.completed.length === 2;
  useFocusEffect(useCallback(() => { setTutorialOffPathHandler(null); }, []));
  useFocusEffect(useCallback(() => {
    if (!finished || (!bothCompleted && endReview !== '1')) return;
    if (reviewRequestedOnEnding.current) return;
    // Request as soon as the route transition settles; no extra delay on the ending screen.
    const task = InteractionManager.runAfterInteractions(() => {
      if (reviewRequestedOnEnding.current) return;
      reviewRequestedOnEnding.current = true;
      void requestTutorialReviewOnce(true, { explicitEnd: endReview === '1' });
    });
    return () => task.cancel();
  }, [finished, bothCompleted, endReview]));

  const serviceTabFor = (mode: ServiceMode) => (mode === 'comic' ? '/(tabs)/comic-day' : '/day-plan');
  const close = () => { tapHaptic(); useDayPlanDraftStore.getState().setPlanMode('priority'); if (router.canGoBack()) router.dismissTo('/(tabs)/comic-day'); else router.replace('/(tabs)/comic-day'); };
  const start = (mode?: ServiceMode) => {
    tapHaptic();
    tutorial.start(mode);
    useDayPlanDraftStore.getState().setPlanMode('priority');
    const resolved = mode ?? useServiceTutorial.getState().mode;
    router.replace(serviceTabFor(resolved));
  };
  const skip = () => {
    tutorial.pause(); close();
  };
  if (!finished) return <View style={[s.screen, { paddingTop: insets.top }]}>
    <View style={s.introHeader}><View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <ThemedText accessibilityRole="header" style={[s.brand, { textAlign: 'left', fontSize: 22 }]}>{locale === 'ko' ? '튜토리얼' : locale === 'ja' ? 'チュートリアル' : locale === 'zh-TW' ? '教學' : 'Tutorial'}</ThemedText>
    </View>{saved.step !== 'finish' && (saved.routineKey || saved.sceneKey) ? <Pressable accessibilityRole="button" onPress={() => start()} style={{ marginRight: 18 }}><ThemedText style={s.small}>{locale === 'ko' ? '이어서' : locale === 'ja' ? '続きから' : locale === 'zh-TW' ? '繼續' : 'Resume'}</ThemedText></Pressable> : null}<Pressable accessibilityRole="button" hitSlop={10} onPress={skip}><ThemedText style={s.small}>{c.skip}</ThemedText></Pressable></View>
    <View style={{ flex: 1 }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[s.content, { paddingTop: 12, paddingBottom: 16, gap: 14 }]}>
        <View style={{ height: introImageHeight, alignItems: 'center', justifyContent: 'center' }}>
          <TutorialSceneBackdrop width={Math.max(1, width - 48)} height={introImageHeight} />
          <TutorialHeroImage width={introImageHeight * 940 / 1672} height={introImageHeight} />
        </View>
        <ThemedText accessibilityRole="header" style={s.heading}>{locale === 'ko' ? '오늘의 주인공은 나' : locale === 'ja' ? '今日の主人公は、あなた' : locale === 'zh-TW' ? '今天的主角是我' : 'You are today’s main character'}</ThemedText>
        <ThemedText style={s.body}>{locale === 'ko' ? '주인공을 고르고, 나의 하루를 장면으로 담아보세요.\n메모와 할 일을 기록하고, 수납장 도구의 메이트 카드로 하루를 챙길 수 있어요.' : locale === 'ja' ? '主人公を選び、一日を場面に残しましょう。メモやタスクを記録し、収納トレイのメイトカードで一日を整えられます。' : locale === 'zh-TW' ? '選一個主角，把一天收成場景。\n記下筆記和待辦，也能用收納工具裡的夥伴卡片照顧這一天。' : 'Choose a character and capture your day in scenes. Add notes and tasks, then use Mate cards in the tray tool to care for your day.'}</ThemedText>

      </ScrollView>
      <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: Math.max(insets.bottom, 16) }}>
        <Pressable accessibilityRole="button" testID="tutorial-start-hero" style={s.button} onPress={() => start('comic')}><PenFrame color="#171510" /><ThemedText style={s.buttonLabel}>{locale === 'ko' ? '시작하기' : locale === 'ja' ? 'はじめる' : locale === 'zh-TW' ? '開始' : 'Start'}</ThemedText></Pressable>
      </View>
    </View>
  </View>;
  return <View style={[s.screen, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
    <PaperGrain opacity={0.35} />
    <Pressable accessibilityRole="button" onPress={skip} style={s.skip}><ThemedText style={s.small}>{c.skip}</ThemedText></Pressable>
    <ScrollView contentContainerStyle={s.content}>
      <ThemedText style={s.brand}>{c.brand}</ThemedText>
      <ThemedText accessibilityRole="header" style={s.heading}>{c.closingTitle}</ThemedText>
      <Pressable accessibilityRole="button" style={[s.button, s.buttonTiltUp]} onPress={() => { tapHaptic(); void openAppStoreWriteReview(); }}><PaperGrain opacity={0.28} /><PenFrame color="#171510" /><ThemedText style={s.buttonLabel}>{c.review}</ThemedText></Pressable>
      <Pressable accessibilityRole="button" style={[s.button, s.buttonTiltDown]} onPress={() => { tapHaptic(); tutorial.pause(); close(); }}><PaperGrain opacity={0.28} /><PenFrame color="#171510" /><ThemedText style={s.buttonLabel}>{c.later}</ThemedText></Pressable>
      <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); router.setParams({ outro: undefined, chooseNext: undefined, endReview: undefined }); }}><ThemedText style={s.small}>{c.replay}</ThemedText></Pressable>
    </ScrollView>
  </View>;
}
const s = StyleSheet.create({ screen: { flex: 1, backgroundColor: '#F5F1E8' }, introHeader: { height: 58, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, skip: { alignSelf: 'flex-end', padding: 20 }, content: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 }, brand: { color: '#000000', fontSize: 22, textAlign: 'center' }, heading: { color: '#000000', fontSize: 30, lineHeight: 42, textAlign: 'center' }, body: { color: '#000000', fontSize: 19, lineHeight: 30 }, buttonLabel: { color: '#000000', fontSize: 19, lineHeight: 30 }, small: { color: '#64645F', fontSize: 14, lineHeight: 23 }, button: { padding: 16, backgroundColor: 'transparent', alignItems: 'center', overflow: 'hidden' }, buttonTiltUp: { transform: [{ rotate: '-0.45deg' }] }, buttonTiltDown: { transform: [{ rotate: '0.4deg' }] } });
