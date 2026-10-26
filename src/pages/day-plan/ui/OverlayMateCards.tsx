import { MateGridCard } from './MateGridCard';
import { captureMateCardFront } from '../lib/captureMateCardFront';
import { HeroCardFlip, type HeroCardFlipHandle, type HeroCardOpen } from './HeroCardFlip';
import { CardToolsFab, type CardToolAction } from './CardToolsFab';
import { AppAlert as Alert } from '@shared/lib/app-alert';
import { TutorialGuideLayer } from '@shared/ui/tutorial-guide-layer';
import { ServiceTutorialTarget } from '../../welcome-intro/ui/ServiceTutorialTarget';
import { useServiceTutorial, completeTutorialMateClose } from '../../welcome-intro/model/serviceTutorial';
import { ServiceTutorialCoach } from '../../welcome-intro/ui/ServiceTutorialCoach';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { FEATURE_FLAGS } from '@shared/config/featureFlags';
import { tapHaptic } from '@shared/lib/haptics/tapHaptic';
import { useTranslation } from '@shared/lib/i18n';
import { CompletionRadioButton } from '@shared/ui/completion-radio-button';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { PaperControl } from '@shared/ui/paper-control';
import { PaperGrain } from '@shared/ui/paper-grain';
import { RoutineCardAddIcon } from '@shared/ui/routine-wheel-add-button';
import { HeaderIcon } from '@shared/ui/header-icon';
import { ThemedText } from '@shared/ui/themed-text';
import type { CircularRoutineItem } from './CircularRoutineTimetable';
import { rhythmCardDate } from '../lib/mateCardDate';
import { RhythmEmptyState } from './MateEmptyState';
const SHOW_CARD_ROUTINE_TIME = FEATURE_FLAGS.cardRoutineTimeEdit;
const SHOW_CARD_COMPLETE = false;

function cardColors(item: CircularRoutineItem, _slot: number, isDark: boolean) {
  return {
    paper: item.faceColor ?? (isDark ? '#3A3C52' : '#FFFFFF'),
    ink: item.inkColor ?? '#000000',
  };
}

function CardDate({ dateKey, ink, scale = 1, compact = false }: { dateKey?: string; ink: string; scale?: number; compact?: boolean }) {
  const date = rhythmCardDate(dateKey);
  if (!date) return null;
  return <View accessible accessibilityLabel={dateKey} style={s.cardDate}>
    <ThemedText accessible={false} numberOfLines={1} style={{ color: ink, fontSize: (compact ? 24 : 44) * scale, lineHeight: (compact ? 27 : 48) * scale }}>{date.day}</ThemedText>
    <ThemedText accessible={false} numberOfLines={1} style={{ color: ink, fontSize: (compact ? 8 : 12) * scale, lineHeight: (compact ? 12 : 17) * scale }}>{date.monthYear}</ThemedText>
  </View>;
}

function ExpandedRhythmCard({ item, slot, card, isDark, renderDetail, onClose, onFrontReady, onRestoreFront, onComplete, onEditTime }: {
  item: CircularRoutineItem; slot: number; card: HeroCardOpen | null; isDark: boolean;
  onFrontReady: () => void; onRestoreFront: () => void;
  renderDetail: (item: CircularRoutineItem) => ReactNode; onClose: () => void; onComplete: (key: string) => void;
  onEditTime?: (key: string, label: string) => void;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const sourceWidth = Math.min(width - 24, 580);
  const tutorialClosing = useServiceTutorial(state => state.active && state.mode === 'rhythm' && ['rhythmRecord', 'rhythmCheck'].includes(state.step));
  useEffect(() => {
    const tutorial = useServiceTutorial.getState();
    if (tutorial.routineKey === item.key || item.key.startsWith(`${tutorial.routineKey}::instance:`)) tutorial.advance('rhythmOpen', 'rhythmRecord');
  }, [item.key]);
  const flip = useRef<HeroCardFlipHandle>(null);
  const colors = cardColors(item, slot, isDark);
  const close = () => flip.current?.close();
  return <HeroCardFlip ref={flip} card={card} isDark={isDark} paper={colors.paper} closeLabel={t('common.close')}
    fallbackFront={<View style={{ flex: 1, padding: 16 }}><MateGridCard item={item} isDark={isDark} width={sourceWidth - 32} height={328} /></View>} onClosed={onClose} onFrontReady={onFrontReady} onRestoreFront={onRestoreFront} cornerRadius={16}
    loadingContent={<View style={{ flex: 1, padding: 18, gap: 24 }}>
      <PaperGrain opacity={0.2} />
      <View style={{ height: 44, width: '60%', backgroundColor: isDark ? '#FFFFFF12' : '#6F59420D' }} />
      {[100, 180, 120].map((height, index) => <View key={index} style={{ height, backgroundColor: isDark ? '#FFFFFF12' : '#6F59420D' }} />)}
    </View>}>
    <View testID="rhythm-card-detail-panel" style={{ flex: 1 }}>
      <ServiceTutorialTarget steps={['rhythmRecord', 'rhythmCheck']} spotlight={false} style={{ flex: 1 }}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: 'hidden' }]}>
        <PaperGrain opacity={0.2} />
      </View>
      <View style={s.expandedContent}>
        <View style={s.detailHead}>
          <IconSymbol name={item.icon} size={46} color={colors.ink} />
          <View style={s.detailTitleBlock}>
            <ThemedText style={[s.detailTitle, { color: colors.ink }]} numberOfLines={2}>{item.label}</ThemedText>
            {SHOW_CARD_ROUTINE_TIME ? (
              <Pressable accessibilityRole="button" disabled={!onEditTime} accessibilityLabel={item.timeLabel ? t('todo.timeA11y', { time: item.timeLabel }) : t('dayPlan.timeUnsetA11y')} onPress={() => { tapHaptic(); onEditTime?.(item.key, item.label); }} style={s.detailTime}>
                <IconSymbol name="clock" size={15} color={colors.ink} />
                <ThemedText style={{ color: colors.ink, fontSize: 14 }}>{item.timeLabel ?? t('dayPlan.timeUnsetHint')}</ThemedText>
                {onEditTime ? <IconSymbol name="pencil" size={15} color={colors.ink} /> : null}
              </Pressable>
            ) : null}
          </View>
          <CardDate dateKey={item.dateKey} ink={colors.ink} compact />
          <ServiceTutorialTarget steps={['rhythmRecord', 'rhythmCheck']}><Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} style={s.closeHit}><ThemedText style={{ color: colors.ink, fontSize: 28 }}>×</ThemedText></Pressable></ServiceTutorialTarget>
        </View>
        <ServiceTutorialCoach steps={['rhythmRecord', 'rhythmCheck', 'rhythmSuccess']} onSkip={close} onEnd={close} />
        <ScrollView testID="rhythm-card-detail-scroll" keyboardShouldPersistTaps="handled" nestedScrollEnabled contentContainerStyle={s.detailBody}>
          {renderDetail({ ...item, faceColor: colors.paper, inkColor: colors.ink })}
        </ScrollView>
        <View style={s.detailFooter}>
          {SHOW_CARD_COMPLETE ? (
            <View style={s.complete}>
              <CompletionRadioButton checked={item.completed} isDark={isDark} size={25} appearance="ink" motion="gentle" uncheckedColor={colors.ink} accessibilityLabel={t(item.completed ? 'dayPlan.completeCancelA11y' : 'dayPlan.completeA11y', { label: item.label })} onPress={() => onComplete(item.key)} />
              <ThemedText style={{ color: colors.ink, fontSize: 13 }}>{t('common.complete')}</ThemedText>
            </View>
          ) : null}
          <ServiceTutorialTarget steps={['rhythmRecord', 'rhythmCheck']} style={{ marginLeft: 'auto' }}>
            <PaperControl accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={close} style={[s.closeButton, tutorialClosing && { backgroundColor: '#BDE8DF', borderColor: '#57A792' }]}><ThemedText style={{ color: '#000000', fontSize: 14 }}>{t('common.close')}</ThemedText></PaperControl>
          </ServiceTutorialTarget>
        </View>
      </View>
      </ServiceTutorialTarget>
    </View>
  </HeroCardFlip>;
}

/** Existing mate data is presented as books; record editors remain on the reverse. */
export function OverlayRhythmCards({ items, width, height, ink, muted, isDark, renderDetail, onComplete, onRemoveMany, onAdd, onSchedule, onEditTime }: {
  items: CircularRoutineItem[]; width: number; height: number; ink: string; muted: string; isDark: boolean;
  renderDetail: (item: CircularRoutineItem) => ReactNode; onComplete: (key: string) => void;
  onExcludeFromToday?: (key: string, label: string) => void; onRemoveMany?: (keys: string[]) => void;
  onAdd: () => void; onSchedule?: () => void; onEditTime?: (key: string, label: string) => void;
}) {
  const { t } = useTranslation();
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<{ key: string; index: number; card: HeroCardOpen | null } | null>(null);
  const [frontHidden, setFrontHidden] = useState(false);
  const opening = useRef(false);
  const [openingSize, setOpeningSize] = useState<{ width: number; height: number } | null>(null);
  const gridNodes = useRef(new Map<string, View>());
  const gridWidth = ((openingSize?.width ?? width) - 44) / 3;
  const gridHeight = gridWidth * 1.7;
  const currentItems = useRef(items);
  useEffect(() => { currentItems.current = items; }, [items]);
  const request = useRef(0);
  const captures = useRef<string[]>([]);
  const hideFront = useCallback(() => setFrontHidden(true), []);
  const restoreFront = useCallback(() => setFrontHidden(false), []);
  const releaseCaptures = useCallback(() => {
    if (!captures.current.length) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { releaseCapture } = require('react-native-view-shot') as typeof import('react-native-view-shot');
      captures.current.splice(0).forEach(uri => releaseCapture(uri));
    } catch { captures.current = []; }
  }, []);
  useEffect(() => () => { request.current++; releaseCaptures(); }, [releaseCaptures]);
  const close = useCallback(() => {
    if (expanded) completeTutorialMateClose(expanded.key);
    request.current++; opening.current = false;
    setExpanded(null); setFrontHidden(false); setOpeningSize(null); releaseCaptures();
  }, [expanded, releaseCaptures]);
  const selected = expanded ? items.find(item => item.key === expanded.key) : undefined;
  useEffect(() => {
    if (expanded && !selected) {
      // The catalog can remove an item while its editor is open.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      close();
    }
  }, [expanded, selected, close]);
  const openBook = async (item: CircularRoutineItem, index: number, node: View | null) => {
    if (opening.current) return;
    opening.current = true;
    setOpeningSize({ width, height });
    const fallbackFront = () => <MateGridCard item={currentItems.current.find(value => value.key === item.key) ?? item} width={gridWidth} height={gridHeight} isDark={isDark} />;
    const current = ++request.current;
    const snapshot = node ? await captureMateCardFront(node, fallbackFront) : null;
    if (snapshot?.uri) captures.current.push(snapshot.uri);
    if (request.current !== current) { releaseCaptures(); return; }
    setExpanded({ key: item.key, index, card: snapshot ? { ...snapshot.card, readCurrent: complete => {
      restoreFront();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!node) { complete(null); return; }
        void captureMateCardFront(node, fallbackFront).then(result => {
          if (result?.uri) captures.current.push(result.uri);
          complete(result?.card ?? null);
        });
      }));
    } } : null });
  };
  const tutorialStep = useServiceTutorial(state => state.active && state.mode === 'rhythm' ? state.step : null);
  const tutorialRoutineKey = useServiceTutorial(state => state.routineKey);
  useEffect(() => {
    if (tutorialStep !== 'rhythmRecord' || !tutorialRoutineKey || expanded || opening.current) return;
    const index = items.findIndex(item => item.key.split('::instance:')[0] === tutorialRoutineKey);
    // Creation can finish after the guide advances; wait for its item to arrive.
    if (index < 0) return;
    opening.current = true;
    setOpeningSize({ width, height });
    setExpanded({ key: items[index].key, index, card: null });
  }, [tutorialStep, tutorialRoutineKey, items, expanded, width, height]);
  const pickedKeys = selectedKeys.filter(key => items.some(item => item.key === key));
  const background = isDark ? '#262B28' : '#F7F6F4';
  return <TutorialGuideLayer><View style={[s.root, { backgroundColor: background }]}>
    <PaperGrain opacity={0.2} />
    {!selected ? <ServiceTutorialCoach steps={['rhythmAdd', 'rhythmPicker', 'rhythmOpen', 'rhythmRecord', 'rhythmCheck', 'rhythmSuccess']} onSkipStep={() => { if (useServiceTutorial.getState().step === 'rhythmPicker') onAdd(); }} /> : null}
    <View testID="rhythm-card-background" pointerEvents={selected ? 'none' : 'auto'} style={s.root} accessibilityElementsHidden={!!selected} importantForAccessibility={selected ? 'no-hide-descendants' : 'auto'}>
      <ScrollView testID="mate-overview" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 20, paddingBottom: 160, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {items.map((item, index) => <ServiceTutorialTarget key={item.key} steps={index === 0 ? ['rhythmOpen'] : []}>
          <Pressable testID={`mate-overview-${item.key}`} accessibilityRole={deleteMode ? 'checkbox' : 'button'} accessibilityLabel={item.label} accessibilityState={deleteMode ? { checked: pickedKeys.includes(item.key) } : undefined} onPress={() => { tapHaptic(); if (deleteMode) setSelectedKeys(keys => keys.includes(item.key) ? keys.filter(key => key !== item.key) : [...keys, item.key]); else void openBook(item, index, gridNodes.current.get(item.key) ?? null); }} style={{ width: gridWidth, height: gridHeight, shadowColor: '#6F5942', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 5 } }}>
            <View ref={node => { if (node) gridNodes.current.set(item.key, node); else gridNodes.current.delete(item.key); }} collapsable={false} style={{ opacity: frontHidden && selected?.key === item.key ? 0 : 1 }}><MateGridCard item={item} width={gridWidth} height={gridHeight} isDark={isDark} /></View>
            {deleteMode && <View style={{ position: 'absolute', top: 6, right: 6 }}><ThemedText style={{ color: '#000000' }}>{pickedKeys.includes(item.key) ? '✓' : '○'}</ThemedText></View>}
          </Pressable>
        </ServiceTutorialTarget>)}
        {!items.length && <View style={{ width: '100%', minHeight: Math.max(240, height - 220), alignItems: 'center', justifyContent: 'center' }}>
          <RhythmEmptyState testID="mate-shelf-add" ended={false} ink={ink} muted={muted} presentation="cards" onAdd={onAdd} />
        </View>}
      </ScrollView>
      {deleteMode ? <View style={[s.deleteToolbar, { backgroundColor: background }]}>
        <PaperControl accessibilityRole="button" accessibilityLabel={t('common.cancel')} onPress={() => { setDeleteMode(false); setSelectedKeys([]); }} style={s.deleteToolbarButton}><ThemedText style={{ color: ink }}>{t('common.cancel')}</ThemedText></PaperControl>
        <PaperControl accessibilityRole="button" accessibilityLabel={t('comicDay.selectAll')} onPress={() => setSelectedKeys(items.map(item => item.key))} style={s.deleteToolbarButton}><ThemedText style={{ color: ink }}>{t('comicDay.selectAll')}</ThemedText></PaperControl>
        <PaperControl testID="rhythm-cards-delete-selected" accessibilityRole="button" accessibilityLabel={`${t('common.delete')} (${pickedKeys.length})`} disabled={!pickedKeys.length} onPress={() => {
          if (!pickedKeys.length || !onRemoveMany) return;
          Alert.alert(t('dayPlan.endTodayTitle'), t('dayPlan.cardsDeleteSelectedMessage', { count: pickedKeys.length }), [
            { text: t('common.cancel'), style: 'cancel' },
            { text: t('common.delete'), style: 'destructive', onPress: () => { onRemoveMany(pickedKeys); setSelectedKeys([]); setDeleteMode(false); tapHaptic('confirm'); } },
          ]);
        }} style={[s.deleteToolbarButton, { opacity: pickedKeys.length ? 1 : 0.4 }]}><ThemedText style={{ color: ink }}>{t('common.delete')} ({pickedKeys.length})</ThemedText></PaperControl>
      </View> : <CardToolsFab isDark={isDark} overview={true} concept="bag" actions={[
        { key: 'add', testID: 'rhythm-card-add', label: t('dayPlan.addMoreRoutine'), onPress: onAdd, icon: <RoutineCardAddIcon size={26} ink={ink} /> },
        ...(items.length && onRemoveMany ? [{ key: 'delete', testID: 'rhythm-card-delete-mode', label: t('todo.deleteModeOn'), onPress: () => { setSelectedKeys([]); setDeleteMode(true); }, icon: <IconSymbol name="trash" size={27} color={ink} /> } satisfies CardToolAction] : []),
        ...(onSchedule ? [{ key: 'schedule', testID: 'rhythm-card-schedule', label: t('dayPlan.scheduledRoutine.calendarA11y'), onPress: onSchedule, icon: <HeaderIcon name="calendar" size={22} /> } satisfies CardToolAction] : []),
      ]} />}
    </View>
    {expanded && selected ? <ExpandedRhythmCard key={selected.key} item={selected} slot={expanded.index} card={expanded.card} onFrontReady={hideFront} onRestoreFront={restoreFront} isDark={isDark} renderDetail={renderDetail} onClose={close} onComplete={onComplete} onEditTime={onEditTime} /> : null}
  </View></TutorialGuideLayer>;
}
const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  deleteToolbar: { position: 'absolute', left: 10, right: 10, bottom: 20, flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8 },
  deleteToolbarButton: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 },
  cardDate: { alignItems: 'flex-end', flexShrink: 0 },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandedContent: { flex: 1, minHeight: 0 },
  detailHead: { flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingTop: 12, paddingBottom: 10, gap: 10 },
  detailTitleBlock: { flex: 1, minWidth: 0 },
  detailTitle: { fontSize: 20, lineHeight: 27 },
  detailTime: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, minHeight: 36 },
  detailBody: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 28 },
  detailFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  closeHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  complete: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  closeButton: { marginLeft: 'auto', minWidth: 76, minHeight: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#5F655C', borderRadius: 4 },
});
