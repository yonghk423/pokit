import { useEffect, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from '@shared/lib/i18n';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { ThemedText } from '@shared/ui/themed-text';
import { loadHeroAiLibrary } from '../lib/heroAiLibrary';
import type { HeroAiResult } from '../lib/heroAiClient';

export function HeroSavedPhotos({ onBack, onApply }: { onBack: () => void; onApply: (images: HeroAiResult[]) => void }) {
  const { t } = useTranslation();
  const [images, setImages] = useState<HeroAiResult[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    void loadHeroAiLibrary().then(value => { if (live) { setImages(value); setStatus('ready'); } }).catch(() => { if (live) setStatus('error'); });
    return () => { live = false; };
  }, [attempt]);
  return <View style={s.root}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => { tapHaptic(); onBack(); }} hitSlop={8} style={s.back}><ThemedText style={s.backIcon}>‹</ThemedText></Pressable><ThemedText style={s.title}>{t('comicDay.saved.title')}</ThemedText></View>
    <ThemedText style={s.hint}>{t('comicDay.saved.hint')}</ThemedText>
    <FlatList data={images} numColumns={3} keyExtractor={item => item.uri} contentContainerStyle={s.list} columnWrapperStyle={s.row}
      ListEmptyComponent={<View style={s.empty}><ThemedText>{t(status === 'loading' ? 'comicDay.saved.loading' : status === 'error' ? 'comicDay.saved.error' : 'comicDay.saved.empty')}</ThemedText>{status === 'error' ? <Pressable onPress={() => { tapHaptic(); setStatus('loading'); setAttempt(value => value + 1); }}><ThemedText>{t('common.retry')}</ThemedText></Pressable> : null}</View>}
      renderItem={({ item }) => { const checked = selected.includes(item.uri); return <Pressable testID="hero-saved-photo" accessibilityRole="checkbox" accessibilityLabel={t('comicDay.saved.photo')} accessibilityState={{ checked }} style={s.photo} onPress={() => { tapHaptic('select'); setSelected(current => checked ? current.filter(uri => uri !== item.uri) : [...current, item.uri]); }}>
        <Image source={{ uri: item.uri }} style={s.image} resizeMode="contain" />{checked ? <><HanddrawnFrame color="#252822" bold /><View style={s.check}><ThemedText>✓</ThemedText></View></> : null}
      </Pressable>; }} />
    <View style={s.footer}><Pressable testID="hero-saved-apply" accessibilityRole="button" disabled={!selected.length} style={[s.apply, !selected.length && { opacity: 0.4 }]} onPress={() => { if (!selected.length) return; tapHaptic('confirm'); onApply(selected.map(uri => images.find(image => image.uri === uri)!)); }}><HanddrawnFrame color="#252822" /><ThemedText>{t('comicDay.saved.apply', { count: selected.length })} →</ThemedText></Pressable></View>
  </View>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: '#F7F6F4' }, header: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5, borderColor: '#CCCBC4' }, back: { width: 56, minHeight: 56, alignItems: 'center', justifyContent: 'center' }, backIcon: { fontSize: 36, lineHeight: 44, color: '#20251F' }, title: { flex: 1, fontSize: 21, lineHeight: 28 }, hint: { padding: 16, fontSize: 13, color: '#73746E' }, list: { padding: 16, gap: 12 }, row: { gap: 10 }, photo: { width: '31%', aspectRatio: 2 / 3, padding: 5 }, image: { width: '100%', height: '100%' }, check: { position: 'absolute', right: 5, top: 5, backgroundColor: '#F7F6F4', paddingHorizontal: 5 }, empty: { paddingVertical: 40, gap: 16, alignItems: 'center' }, footer: { padding: 16, borderTopWidth: 0.5, borderColor: '#CCCBC4' }, apply: { minHeight: 50, justifyContent: 'center', alignItems: 'center' } });
