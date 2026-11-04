import { useComicCharacterNames } from '../lib/heroCharacterName';
import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Pressable, ScrollView, StyleSheet, useAnimatedValue, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTranslation } from '@shared/lib/i18n';
import { ThemedText } from '@shared/ui/themed-text';
import { SELECTABLE_COMIC_CHARACTERS, type ComicCharacter } from '../lib/heroCharacters';

const protagonistSelectionInk = '#171510';

function HeaderPortrait({ source, id }: { source: number; id: string }) {
  const [loadedSource, setLoadedSource] = useState<number | null>(null);
  const ready = loadedSource === source;
  return <View style={s.image}>
    <Image source={source} resizeMode="contain" style={[s.image, !ready && { opacity: 0 }]} onLoad={() => setLoadedSource(source)} />
    {!ready ? <View testID={`hero-header-portrait-${id}-skeleton`} pointerEvents="none" accessible={false} style={[StyleSheet.absoluteFill, s.portraitSkeleton]} /> : null}
  </View>;
}

export function HeroCharacterList({ ink, muted, selectedId, onSelect, open, inline = false }: {
  ink: string; muted: string; selectedId?: string; onSelect: (character: ComicCharacter) => void; open: boolean; inline?: boolean;
}) {
  const { t } = useTranslation();
  const nameFor = useComicCharacterNames();
  const reveal = useAnimatedValue(0);
  useEffect(() => {
    const animation = Animated.timing(reveal, { toValue: open ? 1 : 0, duration: open ? 220 : 160, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [open, reveal]);
  return <Animated.View testID="hero-header-character-list" pointerEvents={open ? 'auto' : 'none'} accessibilityElementsHidden={!open} importantForAccessibility={open ? 'auto' : 'no-hide-descendants'} style={[inline ? s.inlineRoot : s.root, { opacity: reveal, transform: [{ translateX: reveal.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
    <ScrollView testID="hero-header-character-scroll" horizontal showsHorizontalScrollIndicator keyboardShouldPersistTaps="handled" contentContainerStyle={s.list}>
      {SELECTABLE_COMIC_CHARACTERS.map(character => {
        const selected = selectedId === character.id;
        return <Pressable key={character.id} testID={`hero-header-character-${character.id}`} accessibilityRole="button" accessibilityLabel={t('comicDay.character.choose', { name: nameFor(character.id, t(character.name)) })} accessibilityState={{ selected }} onPress={() => onSelect(character)} style={s.item}>
        <View style={s.portrait}><HeaderPortrait source={character.cover} id={character.id} /><Svg pointerEvents="none" width={36} height={36} viewBox="0 0 52 52" style={StyleSheet.absoluteFill}>
          <Path testID={`hero-header-character-ring-${character.id}`} d="M26 2C12 1 2 12 2 26S12 50 26 50 50 40 50 26 40 2 26 2Z" fill="none" stroke={protagonistSelectionInk} strokeWidth={selected ? 1.8 : 1.1} strokeLinecap="round" />
        </Svg></View>
        <ThemedText style={[s.name, { color: ink, fontWeight: selected ? '600' : '400' }]}>{nameFor(character.id, t(character.name))}</ThemedText>
      </Pressable>;
      })}
    </ScrollView>
  </Animated.View>;
}
const s = StyleSheet.create({
  root: { position: 'absolute', left: 24, right: 16, top: 2, zIndex: 20 },
  inlineRoot: { position: 'relative', top: 8, flex: 1, minWidth: 0, height: 50, zIndex: 20 },
  list: { gap: 2, paddingBottom: 6 }, item: { width: 44, alignItems: 'center', gap: 1 },
  portrait: { width: 36, height: 36, padding: 4 }, image: { width: 28, height: 28, borderRadius: 14 },
  portraitSkeleton: { borderRadius: 14, backgroundColor: 'rgba(125, 126, 117, 0.18)' },
  name: { fontSize: 10, lineHeight: 14 }, status: { fontSize: 9, lineHeight: 12 },
});
