import { DayRhythmSymbol } from '@shared/ui/day-rhythm-symbol';
import { comicRhythmArt as ART } from '../lib/comicRhythmArt';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { AppModal } from '@shared/ui/app-modal';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { NativeHhmmWheelPicker } from '@shared/ui/native-hhmm-wheel-picker';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';
import { ComicSceneImage } from './ComicSceneImage';
import { comicRhythmBalance, comicRhythmPoint, comicRhythmMinutes, comicRhythmHhmm, comicRhythmDrag } from '../lib/comicRhythmMath';

/** Short, uneven marker passes follow the text width instead of the surrounding row. */
function PencilHighlight({ text, textStyle, fit = false }: { text: string; textStyle: StyleProp<TextStyle>; fit?: boolean }) {
  const [measurement, setMeasurement] = useState<{ text: string; lines: { x: number; y: number; width: number; height: number }[] } | null>(null);
  const lines = measurement?.text === text ? measurement.lines : [];
  return <View style={s.highlightLabel}>
    {lines.map((line, index) => <Svg key={index} testID="text-width-highlight" pointerEvents="none" style={{ position: 'absolute', left: line.x, top: line.y + line.height - 8 }} width={line.width} height={10} viewBox="0 0 200 12" preserveAspectRatio="none" accessible={false}>
      <Path d="M2 6L8 3.8L29 4.2L48 2.7L74 3.6L101 2.4L130 3.5L155 2.6L181 3.2L196 2L199 5.4L192 8L166 8.3L142 9.2L116 8.4L91 9.5L63 8.6L39 9.7L17 8.8L4 9.2Z" fill="#B9E4CD" opacity={0.5} />
      <Path d="M8 8L35 6L68 6.6L103 5.2L136 6L165 4.8L191 5.7L187 9L157 9.3L126 10L96 9.5L64 10.6L32 9.8L9 10Z" fill="#C5EBD7" opacity={0.45} />
      <Path d="M14 4.8L48 4.1M76 4.8L118 3.9M143 5L182 4.1" stroke="#F2FAF3" strokeWidth={0.6} opacity={0.7} />
    </Svg>)}
    <ThemedText style={textStyle} adjustsFontSizeToFit={fit} numberOfLines={fit ? 1 : undefined} onTextLayout={event => {
      const nextLines = event.nativeEvent.lines.map(({ x, y, width, height }) => ({ x, y, width, height }));
      setMeasurement(previous => previous?.text === text && JSON.stringify(previous.lines) === JSON.stringify(nextLines) ? previous : { text, lines: nextLines });
    }}>{text}</ThemedText>
  </View>;
}

function DialHandle({ minutes, size, kind, onMinute, onDragging, onPress, label }: { minutes: number; size: number; kind: 'sun' | 'moon'; onMinute: (minute: number) => void; onDragging: (active: boolean) => void; onPress: () => void; label: string }) {
  const point = comicRhythmPoint(minutes, size, 164);
  const latest = useRef({ point, size, onMinute, onDragging, onPress });
  const origin = useRef(point);
  useEffect(() => { latest.current = { point, size, onMinute, onDragging, onPress }; }, [point, size, onMinute, onDragging, onPress]);
  // PanResponder invokes these callbacks during touch events only.
  // eslint-disable-next-line react-hooks/refs
  const [pan] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { origin.current = latest.current.point; latest.current.onDragging(true); },
    onPanResponderMove: (_, event) => latest.current.onMinute(comicRhythmMinutes(origin.current.x + event.dx, origin.current.y + event.dy, latest.current.size)),
    onPanResponderRelease: (_, event) => { latest.current.onDragging(false); if (Math.abs(event.dx) + Math.abs(event.dy) < 5) latest.current.onPress(); },
    onPanResponderTerminate: () => latest.current.onDragging(false),
  }));
  return <View {...pan.panHandlers} accessible accessibilityRole="button" accessibilityLabel={label} style={[s.handle, { left: point.x - 22, top: point.y - 22 }]}><DayRhythmSymbol kind={kind} size={27} /><ThemedText style={s.handleTime}>{comicRhythmHhmm(minutes)}</ThemedText></View>;
}
export function ComicRhythmTimeLayout({ start, end, nextDay, onChange, dateLabel, endDateControls, endDateHint, onPrimary, primaryLabel, secondaryLabel, onSecondary, footer }: {
  start: string; end: string; nextDay: boolean; onChange: (start: string, end: string, nextDay: boolean) => void; dateLabel?: string;
  endDateControls: ReactNode; endDateHint?: string; onPrimary: () => void; primaryLabel: string; secondaryLabel?: string; onSecondary?: () => void; footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const [size, setSize] = useState(320);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<'start' | 'end' | null>(null);
  const [draft, setDraft] = useState(start);
  const balance = comicRhythmBalance(start, end, nextDay);
  const open = (target: 'start' | 'end') => { setDraft(target === 'start' ? start : end); setEditing(target); };
  const duration = (minutes: number) => minutes % 60 ? t('comicRhythm.hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 }) : t('comicRhythm.hours', { hours: Math.floor(minutes / 60) });
  const changeMinute = (target: 'start' | 'end' | 'wake', minutes: number) => {
    const moved = comicRhythmDrag(target, minutes, start, end, nextDay);
    onChange(moved.start, moved.end, moved.nextDay);
  };
  return <>
    <ScrollView scrollEnabled={!dragging} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      {dateLabel ? <ThemedText style={s.date}>{dateLabel}</ThemedText> : null}
      <ThemedText style={s.heading}>{t('comicRhythm.heading')}</ThemedText>
      <View style={s.strip}>
        {(['cafe', 'study'] as const).map((scene, index) => <View key={scene} style={s.panel}><ComicSceneImage imageKey={`rhythm:${scene}`} source={ART[scene]} style={{ width: '100%', aspectRatio: 1.9 }} /><ThemedText style={s.caption}>{t(index ? 'comicRhythm.focus' : 'comicRhythm.morning')}</ThemedText></View>)}
      </View>
      <View style={s.dialWrap} onLayout={event => setSize(Math.min(event.nativeEvent.layout.width, 340))}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size} viewBox="0 0 360 360" accessible={false}>
            <Defs>
              <ClipPath id="rhythmBandClip"><Path d="M180 39a141 141 0 1 1 0 282a141 141 0 1 1 0-282Z M180 65a115 115 0 1 0 0 230a115 115 0 1 0 0-230Z" clipRule="evenodd" fillRule="evenodd" /></ClipPath>
              <LinearGradient id="rhythmMint" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0" stopColor="#BEECD8" /><Stop offset="0.55" stopColor="#A9DEC8" /><Stop offset="1" stopColor="#C5EDDC" /></LinearGradient>
            </Defs>
            <Circle cx={180} cy={180} r={128} fill="none" stroke="#F3F2ED" strokeWidth={26} />
            <G clipPath="url(#rhythmBandClip)">{Array.from({ length: 150 }, (_, index) => {
              const x = index * 4 - 300;
              return <Line key={index} x1={x} y1={350} x2={x + 280} y2={10} stroke="#77796F" strokeWidth={index % 3 === 0 ? 0.7 : 0.45} opacity={index % 4 === 0 ? 0.65 : 0.45} />;
            })}</G>
            <Circle cx={180} cy={180} r={128} fill="none" stroke="url(#rhythmMint)" strokeWidth={26} strokeDasharray={`${Math.PI * 256 * balance.fraction} ${Math.PI * 256}`} rotation={balance.startMinutes / 8 - 90} origin="180,180" />
            {[balance.startMinutes, balance.endAbsolute, balance.wakeMinutes].map((minute, index) => {
              const inner = comicRhythmPoint(minute, 360, 115), outer = comicRhythmPoint(minute, 360, 141);
              return <Line key={`division:${index}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#4D5149" strokeWidth={0.8} />;
            })}
            {[115, 141].map(radius => <Circle key={radius} cx={180} cy={180} r={radius} fill="none" stroke="#4D5149" strokeWidth={0.8} />)}
            {Array.from({ length: 24 }, (_, hour) => { const a = hour / 24 * Math.PI * 2 - Math.PI / 2; return <Line key={hour} x1={180 + Math.cos(a) * (hour % 6 ? 143 : 135)} y1={180 + Math.sin(a) * (hour % 6 ? 143 : 135)} x2={180 + Math.cos(a) * (hour % 6 ? 148 : 149)} y2={180 + Math.sin(a) * (hour % 6 ? 148 : 149)} stroke="#4D5149" strokeWidth={hour % 6 ? 0.7 : 1.1} />; })}
          </Svg>
          {[['00', 0.47, 0.025], ['12', 0.91, 0.47], ['00', 0.47, 0.91], ['12', 0.025, 0.47]].map(([label, x, y]) => <ThemedText key={`hour:${label}:${x}:${y}`} style={[s.hour, { left: Number(x) * size, top: Number(y) * size }]}>{label}</ThemedText>)}
          <ThemedText style={[s.cycleDay, { top: size * 0.085 }]}>{t('dayRhythm.today')}</ThemedText>
          <ThemedText style={[s.cycleDay, { bottom: size * 0.025 }]}>{t('dayRhythm.nextDay')}</ThemedText>
          <View pointerEvents="none" testID="rhythm-circle-content" style={[s.center, { left: size * 65 / 360, top: size * 65 / 360, width: size * 230 / 360, height: size * 230 / 360, borderRadius: size * 115 / 360 }]}><ComicSceneImage source={ART.reading} imageKey="rhythm:reading" style={{ position: 'absolute', left: 0, top: '7%', width: '100%', height: '69%' }} backgroundColor="#FFFFFF" /><View style={s.balanceCaption}><PencilHighlight fit textStyle={s.activity} text={t('comicRhythm.activity', { duration: duration(balance.activity) })} /><ThemedText style={s.sleep}>{t('comicRhythm.sleep', { duration: duration(balance.sleep) })}</ThemedText></View><PaperGrain opacity={0.12} /></View>
          {[balance.startMinutes, balance.endAbsolute, balance.wakeMinutes].map((minute, index) => {
            const dot = comicRhythmPoint(minute, size, 141);
            return <View key={`boundary:${index}`} pointerEvents="none" style={{ position: 'absolute', left: dot.x - 3, top: dot.y - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: '#292B25' }} />;
          })}
          <DialHandle minutes={balance.startMinutes} size={size} kind="sun" onMinute={minute => changeMinute('start', minute)} onDragging={setDragging} onPress={() => open('start')} label={t('dayRhythm.dayStart')} />
          <DialHandle minutes={balance.wakeMinutes} size={size} kind="sun" onMinute={minute => changeMinute('wake', minute)} onDragging={setDragging} onPress={() => open('start')} label={`${t('dayRhythm.nextDay')} ${t('dayRhythm.dayStart')}`} />
          <DialHandle minutes={balance.endAbsolute} size={size} kind="moon" onMinute={minute => changeMinute('end', minute)} onDragging={setDragging} onPress={() => open('end')} label={t('dayRhythm.dayEnd')} />
        </View>
      </View>
      <View style={s.strip}>{(['rest', 'swimming'] as const).map(scene => <View key={scene} style={s.panel}><ComicSceneImage source={ART[scene]} imageKey={`rhythm:${scene}`} style={{ width: '100%', aspectRatio: 2.3 }} /></View>)}</View>
      <View style={s.taglineRow}><PencilHighlight textStyle={s.tagline} text={t('comicRhythm.rest')} /></View>
      <View style={s.controls}>{(['start', 'end'] as const).map(target => <Pressable key={target} accessibilityRole="button" accessibilityLabel={t(target === 'start' ? 'dayRhythm.dayStart' : 'dayRhythm.dayEnd')} onPress={() => open(target)} style={s.timeButton}>
        <HanddrawnFrame color="#73776D" /><DayRhythmSymbol kind={target === 'start' ? 'sun' : 'moon'} size={30} /><View><ThemedText style={s.timeLabel}>{t(target === 'start' ? 'dayRhythm.dayStart' : 'dayRhythm.dayEnd')}</ThemedText><ThemedText style={s.timeValue}>{target === 'start' ? start : end}</ThemedText></View><ThemedText style={s.chevron}>⌄</ThemedText>
      </Pressable>)}</View>
      <View style={s.endChoice}>{endDateControls}</View>
      {endDateHint ? <ThemedText style={s.hint}>{endDateHint}</ThemedText> : null}
      {footer}
      <Pressable accessibilityRole="button" accessibilityLabel={primaryLabel} onPress={onPrimary} style={s.primary}><PaperGrain opacity={0.2} /><HanddrawnFrame color="#5C6B60" /><ThemedText style={s.primaryText}>{primaryLabel} →</ThemedText></Pressable>
      {onSecondary && secondaryLabel ? <Pressable accessibilityRole="button" onPress={onSecondary} style={s.secondary}><ThemedText style={s.hint}>{secondaryLabel}</ThemedText></Pressable> : null}
    </ScrollView>
    <AppModal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
      <View style={s.overlay}><Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={() => setEditing(null)} /><View style={s.picker}><PaperGrain opacity={0.2} /><HanddrawnFrame color="#73776D" /><ThemedText style={s.pickerTitle}>{t(editing === 'start' ? 'dayRhythm.dayStart' : 'dayRhythm.dayEnd')}</ThemedText><NativeHhmmWheelPicker valueHhmm={draft} onChangeHhmm={setDraft} minuteInterval={1} mapMidnightToEndOfDay={editing === 'end'} textColor="#202020" isDark={false} surface="#FFFFFF" /><View style={s.pickerActions}><Pressable onPress={() => setEditing(null)} style={s.secondary}><ThemedText style={s.timeLabel}>{t('common.cancel')}</ThemedText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t('common.save')} style={s.save} onPress={() => { onChange(editing === 'start' ? draft : start, editing === 'end' ? draft : end, nextDay); setEditing(null); }}><HanddrawnFrame color="#73776D" /><ThemedText style={s.timeLabel}>{t('common.save')}</ThemedText></Pressable></View></View></View>
    </AppModal>
  </>;
}
const s = StyleSheet.create({ content: { backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 24 }, date: { color: '#777', fontSize: 12, textAlign: 'right', marginBottom: 6 }, heading: { fontSize: 23, lineHeight: 34, color: '#202020', textAlign: 'center', marginBottom: 12 }, strip: { flexDirection: 'row', gap: 6 }, panel: { flex: 1, borderWidth: 0.6, borderColor: '#72766D' }, caption: { color: '#202020', fontSize: 12, textAlign: 'center', padding: 5 }, dialWrap: { alignItems: 'center', marginVertical: 4 }, cycleDay: { position: 'absolute', alignSelf: 'center', color: '#73766C', fontSize: 9, lineHeight: 12 }, hour: { position: 'absolute', color: '#202020', fontSize: 13, lineHeight: 18 }, center: { position: 'absolute', overflow: 'hidden', backgroundColor: '#FFFFFF' }, balanceCaption: { position: 'absolute', left: '8%', right: '8%', bottom: '7%', alignItems: 'center', backgroundColor: '#FFFFFF' }, highlightLabel: { alignSelf: 'center', maxWidth: '100%' }, activity: { color: '#202020', fontSize: 21, lineHeight: 28 }, sleep: { color: '#555', fontSize: 12, lineHeight: 18 }, handleTime: { color: '#292B25', fontSize: 10, lineHeight: 13 }, handle: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, taglineRow: { marginVertical: 10, alignItems: 'center' }, tagline: { color: '#45483F', textAlign: 'center', fontSize: 13, lineHeight: 23 }, controls: { flexDirection: 'row', gap: 8 }, timeButton: { flex: 1, minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 }, timeLabel: { color: '#202020', fontSize: 12 }, timeValue: { color: '#202020', fontSize: 22, lineHeight: 28 }, chevron: { color: '#202020', marginLeft: 'auto' }, endChoice: { alignSelf: 'center', minWidth: 200, marginTop: 10 }, hint: { color: '#777', fontSize: 12, textAlign: 'center', marginVertical: 4 }, primary: { alignSelf: 'center', maxWidth: '95%', marginTop: 14, paddingHorizontal: 20, minHeight: 42, justifyContent: 'center', backgroundColor: '#C8EBDD' }, primaryText: { color: '#202020', fontSize: 15 }, secondary: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.2)' }, picker: { width: '100%', maxWidth: 360, padding: 18, backgroundColor: '#FFFFFF' }, pickerTitle: { color: '#202020', fontSize: 20 }, pickerActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }, save: { minWidth: 60, minHeight: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C8EBDD' } });
