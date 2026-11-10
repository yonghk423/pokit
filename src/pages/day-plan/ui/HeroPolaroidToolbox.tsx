import { memo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ThemedText } from '@shared/ui/themed-text';
import { POLAROID_FILMS, adjustmentKeys, type AdjustmentKey, type PolaroidEffects } from './HeroPolaroidEffects';
const tools = [
  { key: 'film', label: '필름', path: 'M4 3h16v18H4ZM7 6h10v10H7Z' },
  { key: 'brightness', label: '밝기', path: 'M12 7a5 5 0 1 0 .1 0M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5M18 18l1.5 1.5M5 19l1.5-1.5M18 6l1.5-1.5' },
  { key: 'contrast', label: '대비', path: 'M12 3C0 3 0 21 12 21S24 3 12 3ZM12 3v18M15 6v12m3-10v8' },
  { key: 'saturation', label: '채도', path: 'M12 3Q1 14 6 19q6 5 12-1Q23 12 12 3ZM8 14q-1 3 2 4' },
  { key: 'highlights', label: '하이라이트', path: 'M12 3C0 3 0 21 12 21S24 3 12 3ZM5 9h6m-7 4h7m-5 4h5' },
  { key: 'shadows', label: '그림자', path: 'M12 3C0 3 0 21 12 21S24 3 12 3ZM13 6h5m-5 4h7m-7 4h7m-7 4h5' },
  { key: 'temperature', label: '색온도', path: 'M9 14V5q3-5 6 0v9a5 5 0 1 1-6 0ZM12 8v10m0 0v1' },
  { key: 'fade', label: '페이드', path: 'M4 16q-3-8 4-9 2-7 7-2 6-1 6 5 5 6-3 8H7q-4 0-3-2ZM7 21h10' },
  { key: 'grain', label: '그레인', path: 'M4 4h16v16H4ZM8 8h.1m4 0h.1m4 0h.1M8 12h.1m4 0h.1m4 0h.1M8 16h.1m4 0h.1m4 0h.1' },
];
export const HeroPolaroidToolbox = memo(function HeroPolaroidToolbox({ photoFit = 'cover', onChangePhotoFit, effects, onChange, showText = true, onToggleText, showDate = true, onToggleDate, disabled = false }: { photoFit?: 'cover' | 'contain'; onChangePhotoFit?: (fit: 'cover' | 'contain') => void; showText?: boolean; onToggleText?: () => void; showDate?: boolean; onToggleDate?: () => void; effects: PolaroidEffects; onChange: (patch: PolaroidEffects) => void; disabled?: boolean }) {
  const film = effects.film ?? 'original';
  const [trackWidth, setTrackWidth] = useState(1);
  const [selected, setSelected] = useState<string | null>('film');
  const key = selected as AdjustmentKey;
  const minimum = key === 'fade' || key === 'grain' ? 0 : -100;
  const value = effects[key] ?? 0;
  const changeAt = (x: number) => { if (!disabled) onChange({ [key]: Math.round(Math.max(0, Math.min(1, x / trackWidth)) * (100 - minimum) + minimum) }); };
  return <View style={{ backgroundColor: '#080808', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 12, paddingTop: 12, gap: 4, flexShrink: 0 }}>
    <View testID="polaroid-tools-list" style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 4, paddingVertical: 2 }}>
      {tools.map(tool => <Pressable testID={`polaroid-tool-${tool.key}`} key={tool.key} disabled={disabled} accessibilityRole="button" accessibilityLabel={tool.label} accessibilityState={{ selected: selected === tool.key, expanded: selected === tool.key }} onPressIn={() => setSelected(tool.key)} onPress={() => setSelected(tool.key)} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1, backgroundColor: selected === tool.key ? '#242424' : 'transparent', borderRadius: 10, width: '16.666%', minHeight: 56, alignItems: 'center', paddingVertical: 2, gap: 1 })}>
        <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}><Path d={tool.path} fill="none" stroke={selected === tool.key ? '#FFFFFF' : '#D6D6D0'} strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <ThemedText style={{ fontSize: 11, lineHeight: 16, color: '#F3F2ED' }}>{tool.label}</ThemedText>
        <ThemedText numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 11, lineHeight: 16, color: '#A6A6A0' }}>{tool.key === 'film' ? POLAROID_FILMS.find(option => option.value === film)?.label : String(effects[tool.key as AdjustmentKey] ?? 0)}</ThemedText>
      </Pressable>)}
      <Pressable testID="polaroid-reset-all" accessibilityRole="button" accessibilityLabel="모든 보정을 원본으로 되돌리기" disabled={disabled} onPress={() => onChange({ film: 'original', ...Object.fromEntries(adjustmentKeys.map(key => [key, 0])) })} style={{ width: '16.666%', minHeight: 56, alignItems: 'center', paddingVertical: 2, gap: 1 }}>
        <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}><Path d="M5 9a8 8 0 1 1-1 7M5 3v6h6" fill="none" stroke="#F3F2ED" strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <ThemedText style={{ fontSize: 11, lineHeight: 16, color: '#F3F2ED' }}>원본 복원</ThemedText>
      </Pressable>
      {onToggleText ? <Pressable testID="polaroid-toggle-text" accessibilityRole="switch" accessibilityLabel="글 표시" accessibilityState={{ checked: showText, disabled }} disabled={disabled} onPress={onToggleText} style={{ width: '16.666%', minHeight: 56, alignItems: 'center', paddingVertical: 2, gap: 1 }}>
        <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}><Path d="M4 5h16M12 5v15M8 20h8M4 5v3m16-3v3" fill="none" stroke="#F3F2ED" strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <ThemedText style={{ fontSize: 11, lineHeight: 16, color: '#F3F2ED' }}>글 표시</ThemedText>
        <ThemedText style={{ fontSize: 11, lineHeight: 16, color: '#A6A6A0' }}>{showText ? '켜짐' : '꺼짐'}</ThemedText>
      </Pressable> : null}
      {onToggleDate ? <Pressable testID="polaroid-toggle-date" accessibilityRole="button" accessibilityLabel="날짜 선택" accessibilityState={{ disabled }} disabled={disabled} onPress={onToggleDate} style={{ width: '16.666%', minHeight: 56, alignItems: 'center', paddingVertical: 2, gap: 1 }}>
        <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}><Path d="M4 6h16v15H4ZM4 10h16M8 3v5m8-5v5M8 14h2m4 0h2M8 17h2m4 0h2" fill="none" stroke="#F3F2ED" strokeWidth={1.15} strokeLinecap="round" strokeLinejoin="round" /></Svg>
        <ThemedText style={{ fontSize: 11, lineHeight: 16, color: '#F3F2ED' }}>날짜 표시</ThemedText>
        <ThemedText style={{ fontSize: 11, lineHeight: 16, color: '#A6A6A0' }}>{showDate ? '켜짐' : '꺼짐'}</ThemedText>
      </Pressable> : null}

    </View>
    {onChangePhotoFit ? <View testID="polaroid-photo-fit" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 12, gap: 24 }}>
      {([{ value: 'contain', label: '원본 유지' }, { value: 'cover', label: '클래식 폴라로이드' }] as const).map(option => <Pressable key={option.value} testID={`polaroid-fit-${option.value}`} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{ selected: photoFit === option.value, disabled }} disabled={disabled} onPress={() => onChangePhotoFit(option.value)} style={{ minHeight: 44, justifyContent: 'center' }}>
        <ThemedText style={{ fontSize: 13, color: photoFit === option.value ? '#FFFFFF' : '#B8B8B1', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: photoFit === option.value ? '#FFFFFF' : 'transparent' }}>{option.label}</ThemedText>
      </Pressable>)}
    </View> : null}
    {/* Reserve the slider row so selecting a tool never resizes the print. */}
    <View testID="polaroid-slider-space" style={{ height: 44, overflow: 'hidden' }}>
    {selected === 'film' ? <ScrollView testID="polaroid-film-options" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', gap: 22, paddingHorizontal: 12 }}>
      {POLAROID_FILMS.map(option => <Pressable key={option.value} testID={`polaroid-select-${option.value}`} disabled={disabled} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{ selected: film === option.value, disabled }} onPress={() => onChange({ film: option.value })} style={{ minHeight: 44, justifyContent: 'center' }}>
        <ThemedText style={{ fontSize: 13, color: film === option.value ? '#FFFFFF' : '#B8B8B1', paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: film === option.value ? '#FFFFFF' : 'transparent' }}>{option.label}</ThemedText>
      </Pressable>)}
    </ScrollView> : null}
    {selected && selected !== 'film' ? <View testID="polaroid-adjustment-panel" style={{ minHeight: 44, justifyContent: 'center' }}>
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: '80%', maxWidth: 360, alignSelf: 'center' }}>
      <View accessibilityRole="adjustable" accessibilityLabel={tools.find(t => t.key === selected)?.label} accessibilityValue={{ min: minimum, max: 100, now: value }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={e => { if (!disabled) onChange({ [key]: Math.max(minimum, Math.min(100, value + (e.nativeEvent.actionName === 'increment' ? 5 : -5))) }); }} onLayout={e => setTrackWidth(e.nativeEvent.layout.width)} onStartShouldSetResponder={() => !disabled} onMoveShouldSetResponder={() => !disabled} onResponderGrant={e => changeAt(e.nativeEvent.locationX)} onResponderMove={e => changeAt(e.nativeEvent.locationX)} style={{ flex: 1, height: 44, justifyContent: 'center' }}>
        <View pointerEvents="none" style={{ height: 2, backgroundColor: '#565653' }} />
        <View pointerEvents="none" style={{ position: 'absolute', left: `${(value - minimum) / (100 - minimum) * 100}%`, marginLeft: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: '#F3F2ED' }} />
      </View>
      <Pressable disabled={disabled} accessibilityLabel="현재 조절 초기화" onPress={() => onChange({ [key]: 0 })} style={{ minHeight: 44, justifyContent: 'center' }}><ThemedText style={{ fontSize: 13, color: '#F3F2ED' }}>초기화</ThemedText></Pressable>
    </View>
    </View> : null}
    </View>
  </View>;
});
