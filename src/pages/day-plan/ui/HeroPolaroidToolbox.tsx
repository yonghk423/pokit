import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemedText } from '@shared/ui/themed-text';
import { POLAROID_FILMS, adjustmentKeys, type AdjustmentKey, type PolaroidEffects } from './HeroPolaroidEffects';
const tools = [
  { key: 'film', label: '필터', path: 'M4 3h16v18H4ZM7 6h10v10H7Z' },
  { key: 'brightness', label: '밝기', path: 'M12 7a5 5 0 1 0 .1 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M18 18l1.5 1.5M5 19l1.5-1.5M18 6l1.5-1.5' },
  { key: 'contrast', label: '대비', path: 'M12 3C0 3 0 21 12 21S24 3 12 3ZM12 3v18M15 6v12m3-10v8' },
  { key: 'saturation', label: '채도', path: 'M12 3Q1 14 6 19q6 5 12-1Q23 12 12 3ZM8 14q-1 3 2 4' },
  { key: 'highlights', label: '하이라이트', path: 'M12 3C0 3 0 21 12 21S24 3 12 3ZM5 9h6m-7 4h7m-5 4h5' },
  { key: 'shadows', label: '그림자', path: 'M12 3C0 3 0 21 12 21S24 3 12 3ZM13 6h5m-5 4h7m-7 4h7m-7 4h5' },
  { key: 'temperature', label: '색온도', path: 'M9 14V5q3-5 6 0v9a5 5 0 1 1-6 0ZM12 8v10m0 0v1' },
  { key: 'fade', label: '페이드', path: 'M4 16q-3-8 4-9 2-7 7-2 6-1 6 5 5 6-3 8H7q-4 0-3-2ZM7 21h10' },
  { key: 'grain', label: '그레인', path: 'M4 4h16v16H4ZM8 8h.1m4 0h.1m4 0h.1M8 12h.1m4 0h.1m4 0h.1M8 16h.1m4 0h.1m4 0h.1' },
];
export function HeroPolaroidToolbox({ effects, onChange, showText = true, onToggleText, showDate = true, onToggleDate, disabled = false }: { showText?: boolean; onToggleText?: () => void; showDate?: boolean; onToggleDate?: () => void; effects: PolaroidEffects; onChange: (patch: PolaroidEffects) => void; disabled?: boolean }) {
  const film = effects.film ?? 'original';
  const [trackWidth, setTrackWidth] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const key = selected as AdjustmentKey;
  const minimum = key === 'fade' || key === 'grain' ? 0 : -100;
  const value = effects[key] ?? 0;
  const changeAt = (x: number) => { if (!disabled) onChange({ [key]: Math.round(Math.max(0, Math.min(1, x / trackWidth)) * (100 - minimum) + minimum) }); };
  return <View style={{ paddingHorizontal: 12, paddingTop: 4, gap: 4, flexShrink: 0 }}>
    <ScrollView testID="polaroid-tools-list" nestedScrollEnabled showsVerticalScrollIndicator style={{ height: 100, flexGrow: 0 }} contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 4, paddingVertical: 2 }}> 
      {tools.filter(tool => tool.key !== 'film').map(tool => <Pressable key={tool.key} accessibilityRole="button" accessibilityLabel={tool.label} accessibilityState={{ selected: selected === tool.key, expanded: selected === tool.key }} onPress={() => setSelected(current => current === tool.key ? null : tool.key)} style={{ width: '16.666%', minHeight: 56, alignItems: 'center', paddingVertical: 2, gap: 1 }}>
        <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}><Path d={tool.path} fill="none" stroke={selected === tool.key ? '#242A22' : '#75786F'} strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <ThemedText style={{ fontSize: 11, color: '#343B32' }}>{tool.label}</ThemedText>
        <ThemedText style={{ fontSize: 11, color: '#75786F' }}>{String(effects[tool.key as AdjustmentKey] ?? 0)}</ThemedText>
      </Pressable>)}
      <Pressable testID="polaroid-reset-all" accessibilityRole="button" accessibilityLabel="모든 보정을 원본으로 되돌리기" disabled={disabled} onPress={() => onChange({ film: 'original', ...Object.fromEntries(adjustmentKeys.map(key => [key, 0])) })} style={{ width: '16.666%', minHeight: 56, alignItems: 'center', paddingVertical: 2, gap: 1 }}>
        <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}><Path d="M5 9a8 8 0 1 1-1 7M5 3v6h6" fill="none" stroke="#343B32" strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <ThemedText style={{ fontSize: 11, color: '#343B32' }}>원본 복원</ThemedText>
      </Pressable>
      {onToggleText ? <Pressable testID="polaroid-toggle-text" accessibilityRole="switch" accessibilityLabel="글 표시" accessibilityState={{ checked: showText, disabled }} disabled={disabled} onPress={onToggleText} style={{ width: '16.666%', minHeight: 56, alignItems: 'center', paddingVertical: 2, gap: 1 }}>
        <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}><Path d="M4 5h16M12 5v15M8 20h8M4 5v3m16-3v3" fill="none" stroke="#343B32" strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <ThemedText style={{ fontSize: 11, color: '#343B32' }}>글 표시</ThemedText>
        <ThemedText style={{ fontSize: 11, color: '#75786F' }}>{showText ? '켜짐' : '꺼짐'}</ThemedText>
      </Pressable> : null}
      {onToggleDate ? <Pressable testID="polaroid-toggle-date" accessibilityRole="switch" accessibilityLabel="날짜 표시" accessibilityState={{ checked: showDate, disabled }} disabled={disabled} onPress={onToggleDate} style={{ width: '16.666%', minHeight: 56, alignItems: 'center', paddingVertical: 2, gap: 1 }}>
        <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}><Path d="M4 6h16v15H4ZM4 10h16M8 3v5m8-5v5M8 14h2m4 0h2M8 17h2m4 0h2" fill="none" stroke="#343B32" strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <ThemedText style={{ fontSize: 11, color: '#343B32' }}>날짜 표시</ThemedText>
        <ThemedText style={{ fontSize: 11, color: '#75786F' }}>{showDate ? '켜짐' : '꺼짐'}</ThemedText>
      </Pressable> : null}
    </ScrollView>
    {selected ? <View testID="polaroid-adjustment-panel" style={{ minHeight: 44, justifyContent: 'center' }}>
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: '80%', maxWidth: 360, alignSelf: 'center' }}>
      <View accessibilityRole="adjustable" accessibilityLabel={tools.find(t => t.key === selected)?.label} accessibilityValue={{ min: minimum, max: 100, now: value }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={e => { if (!disabled) onChange({ [key]: Math.max(minimum, Math.min(100, value + (e.nativeEvent.actionName === 'increment' ? 5 : -5))) }); }} onLayout={e => setTrackWidth(e.nativeEvent.layout.width)} onStartShouldSetResponder={() => !disabled} onMoveShouldSetResponder={() => !disabled} onResponderGrant={e => changeAt(e.nativeEvent.locationX)} onResponderMove={e => changeAt(e.nativeEvent.locationX)} style={{ flex: 1, height: 44, justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ height: 2, backgroundColor: '#C6C8C1' }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: `${(value - minimum) / (100 - minimum) * 100}%`, marginLeft: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: '#343B32' }} />
      </View>
      <Pressable disabled={disabled} accessibilityLabel="현재 조절 초기화" onPress={() => onChange({ [key]: 0 })} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ fontSize: 13 }}>초기화</ThemedText></Pressable>
    </View>
    </View> : null}
    <View testID="polaroid-filter-list" style={{ borderTopWidth: 0.5, borderTopColor: '#D2D1CA', paddingTop: 4, gap: 2 }}>
      <ThemedText accessibilityRole="header" style={{ color: '#343B32', fontSize: 14 }}>필터</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
        {POLAROID_FILMS.map(({ value, label }) => <Pressable testID={`polaroid-select-${value}`} key={value} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: film === value, disabled }} onPress={() => onChange({ film: value })} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 8, backgroundColor: film === value ? '#E6E3DE' : 'transparent', opacity: disabled ? 0.45 : 1 }}>
          <ThemedText style={{ color: '#343B32', fontSize: 14 }}>{label}</ThemedText>
        </Pressable>)}
      </ScrollView>
    </View>
  </View>;
}
