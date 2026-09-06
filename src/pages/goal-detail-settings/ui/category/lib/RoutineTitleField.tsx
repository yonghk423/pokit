import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { persistRoutineDisplayName } from '@entities/day-plan/lib/routineDisplayName';
import { t, useTranslation, type I18nKey } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';
import { ThemedTextInput } from '@shared/ui/themed-text-input';

import type { goalDetailSettingsPalette } from './settingsPalette';

export type RoutineRenameLockedReason = 'running' | 'today';

const ROUTINE_RENAME_LOCK_KEYS: Record<RoutineRenameLockedReason, I18nKey> = {
  running: 'goalDetail.renameLock.running',
  today: 'goalDetail.renameLock.today',
};

export function getRoutineRenameLockMessage(reason: RoutineRenameLockedReason): string {
  return t(ROUTINE_RENAME_LOCK_KEYS[reason]);
}

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
  placeholder,
  showLockHint = true,
}: {
  value: string;
  onChangeValue: (next: string) => void;
  fallback: string;
  allowRename: boolean;
  renameLockedReason?: RoutineRenameLockedReason | null;
  palette: Palette;
  size?: 'large' | 'compact' | 'header';
  /** 미입력 시 힌트 — 기본값은 `fallback` */
  placeholder?: string;
  /** 헤더 등 좁은 영역에서는 잠금 안내를 숨길 수 있음 */
  showLockHint?: boolean;
}) {
  const { t: translate } = useTranslation();
  const titleStyle =
    size === 'header'
      ? styles.mainTitleHeader
      : size === 'large'
        ? styles.mainTitleLarge
        : styles.mainTitleCompact;
  const titleInputStyle =
    size === 'header'
      ? styles.mainTitleInputHeader
      : size === 'large'
        ? styles.mainTitleInputLarge
        : styles.mainTitleInputCompact;
  const fallbackTrimmed = fallback.trim();
  const placeholderText = placeholder ?? fallbackTrimmed;
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
        const persisted = persistRoutineDisplayName(draftRef.current, fallbackTrimmed);
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
    const persisted = persistRoutineDisplayName(raw, fallbackTrimmed);
    syncKeyRef.current = `${persisted}\0${fallbackTrimmed}`;
    onChangeValueRef.current(persisted);
    setDraft(persisted);
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
    setDraft(value);
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
    <View style={size === 'header' ? styles.listHeaderHeader : styles.listHeader}>
      {allowRename ? (
        <ThemedTextInput
          value={inputValue}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholderText}
          placeholderTextColor={palette.outline}
          style={[titleInputStyle, { color: palette.onSurface }]}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={handleBlur}
          multiline={false}
        />
      ) : (
        <ThemedText
          style={[
            titleStyle,
            { color: renameLockedReason ? palette.onVariant : palette.onSurface },
          ]}
          numberOfLines={size === 'header' ? 1 : undefined}>
          {idleTitle}
        </ThemedText>
      )}
      {showLockHint && renameLockedReason ? (
        <View style={styles.renameLockRow}>
          <IconSymbol name="lock.fill" size={13} color={palette.onVariant} />
          <ThemedText style={[styles.renameLockHint, { color: palette.onVariant }]}>
            {translate(ROUTINE_RENAME_LOCK_KEYS[renameLockedReason])}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  listHeader: { gap: 6, paddingTop: 2 },
  listHeaderHeader: { width: '100%', alignItems: 'center' },
  renameLockRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 2 },
  renameLockHint: { flex: 1, fontSize: 12, fontWeight: '400', lineHeight: 17 },
  mainTitleLarge: { fontSize: 15, lineHeight: 22, fontWeight: '500', letterSpacing: -0.2 },
  mainTitleInputLarge: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.2,
    padding: 0,
  },
  mainTitleCompact: { fontSize: 15, lineHeight: 22, fontWeight: '500', letterSpacing: -0.2 },
  mainTitleInputCompact: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    letterSpacing: -0.2,
    padding: 0,
  },
  mainTitleHeader: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  mainTitleInputHeader: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.2,
    textAlign: 'center',
    padding: 0,
    width: '100%',
  },
});
