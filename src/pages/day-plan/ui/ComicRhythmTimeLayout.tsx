import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { clampDialHandle, cycleMinutesToClockHhmm } from '@widgets/daily-rhythm-time-field/math';
import { DayRhythmSymbol } from '@shared/ui/day-rhythm-symbol';
import { comicRhythmArt as ART } from '../lib/comicRhythmArt';
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, type StyleProp, type TextStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { AppModal } from '@shared/ui/app-modal';
import { HanddrawnFrame } from '@shared/ui/handdrawn-frame';
import { NativeHhmmWheelPicker } from '@shared/ui/native-hhmm-wheel-picker';
import { PaperGrain } from '@shared/ui/paper-grain';
import { ThemedText } from '@shared/ui/themed-text';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { ComicSceneImage } from './ComicSceneImage';
import { comicRhythmBalance, comicRhythmPoint, comicRhythmMinutes, comicRhythmHhmm, comicRhythmDrag, comicRhythmDialLabels, COMIC_RHYTHM_DIAL_PAD } from '../lib/comicRhythmMath';


const DIAL_SLEEP_BAND = <>
            <Circle cx={180} cy={180} r={128} fill="none" stroke="#F3F2ED" strokeWidth={26} />
            <G clipPath="url(#rhythmBandClip)">{Array.from({ length: 150 }, (_, index) => {
              const x = index * 4 - 300;
              return <Line key={index} x1={x} y1={350} x2={x + 280} y2={10} stroke="#77796F" strokeWidth={index % 3 === 0 ? 0.7 : 0.45} opacity={index % 4 === 0 ? 0.65 : 0.45} />;
            })}</G>

</>;
const DIAL_OUTLINE = <>
            {[115, 141].map(radius => <Circle key={radius} cx={180} cy={180} r={radius} fill="none" stroke="#4D5149" strokeWidth={0.8} />)}
            {Array.from({ length: 24 }, (_, hour) => { const a = hour / 24 * Math.PI * 2 - Math.PI / 2; return <Line key={hour} x1={180 + Math.cos(a) * (hour % 6 ? 143 : 135)} y1={180 + Math.sin(a) * (hour % 6 ? 143 : 135)} x2={180 + Math.cos(a) * (hour % 6 ? 148 : 149)} y2={180 + Math.sin(a) * (hour % 6 ? 148 : 149)} stroke="#4D5149" strokeWidth={hour % 6 ? 0.7 : 1.1} />; })}

</>;
/** 150개 빗금 선은 변하지 않으므로 별도 레이어로 분리해 드래그 중 재조정을 막는다. */
const DialSleepBackdrop = memo(function DialSleepBackdrop({ size }: { size: number }) {
  return <Svg width={size} height={size} viewBox="0 0 360 360" pointerEvents="none" style={StyleSheet.absoluteFill} accessible={false}>
    <Defs>
      <ClipPath id="rhythmBandClip"><Path d="M180 39a141 141 0 1 1 0 282a141 141 0 1 1 0-282Z M180 65a115 115 0 1 0 0 230a115 115 0 1 0 0-230Z" clipRule="evenodd" fillRule="evenodd" /></ClipPath>
    </Defs>
    {DIAL_SLEEP_BAND}
  </Svg>;
});
const DialArtwork = memo(function DialArtwork() {
  return <ComicSceneImage source={ART.parkWalk} imageKey="rhythm:park-walk" style={{ position: 'absolute', left: 0, top: '7%', width: '100%', height: '69%' }} backgroundColor="#FFFFFF" />;
});
const StripArtwork = memo(function StripArtwork({ scene, aspectRatio }: { scene: 'cafe' | 'study' | 'rest' | 'swimming'; aspectRatio: number }) {
  return <ComicSceneImage imageKey={`rhythm:${scene}`} source={ART[scene]} style={{ width: '100%', aspectRatio }} />;
});

/** Short, uneven marker passes follow the text width instead of the surrounding row. */
function PencilHighlight({ text, textStyle, fit = false }: { text: string; textStyle: StyleProp<TextStyle>; fit?: boolean }) {
  const [lines, setLines] = useState<{ x: number; y: number; width: number; height: number }[]>([]);
  return <View style={s.highlightLabel}>
    {lines.map((line, index) => <Svg key={index} testID="text-width-highlight" pointerEvents="none" style={{ position: 'absolute', left: line.x, top: line.y + line.height - 8 }} width={line.width} height={10} viewBox="0 0 200 12" preserveAspectRatio="none" accessible={false}>
      <Path d="M2 6L8 3.8L29 4.2L48 2.7L74 3.6L101 2.4L130 3.5L155 2.6L181 3.2L196 2L199 5.4L192 8L166 8.3L142 9.2L116 8.4L91 9.5L63 8.6L39 9.7L17 8.8L4 9.2Z" fill="#B9E4CD" opacity={0.5} />
      <Path d="M8 8L35 6L68 6.6L103 5.2L136 6L165 4.8L191 5.7L187 9L157 9.3L126 10L96 9.5L64 10.6L32 9.8L9 10Z" fill="#C5EBD7" opacity={0.45} />
      <Path d="M14 4.8L48 4.1M76 4.8L118 3.9M143 5L182 4.1" stroke="#F2FAF3" strokeWidth={0.6} opacity={0.7} />
    </Svg>)}
    <ThemedText style={textStyle} adjustsFontSizeToFit={fit} numberOfLines={fit ? 1 : undefined} onTextLayout={event => {
      const nextLines = event.nativeEvent.lines.map(({ x, y, width, height }) => ({ x, y, width, height }));
      setLines(previous => previous.length === nextLines.length && previous.every((line, index) => line.x === nextLines[index].x && line.y === nextLines[index].y && line.width === nextLines[index].width && line.height === nextLines[index].height) ? previous : nextLines);
    }}>{text}</ThemedText>
  </View>;
}

function DialHandle({ minutes, size, kind, target, startMinutes, endMinutes, scrollGesture, onMinute, onDragging, onPress, label }: {
  minutes: number; size: number; kind: 'sun' | 'moon'; target: 'start' | 'end' | 'wake';
  startMinutes: number; endMinutes: number; scrollGesture: ReturnType<typeof Gesture.Native>;
  onMinute: (minute: number, window?: { start: number; end: number }) => void; onDragging: (active: boolean) => void; onPress: () => void; label: string;
}) {
  const latest = useRef({ onMinute, onDragging, onPress });
  useEffect(() => { latest.current = { onMinute, onDragging, onPress }; }, [onMinute, onDragging, onPress]);
  const visualMinute = useSharedValue(minutes);
  const active = useSharedValue(false);
  const originX = useSharedValue(0), originY = useSharedValue(0);
  const rawMinute = useSharedValue(minutes);
  const cycleStart = useSharedValue(startMinutes), cycleEnd = useSharedValue(endMinutes);
  const lastPreview = useSharedValue(0), lastSnapped = useSharedValue(-1), moved = useSharedValue(false);
  useEffect(() => {
    if (!active.get()) { visualMinute.set(minutes); cycleStart.set(startMinutes); cycleEnd.set(endMinutes); }
  }, [minutes, startMinutes, endMinutes, active, visualMinute, cycleStart, cycleEnd]);
  const begin = useCallback(() => latest.current.onDragging(true), []);
  const preview = useCallback((minute: number, window: { start: number; end: number }) => latest.current.onMinute(minute, window), []);
  const finish = useCallback((minute: number, didMove: boolean, success: boolean, window: { start: number; end: number }) => {
    if (didMove) latest.current.onMinute(minute, window);
    latest.current.onDragging(false);
    if (!didMove && success) { tapHaptic(); latest.current.onPress(); }
  }, []);
  const pan = useMemo(() => Gesture.Pan().minDistance(0).maxPointers(1).shouldCancelWhenOutside(false)
    .blocksExternalGesture(scrollGesture)
    // Gesture callbacks run after touch events, never during render.
    // eslint-disable-next-line react-hooks/refs
    .onBegin(() => {
      active.set(true); moved.set(false); lastPreview.set(0); lastSnapped.set(-1);
      const point = comicRhythmPoint(visualMinute.get(), size, 164);
      originX.set(point.x); originY.set(point.y);
      rawMinute.set(visualMinute.get());
      runOnJS(begin)();
    })
    // Gesture callbacks run after touch events, never during render.
    // eslint-disable-next-line react-hooks/refs
    .onUpdate(event => {
      if (!moved.get() && Math.abs(event.translationX) + Math.abs(event.translationY) < 4) return;
      moved.set(true);
      const x = originX.get() + event.translationX, y = originY.get() + event.translationY;
      const smoothMinute = comicRhythmMinutes(x, y, size, 1);
      const smooth = clampDialHandle(target, smoothMinute, cycleStart.get(), cycleEnd.get(), undefined, 1);
      visualMinute.set(target === 'end' ? smooth.end : smooth.start + (target === 'wake' ? 1440 : 0));
      const snappedMinute = comicRhythmMinutes(x, y, size, 5);
      rawMinute.set(snappedMinute);
      const clamped = clampDialHandle(target, snappedMinute, cycleStart.get(), cycleEnd.get(), undefined, 5);
      cycleStart.set(clamped.start); cycleEnd.set(clamped.end);
      const activeSnapped = target === 'end' ? clamped.end : clamped.start;
      // This clock is read only by the native gesture update worklet.
      // eslint-disable-next-line react-hooks/purity
      const now = performance.now();
      if (activeSnapped !== lastSnapped.get() && now - lastPreview.get() >= 24) {
        lastSnapped.set(activeSnapped);
        lastPreview.set(now);
        runOnJS(preview)(snappedMinute, clamped);
      }
    })
    // Gesture callbacks run after touch events, never during render.
    // eslint-disable-next-line react-hooks/refs
    .onFinalize((event, success) => {
      if (moved.get()) rawMinute.set(comicRhythmMinutes(originX.get() + event.translationX, originY.get() + event.translationY, size, 5));
      active.set(false);
      const clamped = clampDialHandle(target, rawMinute.get(), cycleStart.get(), cycleEnd.get(), undefined, 5);
      visualMinute.set(target === 'end' ? clamped.end : clamped.start + (target === 'wake' ? 1440 : 0));
      runOnJS(finish)(rawMinute.get(), moved.get(), success, clamped);
    }), [scrollGesture, size, target, active, moved, lastPreview, lastSnapped, visualMinute, originX, originY, rawMinute, cycleStart, cycleEnd, begin, preview, finish]);
  const position = useAnimatedStyle(() => {
    const point = comicRhythmPoint(visualMinute.get(), size, 164);
    return { transform: [{ translateX: point.x - 22 }, { translateY: point.y - 22 }] };
  });
  const clockPosition = useAnimatedStyle(() => {
    const angle = visualMinute.get() / 2880 * Math.PI * 2 - Math.PI / 2;
    return { left: 1 + Math.cos(angle) * 26, top: 14 + Math.sin(angle) * 26 };
  });
  return <GestureDetector gesture={pan}><Animated.View accessible accessibilityRole="button" accessibilityLabel={label} style={[s.handle, { left: 0, top: 0 }, position]}>
    <DayRhythmSymbol kind={kind} size={27} />
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: 42 }, clockPosition]}><ThemedText style={[s.handleTime, { position: 'relative', width: 42 }]}>{comicRhythmHhmm(minutes)}</ThemedText></Animated.View>
  </Animated.View></GestureDetector>;
}
export function ComicRhythmTimeLayout({ start, end, nextDay, onChange, dateLabel, endDateControls, endDateHint, onPrimary, primaryLabel, secondaryLabel, onSecondary, footer }: {
  start: string; end: string; nextDay: boolean; onChange: (start: string, end: string, nextDay: boolean) => void; dateLabel?: string;
  endDateControls: ReactNode; endDateHint?: string; onPrimary: () => void; primaryLabel: string; secondaryLabel?: string; onSecondary?: () => void; footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const [size, setSize] = useState(320);
  const scrollGesture = useMemo(() => Gesture.Native(), []);
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState<'start' | 'end' | null>(null);
  const [draft, setDraft] = useState(start);
  const [preview, setPreview] = useState<{ start: string; end: string; nextDay: boolean } | null>(null);
  const dragWindow = useRef<{ start: string; end: string; nextDay: boolean } | null>(null);
  const previewFrame = useRef<number | null>(null);
  useEffect(() => () => { if (previewFrame.current !== null) cancelAnimationFrame(previewFrame.current); }, []);
  const shown = preview ?? { start, end, nextDay };
  const balance = comicRhythmBalance(shown.start, shown.end, shown.nextDay);
  const handleDragging = (active: boolean) => {
    setDragging(active);
    if (active) {
      dragWindow.current = { start, end, nextDay };
      hapticHour.current = null;
      return;
    }
    if (previewFrame.current !== null) cancelAnimationFrame(previewFrame.current);
    previewFrame.current = null;
    const final = dragWindow.current;
    dragWindow.current = null;
    setPreview(null);
    if (final && (final.start !== start || final.end !== end || final.nextDay !== nextDay)) onChange(final.start, final.end, final.nextDay);
  };
  const open = (target: 'start' | 'end') => { setDraft(target === 'start' ? shown.start : shown.end); setEditing(target); };
  const duration = (minutes: number) => minutes % 60 ? t('comicRhythm.hoursMinutes', { hours: Math.floor(minutes / 60), minutes: minutes % 60 }) : t('comicRhythm.hours', { hours: Math.floor(minutes / 60) });
  const hapticHour = useRef<number | null>(null);
  const changeMinute = (target: 'start' | 'end' | 'wake', minutes: number, nativeWindow?: { start: number; end: number }) => {
    const hour = Math.floor(minutes / 60);
    if (hapticHour.current == null) hapticHour.current = hour;
    else if (hapticHour.current !== hour) {
      hapticHour.current = hour;
      tapHaptic(hour % 12 === 0 ? 'warn' : 'press');
    }
    const current = dragWindow.current ?? { start, end, nextDay };
    const moved = nativeWindow ? { start: cycleMinutesToClockHhmm(nativeWindow.start, false), end: cycleMinutesToClockHhmm(nativeWindow.end, true), nextDay: nativeWindow.end >= 1440 } : comicRhythmDrag(target, minutes, current.start, current.end, current.nextDay);
    if (moved.start === current.start && moved.end === current.end && moved.nextDay === current.nextDay) return;
    if (!dragWindow.current) { onChange(moved.start, moved.end, moved.nextDay); return; }
    dragWindow.current = moved;
    if (previewFrame.current === null) previewFrame.current = requestAnimationFrame(() => {
      previewFrame.current = null;
      if (dragWindow.current) setPreview(dragWindow.current);
    });
  };
  const labels = comicRhythmDialLabels(size, [balance.startMinutes, balance.endAbsolute, balance.wakeMinutes]);
  return <GestureHandlerRootView style={{ flex: 1 }}>
    <GestureDetector gesture={scrollGesture}><ScrollView scrollEnabled={!dragging} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      {dateLabel ? <ThemedText style={s.date}>{dateLabel}</ThemedText> : null}
      <ThemedText style={s.heading}>{t('comicRhythm.heading')}</ThemedText>
      <View style={s.strip}>
        {(['cafe', 'study'] as const).map((scene, index) => <View key={scene} style={s.panel}><StripArtwork scene={scene} aspectRatio={1.9} /><ThemedText style={s.caption}>{t(index ? 'comicRhythm.focus' : 'comicRhythm.morning')}</ThemedText></View>)}
      </View>
      <View style={s.dialWrap} onLayout={event => setSize(Math.min(Math.max(event.nativeEvent.layout.width - COMIC_RHYTHM_DIAL_PAD * 2, 220), 340))}>
        <View style={{ width: size, height: size }}>
          <DialSleepBackdrop size={size} />
          <Svg width={size} height={size} viewBox="0 0 360 360" pointerEvents="none" accessible={false}>
            <Defs>
              <LinearGradient id="rhythmMint" x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0" stopColor="#BEECD8" /><Stop offset="0.55" stopColor="#A9DEC8" /><Stop offset="1" stopColor="#C5EDDC" /></LinearGradient>
            </Defs>
            <Circle cx={180} cy={180} r={128} fill="none" stroke="url(#rhythmMint)" strokeWidth={26} strokeDasharray={`${Math.PI * 256 * balance.fraction} ${Math.PI * 256}`} rotation={balance.startMinutes / 8 - 90} origin="180,180" />
            {[balance.startMinutes, balance.endAbsolute, balance.wakeMinutes].map((minute, index) => {
              const inner = comicRhythmPoint(minute, 360, 115), outer = comicRhythmPoint(minute, 360, 141);
              return <Line key={`division:${index}`} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="#4D5149" strokeWidth={0.8} />;
            })}
            {DIAL_OUTLINE}
          </Svg>
          {labels.hours.map((box, index) => <ThemedText key={`hour:${index}`} style={[s.hour, { left: box.x, top: box.y, width: box.w }]}>{index % 2 ? '12' : '00'}</ThemedText>)}
          <ThemedText style={[s.cycleDay, { left: labels.today.x, top: labels.today.y, width: labels.today.w }]}>{t('dayRhythm.today')}</ThemedText>
          <ThemedText style={[s.cycleDay, { left: labels.nextDay.x, top: labels.nextDay.y, width: labels.nextDay.w }]}>{t('dayRhythm.nextDay')}</ThemedText>
          <View pointerEvents="none" testID="rhythm-circle-content" style={[s.center, { left: size * 65 / 360, top: size * 65 / 360, width: size * 230 / 360, height: size * 230 / 360, borderRadius: size * 115 / 360 }]}><DialArtwork /><View style={s.balanceCaption}><PencilHighlight fit textStyle={s.activity} text={t('comicRhythm.activity', { duration: duration(balance.activity) })} /><ThemedText style={s.sleep}>{t('comicRhythm.sleep', { duration: duration(balance.sleep) })}</ThemedText></View><PaperGrain opacity={0.12} /></View>
          {[balance.startMinutes, balance.endAbsolute, balance.wakeMinutes].map((minute, index) => {
            const dot = comicRhythmPoint(minute, size, 141);
            return <View key={`boundary:${index}`} pointerEvents="none" style={{ position: 'absolute', left: dot.x - 3, top: dot.y - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: '#292B25' }} />;
          })}
          <DialHandle target="start" startMinutes={balance.startMinutes} endMinutes={balance.endAbsolute} scrollGesture={scrollGesture} minutes={balance.startMinutes} size={size} kind="sun" onMinute={(minute, window) => changeMinute('start', minute, window)} onDragging={handleDragging} onPress={() => open('start')} label={t('dayRhythm.dayStart')} />
          <DialHandle target="wake" startMinutes={balance.startMinutes} endMinutes={balance.endAbsolute} scrollGesture={scrollGesture} minutes={balance.wakeMinutes} size={size} kind="sun" onMinute={(minute, window) => changeMinute('wake', minute, window)} onDragging={handleDragging} onPress={() => open('start')} label={`${t('dayRhythm.nextDay')} ${t('dayRhythm.dayStart')}`} />
          <DialHandle target="end" startMinutes={balance.startMinutes} endMinutes={balance.endAbsolute} scrollGesture={scrollGesture} minutes={balance.endAbsolute} size={size} kind="moon" onMinute={(minute, window) => changeMinute('end', minute, window)} onDragging={handleDragging} onPress={() => open('end')} label={t('dayRhythm.dayEnd')} />
        </View>
      </View>
      <View style={s.strip}>{(['rest', 'swimming'] as const).map(scene => <View key={scene} style={s.panel}><StripArtwork scene={scene} aspectRatio={2.3} /></View>)}</View>
      <View style={s.taglineRow}><PencilHighlight textStyle={s.tagline} text={t('comicRhythm.rest')} /></View>
      <View style={s.controls}>{(['start', 'end'] as const).map(target => <Pressable key={target} accessibilityRole="button" accessibilityLabel={t(target === 'start' ? 'dayRhythm.dayStart' : 'dayRhythm.dayEnd')} onPress={() => { tapHaptic(); open(target); }} style={s.timeButton}>
        <HanddrawnFrame color="#73776D" /><DayRhythmSymbol kind={target === 'start' ? 'sun' : 'moon'} size={30} /><View><ThemedText style={s.timeLabel}>{t(target === 'start' ? 'dayRhythm.dayStart' : 'dayRhythm.dayEnd')}</ThemedText><ThemedText style={s.timeValue}>{target === 'start' ? shown.start : shown.end}</ThemedText></View><ThemedText style={s.chevron}>⌄</ThemedText>
      </Pressable>)}</View>
      <View style={s.endChoice}>{endDateControls}</View>
      {endDateHint ? <ThemedText style={s.hint}>{endDateHint}</ThemedText> : null}
      {footer}
      <Pressable accessibilityRole="button" accessibilityLabel={primaryLabel} onPress={() => { tapHaptic(); onPrimary(); }} style={s.primary}><PaperGrain opacity={0.2} /><HanddrawnFrame color="#5C6B60" /><ThemedText style={s.primaryText}>{primaryLabel} →</ThemedText></Pressable>
      {onSecondary && secondaryLabel ? <Pressable accessibilityRole="button" onPress={() => { tapHaptic(); onSecondary?.(); }} style={s.secondary}><ThemedText style={s.hint}>{secondaryLabel}</ThemedText></Pressable> : null}
    </ScrollView></GestureDetector>
    <AppModal visible={editing !== null} transparent animationType="fade" onRequestClose={() => setEditing(null)}>
      <View style={s.overlay}><Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={() => { tapHaptic(); setEditing(null); }} /><View style={s.picker}><PaperGrain opacity={0.2} /><HanddrawnFrame color="#73776D" /><ThemedText style={s.pickerTitle}>{t(editing === 'start' ? 'dayRhythm.dayStart' : 'dayRhythm.dayEnd')}</ThemedText><NativeHhmmWheelPicker valueHhmm={draft} onChangeHhmm={setDraft} minuteInterval={1} mapMidnightToEndOfDay={editing === 'end'} textColor="#202020" isDark={false} surface="#FFFFFF" /><View style={s.pickerActions}><Pressable onPress={() => { tapHaptic(); setEditing(null); }} style={s.secondary}><ThemedText style={s.timeLabel}>{t('common.cancel')}</ThemedText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t('common.save')} style={s.save} onPress={() => { tapHaptic('confirm'); onChange(editing === 'start' ? draft : start, editing === 'end' ? draft : end, nextDay); setEditing(null); }}><HanddrawnFrame color="#73776D" /><ThemedText style={s.timeLabel}>{t('common.save')}</ThemedText></Pressable></View></View></View>
    </AppModal>
  </GestureHandlerRootView>;
}
const s = StyleSheet.create({ content: { backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 24 }, date: { color: '#777', fontSize: 12, textAlign: 'right', marginBottom: 6 }, heading: { fontSize: 23, lineHeight: 34, color: '#202020', textAlign: 'center', marginBottom: 12 }, strip: { flexDirection: 'row', gap: 6 }, panel: { flex: 1, borderWidth: 0.6, borderColor: '#72766D' }, caption: { color: '#202020', fontSize: 12, textAlign: 'center', padding: 5 }, dialWrap: { alignItems: 'center', marginVertical: 4, padding: COMIC_RHYTHM_DIAL_PAD }, cycleDay: { position: 'absolute', color: '#73766C', fontSize: 9, lineHeight: 12, textAlign: 'center' }, hour: { position: 'absolute', color: '#202020', fontSize: 13, lineHeight: 16, textAlign: 'center' }, center: { position: 'absolute', overflow: 'hidden', backgroundColor: '#FFFFFF' }, balanceCaption: { position: 'absolute', left: '8%', right: '8%', bottom: '7%', alignItems: 'center', backgroundColor: '#FFFFFF' }, highlightLabel: { alignSelf: 'center', maxWidth: '100%' }, activity: { color: '#202020', fontSize: 21, lineHeight: 28 }, sleep: { color: '#555', fontSize: 12, lineHeight: 18 }, handleTime: { position: 'absolute', color: '#292B25', fontSize: 10, lineHeight: 13, textAlign: 'center' }, handle: { position: 'absolute', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, taglineRow: { marginVertical: 10, alignItems: 'center' }, tagline: { color: '#45483F', textAlign: 'center', fontSize: 13, lineHeight: 23 }, controls: { flexDirection: 'row', gap: 8 }, timeButton: { flex: 1, minHeight: 66, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 }, timeLabel: { color: '#202020', fontSize: 12 }, timeValue: { color: '#202020', fontSize: 22, lineHeight: 28 }, chevron: { color: '#202020', marginLeft: 'auto' }, endChoice: { alignSelf: 'center', minWidth: 200, marginTop: 10 }, hint: { color: '#777', fontSize: 12, textAlign: 'center', marginVertical: 4 }, primary: { alignSelf: 'center', maxWidth: '95%', marginTop: 14, paddingHorizontal: 20, minHeight: 42, justifyContent: 'center', backgroundColor: '#C8EBDD' }, primaryText: { color: '#202020', fontSize: 15 }, secondary: { minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }, overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.2)' }, picker: { width: '100%', maxWidth: 360, padding: 18, backgroundColor: '#FFFFFF' }, pickerTitle: { color: '#202020', fontSize: 20 }, pickerActions: { flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }, save: { minWidth: 60, minHeight: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: '#C8EBDD' } });
