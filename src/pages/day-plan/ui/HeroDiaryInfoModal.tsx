import { Pressable, StyleSheet, View } from 'react-native';
import { AppModal } from '@shared/ui/app-modal';
import { ThemedText } from '@shared/ui/themed-text';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { PenFrame } from '@shared/ui/pen-frame';
import { useTranslation } from '@shared/lib/i18n';

const copy = {
  ko: { title: '그날의 장면을 기록해요', description: '좋아하는 주인공을 선택하고, 좋아하는 장면과 함께 그날의 감정과 생각을 적어보세요. 멋진 하루가 될 거예요.', label: '오늘의 주인공 안내' },
  en: { title: 'Keep a scene from today', description: 'Choose a protagonist you like, then write how you felt that day alongside a scene you love.', label: 'About Today’s Mate' },
  ja: { title: '今日のワンシーンを残そう', description: '好きな主人公を選び、お気に入りのシーンと一緒に、その日の気持ちを書き留めましょう。', label: '今日の主人公について' },
  'zh-TW': { title: '記下今天的片刻', description: '選擇喜歡的主角，搭配喜愛的場景，寫下當天的心情。', label: '關於今日主角' },
};

export function heroDiaryInfoCopy(locale?: string) {
  return copy[locale as keyof typeof copy] ?? copy.ko;
}

export function HeroDiaryInfoModal({ onClose }: { onClose: () => void }) {
  const { locale, t } = useTranslation();
  const content = heroDiaryInfoCopy(locale);
  return <AppModal transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.root}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={StyleSheet.absoluteFill} />
      <View testID="hero-diary-info-modal" accessibilityViewIsModal style={s.paper}>
        <PenFrame color="#343933" />
        <View style={s.heading}>
          <ThemedText accessibilityRole="header" style={s.title}>{content.title}</ThemedText>
          <Pressable testID="hero-diary-info-close" accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} style={s.close}><HanddrawnControl name="xmark" color="#343933" size={22} /></Pressable>
        </View>
        <ThemedText style={s.description}>{content.description}</ThemedText>
      </View>
    </View>
  </AppModal>;
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 48, backgroundColor: 'rgba(25,30,25,0.24)' },
  paper: { position: 'relative', width: '100%', maxWidth: 460, alignSelf: 'center', backgroundColor: '#F7F6F1', overflow: 'hidden', padding: 4 },
  heading: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 4, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#B7B9AC' },
  title: { flex: 1, color: '#343933', fontSize: 20, lineHeight: 28 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  description: { paddingHorizontal: 16, paddingVertical: 18, color: '#50564D', fontSize: 16, lineHeight: 26 },
});
