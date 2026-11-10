import Svg, { Path } from 'react-native-svg';
import { useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';
import { useTranslation } from '@shared/lib/i18n';
import { HeroPolaroidSurface } from './HeroPolaroidSurface';
import { HeroPhotoPreview } from './HeroPhotoPreview';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { formatHeroPolaroidDate } from './HeroPolaroidExport';
import { HeroShutterSave } from './HeroShutterSave';

export const photoDiaryLabels = {
  ko: ['오늘의 폴라로이드', '사진 · 앞면', '이야기 · 뒷면', '사진 한 장 더하기', '짧게 남기는 한마디', '이 순간을 기억하며', '오늘의 이야기를 적어보세요.', '사진 앞에는 한마디, 뒤에는 나의 이야기.', '오늘의 한 장 저장'],
  en: ['Today’s Polaroid', 'Photo · Front', 'Story · Back', 'Add a photo', 'A few words for this moment', 'Remembering this moment', 'Write your story here.', 'A few words in front, your story on the back.', 'Save this moment'],
  ja: ['今日のポラロイド', '写真 · 表', '物語 · 裏', '写真を追加', 'この瞬間にひとこと', 'この瞬間を思い出して', '今日の物語を自由に書いてください。', '表にひとこと、裏には私の物語。', '今日の一枚を保存'],
  'zh-TW': ['今天的拍立得', '照片 · 正面', '故事 · 背面', '新增一張照片', '為這一刻留一句話', '記住這一刻', '自由寫下今天的故事。', '正面一句話，背面是我的故事。', '儲存今天的一張'],
};

export function HeroPhotoDiaryComposer({ uri, title, memo, busy, error, ink, onPick, onTitleChange, onMemoChange, onSave, hideSave = false, printFrame }: {
  printFrame?: { width: number; height: number; photoWidth: number; photoHeight: number; scale: number }; hideSave?: boolean; uri?: string; title: string; memo: string; busy: boolean; error: string | null; ink: string;
  onPick: () => void; onTitleChange: (value: string) => void; onMemoChange: (value: string) => void; onSave: () => void;
}) {
  const { locale } = useTranslation();
  const copy = photoDiaryLabels[locale as keyof typeof photoDiaryLabels] ?? photoDiaryLabels.en;
  const [back, setBack] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const flipping = useRef(false);
  const flip = () => {
    if (flipping.current || busy) return;
    Keyboard.dismiss();
    flipping.current = true;
    const next = !back;
    setBack(next);
    Animated.timing(rotation, { toValue: next ? 180 : 0, duration: 520, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start(() => { flipping.current = false; });
  };
  const [date] = useState(() => formatHeroPolaroidDate());
  return <View testID="hero-original-photo-tab" style={s.root}>
    <Pressable testID="hero-photo-flip" accessibilityRole="button" accessibilityLabel={copy[back ? 1 : 2]} accessibilityState={{ expanded: back }} disabled={busy} onPress={flip} style={{ alignSelf: 'flex-start', width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}>
      <Svg width={30} height={30} viewBox="0 0 32 32" accessible={false}>
        <Path d="M4 11.5 13 10l2.5 17-9 1.5Z M6.3 14l4.8-.8 1.2 8.3-4.8.8Z" fill="none" stroke={ink} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="m19 10 9 1.5-2.5 17-9-1.5Z m1.6 5 4.5.7 m-5 3 4.5.7 m-5 3 3 .5" fill="none" stroke={ink} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M8 7C11 1.8 21 1.8 24 7 m-4-1 4 1 .6-4" fill="none" stroke={ink} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
    <View style={[s.stage, printFrame && { justifyContent: 'center', paddingHorizontal: 0, paddingBottom: 0 }]}>
      <Animated.View testID="hero-photo-print" style={[s.print, printFrame && { flex: 0, width: printFrame.width, height: printFrame.height, maxWidth: undefined, paddingHorizontal: 18 * printFrame.scale, paddingTop: 28 * printFrame.scale, paddingBottom: 20 * printFrame.scale }, { padding: 0, paddingBottom: 0, backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 }]}>
        <Animated.View pointerEvents={back ? 'none' : 'auto'} testID="hero-photo-front" style={[StyleSheet.absoluteFill, s.face, printFrame && { paddingHorizontal: 18 * printFrame.scale, paddingTop: 28 * printFrame.scale, paddingBottom: 20 * printFrame.scale }, { transform: [{ perspective: 1200 }, { rotateY: rotation.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] }) }] }]} accessibilityElementsHidden={back} importantForAccessibility={back ? 'no-hide-descendants' : 'auto'}>
          <HeroPolaroidSurface />
          <Pressable testID="hero-original-photo-picker" accessibilityRole="button" accessibilityLabel={copy[3]} disabled={busy} onPress={onPick} style={[s.photo, printFrame && { flex: 0, width: printFrame.photoWidth, height: printFrame.photoHeight }]}>
            {uri ? <HeroPhotoPreview uri={uri} resizeMode="contain" style={StyleSheet.absoluteFill} /> : <View style={s.placeholder}><HanddrawnControl name="plus" color={ink} size={34} /></View>}
            {busy ? <ActivityIndicator color="#3D4936" style={StyleSheet.absoluteFill} /> : null}
          </Pressable>
          <ThemedTextInput testID="hero-inline-title" accessibilityLabel={copy[4]} placeholder={copy[4]} placeholderTextColor="#7A8074" editable={!busy} value={title} onChangeText={onTitleChange} maxLength={80} style={[s.title, printFrame && { height: 38 * printFrame.scale, fontSize: 21 * printFrame.scale, paddingVertical: 4 * printFrame.scale, paddingHorizontal: 4 * printFrame.scale }]} />
        <ThemedText testID="hero-photo-date" allowFontScaling={false} style={[s.date, printFrame && { marginTop: 0, fontSize: 14 * printFrame.scale, lineHeight: 20 * printFrame.scale }]}>{date}</ThemedText>
        </Animated.View>
        <Animated.View pointerEvents={back ? 'auto' : 'none'} testID="hero-photo-back" style={[StyleSheet.absoluteFill, s.face, printFrame && { paddingHorizontal: 18 * printFrame.scale, paddingTop: 28 * printFrame.scale, paddingBottom: 20 * printFrame.scale }, { transform: [{ perspective: 1200 }, { rotateY: rotation.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] }) }] }]} accessibilityElementsHidden={!back} importantForAccessibility={back ? 'auto' : 'no-hide-descendants'}>
          <HeroPolaroidSurface />
          <View style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}><View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({ length: 9 }, (_, index) => <View key={index} style={[s.rule, printFrame && { height: 30 * printFrame.scale }]} />)}</View>
          <ThemedTextInput testID="hero-inline-story" accessibilityLabel={copy[6]} placeholder={copy[6]} placeholderTextColor="#7A8074" editable={!busy} value={memo} onChangeText={onMemoChange} maxLength={4000} multiline scrollEnabled textAlignVertical="top" style={[s.memo, printFrame && { fontSize: 17 * printFrame.scale, lineHeight: 30 * printFrame.scale }]} /></View>
        <ThemedText testID="hero-photo-back-date" allowFontScaling={false} style={[s.date, printFrame && { marginTop: 0, fontSize: 14 * printFrame.scale, lineHeight: 20 * printFrame.scale }]}>{date}</ThemedText>
        </Animated.View>

      </Animated.View>
      {error ? <ThemedText accessibilityLiveRegion="polite" style={{ color: '#934C3C' }}>{error}</ThemedText> : null}
    </View>
    {!hideSave ? <HeroShutterSave disabled={!uri || busy} busy={busy} photoUri={uri} label={copy[8]} onPress={onSave} /> : null}
  </View>;
}
const s = StyleSheet.create({
  face: { backfaceVisibility: 'hidden', backgroundColor: '#FAF9F4', padding: 14, paddingBottom: 20, shadowColor: '#34382E', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 1, height: 6 }, elevation: 3 },
  root: { flex: 1, minHeight: 0 }, heading: { fontSize: 20, textAlign: 'center', marginBottom: 12 },
  tabs: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 18 }, tab: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 28 }, selected: { backgroundColor: '#E1E7DC' },
  stage: { flex: 1, minHeight: 0, alignItems: 'center', paddingHorizontal: 2, paddingBottom: 8, gap: 6 },
  print: { flex: 1, minHeight: 0, width: '100%', maxWidth: 520, padding: 14, paddingBottom: 20, backgroundColor: '#FAF9F4', shadowColor: '#34382E', shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 1, height: 6 }, elevation: 3 },
  photo: { flex: 1, minHeight: 0, width: '100%', backgroundColor: '#E4E4E4', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, placeholder: { alignItems: 'center', gap: 16 }, pickLabel: { color: '#333D32', fontSize: 20 },
  title: { color: '#30362E', fontSize: 21, height: 54, paddingVertical: 8, paddingHorizontal: 4 },
  back: { flex: 1, minHeight: 0, paddingHorizontal: 10, paddingTop: 8, overflow: 'hidden' }, backHeading: { color: '#30362E', fontSize: 19, marginBottom: 12 },
  memo: { flex: 1, color: '#30362E', fontSize: 17, lineHeight: 30, padding: 0 }, rule: { height: 30, borderBottomWidth: 0.5, borderColor: '#B2B5A9' },
  date: { color: '#61685A', textAlign: 'right', fontSize: 14, lineHeight: 20, marginTop: 8 }, hint: { fontSize: 14, lineHeight: 20, textAlign: 'center', opacity: 0.75 },
  save: { width: 52, height: 52, flexShrink: 0, alignSelf: 'flex-end', justifyContent: 'center', alignItems: 'center', marginTop: 12, marginBottom: 8 },
});
