import type { ReactNode } from 'react';
import { PaperGrain } from '@shared/ui/paper-grain';
import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

const SIZE = 44;
const SCALE = 36 / SIZE;

/** Shared thumbnail frame for the main deck and protagonist artwork previews. */
export function HeroSceneThumbnail({ children, isDark, ...props }: Omit<PressableProps, 'children' | 'style'> & { children: ReactNode; isDark: boolean }) {
  return <Pressable {...props} style={({ pressed }) => [s.shell, { backgroundColor: isDark ? '#454742' : '#E6E3DA', shadowOpacity: pressed ? 0.1 : 0.2 }, pressed && { transform: [{ scale: SCALE }, { translateY: 1 }] }]}>
    <PaperGrain opacity={0.85} />
    <View style={s.face}>
      {children}
    </View>
  </Pressable>;
}
const s = StyleSheet.create({
  shell: { width: SIZE, height: SIZE, flexShrink: 0, padding: 2.5, paddingBottom: 4, borderRadius: 0, shadowColor: '#29271F', shadowOffset: { width: 1, height: 2 }, shadowRadius: 2.5, shadowOpacity: 0.2, elevation: 2, transform: [{ scale: SCALE }] },
  face: { flex: 1, borderRadius: 0, overflow: 'hidden' },
});
