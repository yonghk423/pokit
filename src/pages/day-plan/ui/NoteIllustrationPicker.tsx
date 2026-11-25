import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { controlIllustrationArtwork } from '@shared/ui/icon-symbol/controlIllustrationSources';
import { routineIllustrationSources } from '@shared/ui/icon-symbol/routineIllustrationSources';
import { noteColorIllustrationSources } from '@shared/ui/icon-symbol/noteColorIllustrationSources';
import { ROUTINE_ILLUSTRATIONS, routineIllustrationLabel } from '@shared/lib/routineIllustrationCatalog';
const monoSources = { ...controlIllustrationArtwork, ...routineIllustrationSources };
export const noteSources: Record<string, number> = { ...monoSources, ...noteColorIllustrationSources };
const ids = Object.keys(monoSources);
const labels = new Map(ROUTINE_ILLUSTRATIONS.map(item => [item.id as string, item.labels]));
export function NoteIllustrationPicker({ onSelect, ink }: { onSelect: (id: string) => void; ink: string }) {
  const { t, locale } = useTranslation();
  const [mode, setMode] = useState<'mono' | 'color'>('mono');
  return <View style={{ flex: 1 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'flex-start', paddingLeft: 8 }}>{(['mono', 'color'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={{ minHeight: 44, minWidth: 64, justifyContent: 'center', alignItems: 'center' }}><ThemedText style={{ color: ink, fontSize: 15, opacity: mode === value ? 1 : .6 }}>{t(value === 'mono' ? 'diary.icons.monochrome' : 'diary.icons.color')}</ThemedText></Pressable>)}</View>
    <ScrollView
      testID="note-illustration-grid"
      style={{ flex: 1 }}
      contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}
      nestedScrollEnabled
      keyboardShouldPersistTaps="always">
      {ids.map(item => {
        const id = mode === 'color' ? `color:${item}` : item;
        return <Pressable
          key={item}
          accessibilityRole="button"
          accessibilityLabel={routineIllustrationLabel(labels.get(item), locale) ?? item}
          onPress={() => onSelect(id)}
          style={{ width: '12.5%', height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Image source={noteSources[id]} contentFit="contain" style={{ width: 28, height: 28 }} />
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}
