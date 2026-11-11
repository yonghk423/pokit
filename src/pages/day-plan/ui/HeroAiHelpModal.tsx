import { HeroAiVisualGuide } from './HeroAiVisualGuide';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppModal } from '@shared/ui/app-modal';
import { ThemedText } from '@shared/ui/themed-text';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';

const copy = {
  ko: { title: '이렇게 해봐요', label: 'AI 생성 사용 방법' },
  en: { title: 'Try it like this', label: 'AI creation guide' },
  ja: { title: 'こんなふうに使ってみよう', label: 'AI生成の使い方' },
  'zh-TW': { title: '試試這樣做', label: 'AI 生成使用說明' },
};

export function HeroAiHelpModal({ onClose }: { onClose: () => void }) {
  const { locale, t } = useTranslation();
  const content = copy[locale as keyof typeof copy] ?? copy.ko;
  const close = () => { tapHaptic(); onClose(); };
  return <AppModal transparent animationType="none" onRequestClose={onClose}>
    <View style={s.root}>
      <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} style={StyleSheet.absoluteFill} />
      <View testID="hero-ai-help-modal" accessibilityViewIsModal style={s.paper}>
        <View style={s.heading}><ThemedText accessibilityRole="header" style={s.title}>{content.title}</ThemedText><Pressable testID="hero-ai-help-close" accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} style={s.close}><HanddrawnControl name="xmark" color="#343933" size={22} /></Pressable></View>
        <ScrollView showsVerticalScrollIndicator contentContainerStyle={s.body}>
          <HeroAiVisualGuide locale={locale} />
        </ScrollView>
      </View>
    </View>
  </AppModal>;
}
export function heroAiHelpLabel(locale?: string) { return copy[locale as keyof typeof copy]?.label ?? copy.ko.label; }
const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 48, backgroundColor: 'rgba(25,30,25,0.24)' },
  paper: { width: '100%', maxWidth: 600, alignSelf: 'center', flexShrink: 1, borderRadius: 18, backgroundColor: '#F7F6F1', overflow: 'hidden' },
  heading: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#B7B9AC' },
  title: { flex: 1, color: '#343933', fontSize: 20, lineHeight: 28 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 16 },
});
