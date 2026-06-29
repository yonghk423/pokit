import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { persistRoutineDisplayName } from '@entities/day-plan/lib/routineDisplayName';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from './settingsPalette';

export type RoutineRenameLockedReason = 'running' | 'today';

const LOCK_MESSAGES: Record<RoutineRenameLockedReason, string> = {
  running: '실행 중일 때는 이름을 변경할 수 없어요',
  today: '오늘 일정에서는 이름을 변경할 수 없어요',
};

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

function resolveIdleTitle(value: string, fallback: string): string {
  const stored = value.trim();
  const fb = fallback.trim();
  return stored.length > 0 ? value : fb;
}

export function RoutineTitleField({
  value,
  onChangeValue,
  fallback,
  allowRename,
  renameLockedReason = null,
  palette,
  size = 'large',
  placeholder = '',
}: {
  value: string;
  onChangeValue: (next: string) => void;
  fallback: string;
  allowRename: boolean;
  renameLockedReason?: RoutineRenameLockedReason | null;
  palette: Palette;
  size?: 'large' | 'compact';
  placeholder?: string;
}) {
  const titleStyle = size === 'large' ? styles.mainTitleLarge : styles.mainTitleCompact;
  const titleInputStyle = size === 'large' ? styles.mainTitleInputLarge : styles.mainTitleInputCompact;
  const fallbackTrimmed = fallback.trim();
  const idleTitle = resolveIdleTitle(value, fallbackTrimmed);

  const [draft, setDraft] = useState(idleTitle);
  const [focused, setFocused] = useState(false);
  const syncKeyRef = useRef(`${value}\0${fallbackTrimmed}`);

  useEffect(() => {
    const nextKey = `${value}\0${fallbackTrimmed}`;
    if (focused || syncKeyRef.current === nextKey) return;
    syncKeyRef.current = nextKey;
    setDraft(idleTitle);
  }, [value, fallbackTrimmed, focused, idleTitle]);

  const commitDraft = (raw: string) => {
    const persisted = persistRoutineDisplayName(raw, fallbackTrimmed);
    syncKeyRef.current = `${persisted}\0${fallbackTrimmed}`;
    onChangeValue(persisted);
    setDraft(persisted.length > 0 ? persisted : fallbackTrimmed);
  };

  const handleFocus = () => {
    setFocused(true);
    setDraft(value.trim().length > 0 ? value : fallbackTrimmed);
  };

  const handleBlur = () => {
    setFocused(false);
    commitDraft(draft);
  };

  const handleChangeText = (text: string) => {
    setDraft(text);
    onChangeValue(text);
  };

  const inputValue = focused ? draft : idleTitle;

  return (
    <View style={styles.listHeader}>
      {allowRename ? (
        <TextInput
          value={inputValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={palette.outline}
          style={[titleInputStyle, { color: palette.onSurface }]}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={handleBlur}
        />
      ) : (
        <ThemedText
          style={[
            titleStyle,
            { color: renameLockedReason ? palette.onVariant : palette.onSurface },
          ]}>
          {idleTitle}
        </ThemedText>
      )}
      {renameLockedReason ? (
        <View style={styles.renameLockRow}>
          <IconSymbol name="lock.fill" size={13} color={palette.onVariant} />
          <ThemedText style={[styles.renameLockHint, { color: palette.onVariant }]}>
            {LOCK_MESSAGES[renameLockedReason]}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listHeader: { gap: 6, paddingTop: 2 },
  renameLockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  renameLockHint: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  mainTitleLarge: { fontSize: 42, lineHeight: 46, fontWeight: '700', letterSpacing: -1.2 },
  mainTitleInputLarge: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -1.2,
    padding: 0,
  },
  mainTitleCompact: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4 },
  mainTitleInputCompact: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    padding: 0,
  },
});
