import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { persistWorkStudyNotePageTitle } from '@entities/day-plan';

import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';
import { ImeSafeTextInput } from './ImeSafeTextInput';

type Palette = StudyNoteDocumentPalette;

function hasCustomTitle(value: string, fallback: string): boolean {
  const stored = value.trim();
  const fb = fallback.trim();
  return stored.length > 0 && stored !== fb;
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
  const customTitle = useMemo(
    () => (hasCustomTitle(value, fallbackTrimmed) ? value : ''),
    [fallbackTrimmed, value],
  );

  return (
    <ImeSafeTextInput
      value={customTitle}
      onChangeText={(next) => {
        onChangeValue(persistWorkStudyNotePageTitle(next, fallbackTrimmed));
      }}
      placeholder={fallbackTrimmed}
      placeholderTextColor={palette.outline}
      style={[styles.titleInput, { color: palette.onSurface }]}
      maxLength={40}
      returnKeyType="done"
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
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.2,
    padding: 0,
  },
});
