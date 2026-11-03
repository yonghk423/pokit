import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

const SIZE = 44;
const SCALE = 36 / SIZE;

/** Shared thumbnail frame for the main deck and protagonist artwork previews. */
export function HeroSceneThumbnail({ children, isDark, ...props }: Omit<PressableProps, 'children' | 'style'> & { children: ReactNode; isDark: boolean }) {
  return <Pressable {...props} style={({ pressed }) => [s.shell, { backgroundColor: isDark ? '#454742' : '#E8E7E4', shadowOpacity: pressed ? 0.06 : 0.16 }, pressed && { transform: [{ scale: SCALE }, { translateY: 1 }] }]}>
    <View style={s.face}>
      {children}
      <View pointerEvents="none" style={[s.highlight, { borderTopColor: isDark ? '#73766E' : 'rgba(255,255,255,0.9)', borderLeftColor: isDark ? '#62665E' : 'rgba(255,255,255,0.6)' }]} />
    </View>
  </Pressable>;
}
const s = StyleSheet.create({
  shell: { width: SIZE, height: SIZE, flexShrink: 0, borderRadius: 10, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowRadius: 3, shadowOpacity: 0.16, elevation: 2, transform: [{ scale: SCALE }] },
  face: { flex: 1, marginBottom: 1, borderRadius: 10, overflow: 'hidden' },
  highlight: { ...StyleSheet.absoluteFill, borderRadius: 10, borderTopWidth: 1, borderLeftWidth: 0.6 },
});
