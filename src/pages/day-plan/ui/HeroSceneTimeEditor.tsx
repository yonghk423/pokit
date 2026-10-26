import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppModal } from '@shared/ui/app-modal';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { NativeHhmmWheelPicker } from '@shared/ui/native-hhmm-wheel-picker';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
export function ComicSceneTimeEditor({ label, value, onSave, onCancel }: { label: string; value: string; onSave: (time: string) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value || '09:00');
  return <AppModal visible transparent animationType="fade" onRequestClose={onCancel}>
    <View style={s.overlay}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => { tapHaptic(); onCancel(); }} accessibilityLabel={t('common.cancel')} />
      <View style={s.paper}>
        <PaperGrain opacity={0.25} /><HanddrawnFrame color="#777D73" />
        <ThemedText style={s.title}>{t('comicDay.time')}</ThemedText>
        <ThemedText numberOfLines={2} style={s.label}>{label}</ThemedText>
        <NativeHhmmWheelPicker valueHhmm={draft} onChangeHhmm={setDraft} minuteInterval={1} isDark={false} textColor="#202020" ink="#202020" surface="#FFFFFF" />
        <View style={s.actions}>
          <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); onSave(''); }} style={s.clear}><ThemedText style={s.clearLabel}>{t('comicDay.clearTime')}</ThemedText></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); onCancel(); }} style={s.button}><HanddrawnFrame color="#777D73" /><ThemedText style={s.buttonText}>{t('common.cancel')}</ThemedText></Pressable>
          <Pressable accessibilityRole="button" onPress={() => { tapHaptic('confirm'); onSave(draft); }} style={[s.button, { backgroundColor: '#F3F0E8' }]}><HanddrawnFrame color="#777D73" /><ThemedText style={s.buttonText}>{t('common.save')}</ThemedText></Pressable>
        </View>
      </View>
    </View>
  </AppModal>;
}
const s = StyleSheet.create({ overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.18)', padding: 20 }, paper: { width: '100%', maxWidth: 370, padding: 18, backgroundColor: '#FFFFFF' }, title: { fontSize: 21, color: '#202020' }, label: { fontSize: 13, color: '#666', marginTop: 5, marginBottom: 10 }, actions: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 12 }, clear: { flex: 1, minHeight: 40, justifyContent: 'center' }, clearLabel: { fontSize: 12, color: '#666' }, button: { minWidth: 58, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 }, buttonText: { color: '#202020', fontSize: 14 } });
