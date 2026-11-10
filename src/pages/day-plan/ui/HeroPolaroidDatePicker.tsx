import { useTranslation } from '@shared/lib/i18n';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppModal } from '@shared/ui/app-modal';
import { ThemedText } from '@shared/ui/themed-text';
import { formatHeroPolaroidDate } from './HeroPolaroidExport';

export function HeroPolaroidDatePicker({ date, showDate, onSelect, onHide, onClose }: {
  date: string; showDate: boolean; onSelect: (date: string) => void; onHide: () => void; onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  // Parse local calendar components explicitly: dotted dates are not portable Date inputs.
  const parts = date.match(/^(\d{4})[.\-/]\s*(\d{1,2})[.\-/]\s*(\d{1,2})/);
  const selected = parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : new Date();
  const [month, setMonth] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));
  const year = month.getFullYear(), m = month.getMonth();
  const start = month.getDay(), count = new Date(year, m + 1, 0).getDate();
  const action = { minHeight: 44, justifyContent: 'center' as const, alignItems: 'center' as const };
  return <AppModal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#00000066' }}>
      <Pressable accessibilityLabel={t('polaroid.editor.close_date_picker')} onPress={onClose} style={{ position: 'absolute', inset: 0 }} />
      <View accessibilityViewIsModal style={{ width: '100%', maxWidth: 380, alignSelf: 'center', backgroundColor: '#F9F9F6', borderRadius: 20, padding: 16 }}>
        <ThemedText style={{ fontSize: 20, textAlign: 'center', marginBottom: 8 }}>{t('polaroid.editor.date_on_photo')}</ThemedText>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable testID="polaroid-date-previous" accessibilityRole="button" accessibilityLabel={t('polaroid.editor.previous_month')} onPress={() => setMonth(new Date(year, m - 1, 1))} style={{ ...action, width: 44 }}><ThemedText>‹</ThemedText></Pressable>
          <ThemedText>{month.toLocaleDateString(locale, { year: 'numeric', month: 'long' })}</ThemedText>
          <Pressable testID="polaroid-date-next" accessibilityRole="button" accessibilityLabel={t('polaroid.editor.next_month')} onPress={() => setMonth(new Date(year, m + 1, 1))} style={{ ...action, width: 44 }}><ThemedText>›</ThemedText></Pressable>
        </View>
        <View style={{ flexDirection: 'row' }}>{Array.from({ length: 7 }, (_, i) => new Date(2026, 10, 1 + i).toLocaleDateString(locale, { weekday: 'short' })).map(day => <ThemedText key={day} style={{ width: '14.2857%', textAlign: 'center', fontSize: 13, color: '#777', paddingVertical: 8 }}>{day}</ThemedText>)}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: 42 }, (_, index) => {
            const day = index - start + 1;
            if (day < 1 || day > count) return <View key={index} style={{ width: '14.2857%', height: 44 }} />;
            const value = formatHeroPolaroidDate(new Date(year, m, day));
            const active = showDate && selected.getFullYear() === year && selected.getMonth() === m && selected.getDate() === day;
            return <Pressable key={index} testID={`polaroid-date-day-${day}`} accessibilityRole="button" accessibilityLabel={value} accessibilityState={{ selected: active }} onPress={() => onSelect(value)} style={{ ...action, width: '14.2857%', borderRadius: 22, backgroundColor: active ? '#292D28' : 'transparent' }}><ThemedText style={{ color: active ? '#FFF' : '#292D28' }}>{day}</ThemedText></Pressable>;
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 }}>
          <Pressable testID="polaroid-date-today" accessibilityRole="button" onPress={() => onSelect(formatHeroPolaroidDate())} style={action}><ThemedText>{t('polaroid.editor.today')}</ThemedText></Pressable>
          <Pressable testID="polaroid-date-hide" accessibilityRole="button" onPress={onHide} style={action}><ThemedText>{t('polaroid.editor.hide_date')}</ThemedText></Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} style={action}><ThemedText>{t('polaroid.editor.close')}</ThemedText></Pressable>
        </View>
      </View>
    </View>
  </AppModal>;
}
