import { useRef, useState } from 'react';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { ThemedText } from '@shared/ui/themed-text';
import type { HeroAiResult } from '../lib/heroAiClient';
import { HeroImageActions } from './HeroImageActions';

export function HeroResultGallery({ images }: { images: HeroAiResult[] }) {
  const { t } = useTranslation();
  const [columns, setColumns] = useState(images.length > 1 ? 3 : 1);
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState({ width: 320, height: 400 });
  const pager = useRef<FlatList<HeroAiResult>>(null);
  const go = (next: number) => {
    if (next < 0 || next >= images.length) return;
    tapHaptic('select'); setIndex(next); pager.current?.scrollToIndex({ index: next, animated: true });
  };
  const imageHeight = Math.max(80, size.height - 62);
  const cardWidth = Math.max(1, (size.width - 32 - (columns - 1) * 10) / columns);
  return <View style={s.root}>
    <View style={s.toolbar}>
      {([3, 2, 1] as const).map(value => <Pressable key={value} testID={`hero-result-view-${value}`} accessibilityRole="tab" accessibilityLabel={t(value === 3 ? 'comicDay.viewSmall' : value === 2 ? 'comicDay.viewTwo' : 'comicDay.viewOne')} accessibilityState={{ selected: columns === value }} onPress={() => { tapHaptic('select'); setColumns(value); }} style={s.mode}>
        {columns === value ? <HanddrawnFrame color="#343B32" /> : null}
        <Svg width={20} height={20} viewBox="0 0 20 20" accessible={false}>{Array.from({ length: value === 3 ? 9 : value }, (_, i) => {
          const n = value === 3 ? 3 : value; const width = (16 - (n - 1) * 2) / n;
          return <Rect key={i} x={2 + i % n * (width + 2)} y={value === 3 ? 2 + Math.floor(i / n) * (width + 2) : 3} width={width} height={value === 3 ? width : 14} fill="none" stroke="#343B32" strokeWidth={1} />;
        })}</Svg>
      </Pressable>)}
    </View>
    <View testID="hero-result-viewport" style={s.viewport} onLayout={({ nativeEvent: { layout } }) => { if (layout.width > 0 && layout.height > 0) setSize(previous => previous.width === layout.width && previous.height === layout.height ? previous : { width: layout.width, height: layout.height }); }}>
      {columns === 1 ? <FlatList key={`pager-${size.width}-${size.height}`} ref={pager} testID="hero-result-pager" horizontal pagingEnabled showsHorizontalScrollIndicator={false} data={images} initialScrollIndex={index} keyExtractor={image => image.uri} getItemLayout={(_, itemIndex) => ({ length: size.width, offset: size.width * itemIndex, index: itemIndex })} onMomentumScrollEnd={({ nativeEvent }) => { const next = Math.max(0, Math.min(images.length - 1, Math.round(nativeEvent.contentOffset.x / size.width))); setIndex(next); }} renderItem={({ item, index: page }) => <View style={{ width: size.width, paddingHorizontal: 16 }}>
        <Image testID="hero-result-large-image" source={{ uri: item.uri }} resizeMode="contain" style={{ width: '100%', height: imageHeight }} />
        <View style={s.pageActions}>
          <View style={s.navigation}>
            <Pressable testID={`hero-result-previous-${page}`} accessibilityRole="button" accessibilityLabel={t('common.back')} disabled={page === 0} onPress={() => go(page - 1)} style={[s.arrow, page === 0 && s.disabled]}><ThemedText style={s.arrowText}>‹</ThemedText></Pressable>
            <ThemedText style={s.count}>{page + 1} / {images.length}</ThemedText>
            <Pressable testID={`hero-result-next-${page}`} accessibilityRole="button" accessibilityLabel={t('common.next')} disabled={page === images.length - 1} onPress={() => go(page + 1)} style={[s.arrow, page === images.length - 1 && s.disabled]}><ThemedText style={s.arrowText}>›</ThemedText></Pressable>
          </View>
          <HeroImageActions uri={item.uri} />
        </View>
      </View>} /> : <ScrollView testID="hero-result-grid" contentContainerStyle={s.grid}>
        {images.map((image, itemIndex) => <View key={image.uri} style={{ width: cardWidth }}>
          <Pressable testID={`hero-result-open-${itemIndex}`} accessibilityRole="button" accessibilityLabel={`${t('comicDay.viewOne')} ${itemIndex + 1}`} onPress={() => { tapHaptic('select'); setIndex(itemIndex); setColumns(1); }} style={s.photo}>
            <Image source={{ uri: image.uri }} resizeMode="contain" style={{ width: cardWidth, height: cardWidth * 1.5 }} />
          </Pressable>
          <ThemedText style={s.count}>{String(itemIndex + 1).padStart(2, '0')}</ThemedText>
        </View>)}
      </ScrollView>}
    </View>
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 }, viewport: { flex: 1, minHeight: 0 },
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingBottom: 10, gap: 6 },
  mode: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  grid: { padding: 16, paddingTop: 0, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { backgroundColor: '#EEEDE8' },
  count: { color: '#73746E', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 4 },
  pageActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navigation: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: 36, height: 48, alignItems: 'center', justifyContent: 'center' }, arrowText: { fontSize: 28, color: '#343B32' }, disabled: { opacity: 0.25 },
});
