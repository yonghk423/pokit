import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { persistWorkStudyNotePageTitle } from '@entities/day-plan';

import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';

type Palette = StudyNoteDocumentPalette;

function resolveIdleTitle(value: string, fallback: string): string {
  const stored = value.trim();
  const fb = fallback.trim();
  return stored.length > 0 ? value : fb;
}

export function StudyNotePageTitleField({
  value,
  autoFallback,
  onChangeValue,
  palette,
}: {
  value: string;
  autoFallback: string;
  onChangeValue: (next: string) => void;
  palette: Palette;
}) {
  const fallbackTrimmed = autoFallback.trim();
  const idleTitle = resolveIdleTitle(value, fallbackTrimmed);

  const [draft, setDraft] = useState(idleTitle);
  const [focused, setFocused] = useState(false);
  const syncKeyRef = useRef(`${value}\0${fallbackTrimmed}`);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftRef = useRef(draft);
  const focusedRef = useRef(focused);
  const onChangeValueRef = useRef(onChangeValue);
  draftRef.current = draft;
  focusedRef.current = focused;
  onChangeValueRef.current = onChangeValue;

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) {
        clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      if (focusedRef.current) {
        const persisted = persistWorkStudyNotePageTitle(draftRef.current, fallbackTrimmed);
        if (persisted !== value) {
          onChangeValueRef.current(persisted);
        }
      }
    };
  }, [fallbackTrimmed, value]);

  useEffect(() => {
    const nextKey = `${value}\0${fallbackTrimmed}`;
    if (focused || syncKeyRef.current === nextKey) return;
    syncKeyRef.current = nextKey;
    setDraft(idleTitle);
  }, [value, fallbackTrimmed, focused, idleTitle]);

  const commitDraft = (raw: string) => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    const persisted = persistWorkStudyNotePageTitle(raw, fallbackTrimmed);
    syncKeyRef.current = `${persisted}\0${fallbackTrimmed}`;
    onChangeValueRef.current(persisted);
    setDraft(persisted.length > 0 ? persisted : fallbackTrimmed);
  };

  const scheduleCommitDraft = (raw: string) => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      commitDraft(raw);
    }, 350);
  };

  const handleFocus = () => {
    setFocused(true);
    setDraft(idleTitle);
  };

  const handleBlur = () => {
    setFocused(false);
    commitDraft(draft);
  };

  const handleChangeText = (text: string) => {
    setDraft(text);
    scheduleCommitDraft(text);
  };

  const inputValue = focused ? draft : idleTitle;

  return (
    <TextInput
      value={inputValue}
      onChangeText={handleChangeText}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={fallbackTrimmed}
      placeholderTextColor={palette.outline}
      style={[styles.titleInput, { color: palette.onSurface }]}
      maxLength={40}
      returnKeyType="done"
      onSubmitEditing={handleBlur}
      multiline={false}
      accessibilityRole="header"
      accessibilityLabel="메모 제목"
    />
  );
}

const styles = StyleSheet.create({
  titleInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
    padding: 0,
  },
});
