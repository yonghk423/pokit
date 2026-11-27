import { useEffect, useRef, useState } from 'react';
import { AppAlert } from '@shared/lib/app-alert';
import { Keyboard, Pressable, ScrollView, View, StyleSheet } from 'react-native';
import Animated, { FadeInDown, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { ThemedText } from '@shared/ui/themed-text';
import { useTranslation } from '@shared/lib/i18n';
import { useAppFontSizeScale, useEffectiveAppFontId } from '@shared/lib/ui-font';
import { selectIsPro, useSubscriptionStore } from '@features/subscriptions/model/subscriptionStore';
import { getPostItInkColorPreset } from '@shared/lib/storage/postItInkColorStorage';
import { HanddrawnControl } from '@shared/ui/icon-symbol/handdrawnControls';
import { DiaryNoteColorPalette } from './DiaryNoteColorPalette';
import { usePremiumPackPaywall } from './usePremiumPackPaywall';
import { HeroInlineNote, type HeroInlineNoteHandle } from './HeroInlineNote';
import { NoteIllustrationPicker, noteSources } from './NoteIllustrationPicker';
import { Image } from 'expo-image';
import { calendarNoteStyle } from '../model/calendarNoteStyle';
import { readIndependentNotes, saveIndependentNotes, type CalendarNote, type CalendarTodo } from '../model/calendarNotes';

const TODO_ROW_ENTER = FadeInDown.duration(200).withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] }).reduceMotion(ReduceMotion.System);

// Called only by edit/press handlers, never while rendering.
const eventTimestamp = () => Date.now();
const newNoteId = () => `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const newTaskId = () => `todo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const copy = {
  ko: { deleteNote: '이 노트를 삭제할까요?', taskHint: '어떤 일을 해야 하나요?', hint: '기억하고 싶은 생각을 자유롭게 적어보세요.', add: '새 노트', list: '목록', back: '노트로 돌아가기', done: '완료', empty: '아직 노트가 없어요. 새 노트를 써보세요.', untitled: '새 노트' },
  en: { deleteNote: 'Delete this note?', taskHint: 'What needs to be done?', hint: 'Write down anything you want to remember.', add: 'New note', list: 'List', back: 'Back to note', done: 'Done', empty: 'No notes yet. Start a new note.', untitled: 'New note' },
  ja: { deleteNote: 'このノートを削除しますか？', taskHint: '何をする予定ですか？', hint: '覚えておきたいことを自由に書いてみましょう。', add: '新しいノート', list: '一覧', back: 'ノートに戻る', done: '完了', empty: 'ノートはまだありません。新しく書いてみましょう。', untitled: '新しいノート' },
  zh: { deleteNote: '要刪除這篇筆記嗎？', taskHint: '有什麼待辦事項？', hint: '自由寫下想記住的事。', add: '新增筆記', list: '列表', back: '返回筆記', done: '完成', empty: '還沒有筆記，開始寫一篇吧。', untitled: '新筆記' },
};

export function HeroCalendarNote({ design, height, keyboardVisible = false, onFocus }: { design: string; height: number; keyboardVisible?: boolean; onFocus: () => void }) {
  const { locale, t } = useTranslation();
  const paywall = usePremiumPackPaywall();
  const [colorOpen, setColorOpen] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const richInput = useRef<HeroInlineNoteHandle>(null);
  const colorLabel = locale === 'ko' ? '글자 색' : t('dayPlan.routineInkColorLabel');
  const insertIcon = async (id: string) => {
    if (!selectIsPro(useSubscriptionStore.getState())) {
      Keyboard.dismiss();
      await paywall.present();
      if (!selectIsPro(useSubscriptionStore.getState())) return;
    }
    const target = mode === 'todo' ? todoInputs.current[activeTodo.current ?? ''] : richInput.current;
    target?.insertIllustration(id);
  };
  const language = locale === 'ko' ? 'ko' : locale === 'ja' ? 'ja' : locale.startsWith('zh') ? 'zh' : 'en';
  const labels = { ...copy[language], list: 'List', add: 'New Note', hint: 'Write a little...', back: 'Back to note' };
  const theme = calendarNoteStyle(design);
  const headerInk = theme.headerInk ?? theme.ink;
  const [notes, setNotes] = useState(() => readIndependentNotes());
  const [selected, setSelected] = useState(() => notes[0]?.id ?? 'draft');
  const [mode, setMode] = useState<'note' | 'todo'>('note');
  const [listing, setListing] = useState(false);
  useEffect(() => {
    const listener = Keyboard.addListener('keyboardDidHide', () => { setColorOpen(false); setIconsOpen(false); });
    return () => listener.remove();
  }, []);
  const todoInputs = useRef<Record<string, HeroInlineNoteHandle | null>>({});
  const [todoHeights, setTodoHeights] = useState<Record<string, number>>({});

  const [focusRequest, requestFocus] = useState(0);
  const todoScroll = useRef<ScrollView>(null);
  const activeTodo = useRef<string | null>(null);
  const todoLayouts = useRef<Record<string, { y: number; height: number }>>({});
  const [todoViewport, setTodoViewport] = useState(240);
  const revealTodo = (id: string) => {
    const row = todoLayouts.current[id];
    if (row && activeTodo.current === id) todoScroll.current?.scrollTo({ y: Math.max(0, row.y - 12), animated: true });
  };
  const fontScale = useAppFontSizeScale(useEffectiveAppFontId());
  const lineHeight = Math.round(theme.lineSpacing * fontScale);
  const todoLineHeight = 25 * fontScale;
  const todoControlHeight = Math.max(48, todoLineHeight);
  const todoTextInset = (todoControlHeight - todoLineHeight) / 2;
  const note = notes.find(item => item.id === selected);
  const bodyInk = note?.inkHex || getPostItInkColorPreset(note?.inkColorId).hex || theme.ink;
  const updateInk = async (inkHex?: string) => {
    if (!selectIsPro(useSubscriptionStore.getState())) {
      setColorOpen(false);
      Keyboard.dismiss();
      await paywall.present();
      if (!selectIsPro(useSubscriptionStore.getState())) return;
    }
    const entry = { ...note, id: selected, text: note?.text ?? '', inkHex, inkColorId: null, updatedAt: eventTimestamp() };
    commit(note ? notes.map(item => item.id === selected ? entry : item) : [entry, ...notes]);
    setColorOpen(false);
  };
  const commit = (next: CalendarNote[]) => { saveIndependentNotes(next); setNotes(next); };
  const confirmDelete = (item: CalendarNote, title: string) => {
    AppAlert.alert(labels.deleteNote, title, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => {
        const remaining = readIndependentNotes().filter(entry => entry.id !== item.id);
        commit(remaining);
        if (selected === item.id) {
          setSelected(remaining[0]?.id ?? newNoteId());
          setMode('note');
        }
      } },
    ]);
  };
  const todos = note?.todos ?? [];
  const [draftTodoId, setDraftTodoId] = useState(newTaskId);
  const displayedTodos: CalendarTodo[] = [...todos, { id: draftTodoId, text: '', completed: false }];
  const handleUpdateTodos = (next: CalendarTodo[]) => {
    const entry = { ...note, id: selected, text: note?.text ?? '', todos: next, updatedAt: eventTimestamp() };
    commit(note ? notes.map(item => item.id === selected ? entry : item) : [entry, ...notes]);
  };
  useEffect(() => {
    if (focusRequest > 0) richInput.current?.focus();
  }, [focusRequest]);
  const add = () => {
    // Reuse an empty page rather than accumulating blank notes.
    const blank = notes.find(item => !item.text.trim() && !item.todos?.length && !item.inlineDocument?.icons.length);
    const id = blank?.id ?? newNoteId();
    setMode('note');
    setSelected(id);
    setListing(false);
    if (!blank) commit([{ id, text: '', updatedAt: eventTimestamp() }, ...notes]);
    requestFocus(value => value + 1);
    onFocus();
  };
  const buttonStyle = { minHeight: 44, minWidth: 44, justifyContent: 'center' as const };
  return <View testID="calendar-note" style={{ height, backgroundColor: theme.paper, paddingBottom: !listing && keyboardVisible ? 44 : 0 }}>
    <View style={{ paddingHorizontal: 20, paddingTop: 12, backgroundColor: theme.headerPaper ?? theme.paper, borderBottomWidth: theme.headingRuleWidth, borderBottomColor: theme.rule }}>
      <View style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 12 }}>
        <ThemedText accessibilityRole="header" style={{ fontSize: theme.titleSize, lineHeight: 32, letterSpacing: theme.titleTracking, fontWeight: theme.titleWeight, color: headerInk, flexGrow: 1 }}>Notes</ThemedText>

      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <Pressable testID="calendar-note-list" accessibilityRole="button" accessibilityLabel={listing ? labels.back : labels.list} accessibilityState={{ expanded: listing }} onPress={() => { richInput.current?.blur(); Keyboard.dismiss(); setListing(value => !value); }} style={buttonStyle}>
          <>{listing ? <Svg width={24} height={24} viewBox="0 0 24 24"><Path d="M20 12H4m6-6-6 6 6 6" fill="none" stroke={headerInk} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /></Svg> : <ThemedText style={{ fontSize: 15, color: headerInk }}>{`${labels.list} (${notes.length})`}</ThemedText>}</>
        </Pressable>
        <Pressable testID="calendar-note-add" accessibilityRole="button" accessibilityLabel={labels.add} onPress={add} style={buttonStyle}>
          <ThemedText style={{ fontSize: 16, color: headerInk, fontWeight: '600' }}>＋ {labels.add}</ThemedText>
        </Pressable>
      </View>
    </View>
    <Animated.View layout={LinearTransition.duration(180).reduceMotion(ReduceMotion.System)} style={{ flex: 1, overflow: 'hidden' }}>
    <Animated.View key={listing ? 'list' : 'editor'} entering={FadeInDown.duration(180).reduceMotion(ReduceMotion.System)} style={{ flex: 1 }}>
    {!listing && <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 24, alignItems: 'center' }}>
      {(['note', 'todo'] as const).map(value => <Pressable key={value} testID={`calendar-mode-${value}`} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} onPress={() => { richInput.current?.blur(); Keyboard.dismiss(); setColorOpen(false); setIconsOpen(false); setMode(value); }} style={{ minHeight: 44, justifyContent: 'center', borderBottomWidth: mode === value ? 1 : 0, borderColor: theme.ink }}><ThemedText style={{ color: theme.ink, opacity: mode === value ? 1 : .6 }}>{value === 'note' ? 'Note' : `To-do (${todos.filter(item => item.completed).length}/${todos.length})`}</ThemedText></Pressable>)}
    </View>}
    <View style={{ flex: 1, backgroundColor: theme.paper, overflow: 'hidden' }}>

      {listing ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20 }}>
        {notes.length === 0 ? <ThemedText style={{ paddingVertical: 20, color: theme.ink }}>{labels.empty}</ThemedText> : notes.map(item => {
          const preview = item.text.trim() || item.todos?.find(todo => todo.text.trim())?.text || labels.untitled;
          const title = preview.split('\n')[0];
          return <View key={item.id} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: .5, borderColor: theme.rule }}>
            <Pressable accessibilityRole="button" onPress={() => { setSelected(item.id); setListing(false); }} style={{ flex: 1, paddingVertical: 14 }}>
              <ThemedText numberOfLines={2} style={{ color: theme.ink }}>{preview}</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('common.delete')} · ${title}`} onPress={() => confirmDelete(item, title)} style={{ ...buttonStyle, alignItems: 'center' }}>
              <Svg width={19} height={19} viewBox="0 0 24 24" accessible={false}><Path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 10.5v6M14 10.5v6" fill="none" stroke={theme.ink} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" /></Svg>
            </Pressable>
          </View>;
        })}
      </ScrollView> : mode === 'todo' ? <ScrollView ref={todoScroll} onLayout={event => { setTodoViewport(event.nativeEvent.layout.height); if (activeTodo.current) revealTodo(activeTodo.current); }} keyboardDismissMode="none" nestedScrollEnabled keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}>
        {displayedTodos.map(todo => <Animated.View key={todo.id} entering={todo.id === draftTodoId ? TODO_ROW_ENTER : undefined} onLayout={event => { todoLayouts.current[todo.id] = event.nativeEvent.layout; }} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: .5, borderColor: theme.rule }}>
          <Pressable testID={`todo-check-${todo.id}`} accessibilityRole="checkbox" accessibilityLabel={todo.text || 'Task'} accessibilityState={{ checked: todo.completed, disabled: todo.id === draftTodoId }} disabled={todo.id === draftTodoId} onPress={() => handleUpdateTodos(todos.map(item => item.id === todo.id ? { ...item, completed: !item.completed } : item))} style={{ minWidth: 44, height: todoControlHeight, justifyContent: 'center' }}><Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}><Rect x={3} y={3} width={18} height={18} rx={4} fill={todo.completed ? theme.ink : 'none'} fillOpacity={todo.completed ? .1 : 1} stroke={theme.ink} strokeOpacity={todo.completed ? .65 : .4} strokeWidth={1.3} />{todo.completed && <Path d="m7.5 12 3 3 6-6" fill="none" stroke={theme.ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />}</Svg></Pressable>
          <View style={{ flex: 1, height: Math.max(48, Math.min(todoHeights[todo.id] ?? 50, Math.max(80, todoViewport - 24))), marginTop: todoTextInset, opacity: todo.completed ? .55 : 1 }}>
            <HeroInlineNote ref={handle => { todoInputs.current[todo.id] = handle; }} testID={todo.id === draftTodoId ? 'todo-draft-input' : `todo-text-${todo.id}`}
              storageKey={`pokit:independent-note:${selected}:todo:${todo.id}`} sources={noteSources} ink={bodyInk} placeholder={labels.taskHint} completed={todo.completed}
              initialDocument={todo.inlineDocument ?? { text: todo.text, icons: [] }}
              onContentHeight={value => setTodoHeights(previous => previous[todo.id] === value ? previous : { ...previous, [todo.id]: value })}
              onDocumentChange={document => {
                const entry = { ...todo, text: document.text.replace(/\uFFFC/g, ''), inlineDocument: document };
                if (todo.id === draftTodoId) {
                  if (!entry.text.trim() && !document.icons.length) return;
                  handleUpdateTodos([...todos, entry]); setDraftTodoId(newTaskId());
                } else handleUpdateTodos(todos.map(item => item.id === todo.id ? entry : item));
              }}
              onFocusChange={focused => { if (focused) { activeTodo.current = todo.id; onFocus(); revealTodo(todo.id); } }} onIllustrationInserted={() => {}} />
          </View>
          {todo.id !== draftTodoId ? <Pressable testID={`todo-delete-${todo.id}`} accessibilityRole="button" accessibilityLabel={`Delete ${todo.text || 'task'}`} onPress={() => handleUpdateTodos(todos.filter(item => item.id !== todo.id))} style={{ minWidth: 44, height: todoControlHeight, alignItems: 'center', justifyContent: 'center' }}><ThemedText style={{ color: theme.ink }}>×</ThemedText></Pressable> : <View style={{ width: 44 }} />}
        </Animated.View>)}
      </ScrollView> : <>
        <View style={{ flex: 1, marginHorizontal: 20, marginTop: 16 }}>
          <HeroInlineNote key={selected} ref={richInput} storageKey={`pokit:independent-note:${selected}`} sources={noteSources} ruled={{ color: theme.rule, lineHeight }} ink={bodyInk} placeholder=""
            initialDocument={note?.inlineDocument ?? { text: note?.text ?? '', icons: [] }}
            onDocumentChange={document => {
              const entry = { ...note, id: selected, text: document.text.replace(/\uFFFC/g, ''), inlineDocument: document, updatedAt: eventTimestamp() };
              commit(note ? notes.map(item => item.id === selected ? entry : item) : [entry, ...notes]);
            }}
            onFocusChange={focused => { if (focused) onFocus(); }} onIllustrationInserted={() => {}} />
        </View>
      </>}
    </View>
    </Animated.View>
    </Animated.View>
    {!listing && keyboardVisible && <View testID="note-writing-toolbar" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10, backgroundColor: theme.paper }}>
      {(colorOpen || iconsOpen) && <View style={{ position: 'absolute', bottom: 44, left: 0, right: 0, height: 188, backgroundColor: theme.paper }}>
        {iconsOpen ? <NoteIllustrationPicker onSelect={insertIcon} ink={theme.ink} /> : <ScrollView style={{ flex: 1 }} bounces={false} keyboardShouldPersistTaps="always" contentContainerStyle={{ padding: 0 }}><DiaryNoteColorPalette value={note?.inkHex ?? (getPostItInkColorPreset(note?.inkColorId).hex || undefined)} onChange={updateInk} isDark={false} label={colorLabel} /></ScrollView>}
      </View>}
      <View style={{ marginHorizontal: 20, height: 44, borderTopWidth: colorOpen || iconsOpen ? 0 : StyleSheet.hairlineWidth, borderTopColor: theme.rule, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48, gap: 12 }}>
        <Pressable testID="note-text-color" accessibilityRole="button" accessibilityState={{ expanded: colorOpen }} onPress={() => { setIconsOpen(false); setColorOpen(value => !value); }} style={{ minWidth: 44, flexShrink: 1, minHeight: 44, justifyContent: 'center', alignItems: 'center' }}><ThemedText style={{ fontSize: 15, textAlign: 'center', color: theme.ink }}>{colorLabel}</ThemedText></Pressable>
        <Pressable testID="note-illustrations" accessibilityRole="button" accessibilityLabel={locale === 'ko' ? '아이콘 추가' : 'Insert icon'} onPress={() => { setColorOpen(false); setIconsOpen(value => !value); }} style={{ width: 48, height: 44, justifyContent: 'center', alignItems: 'center' }}><Image source={noteSources.checklist} contentFit="contain" style={{ width: 28, height: 30 }} /></Pressable>
        <Pressable testID="note-dismiss-keyboard" accessibilityRole="button" accessibilityLabel="Hide keyboard" onPress={() => { todoInputs.current[activeTodo.current ?? '']?.blur(); richInput.current?.blur(); setColorOpen(false); setIconsOpen(false); Keyboard.dismiss(); }} style={{ position: 'absolute', right: 0, width: 48, height: 44, justifyContent: 'center', alignItems: 'center' }}><HanddrawnControl name="keyboard.chevron.compact.down" size={26} color={theme.ink} /></Pressable>
      </View>
    </View>}
    {paywall.modal}
  </View>;
}

