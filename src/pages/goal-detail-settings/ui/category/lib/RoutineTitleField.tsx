import { StyleSheet, TextInput, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { goalDetailSettingsPalette } from './settingsPalette';

export type RoutineRenameLockedReason = 'running' | 'today';

const LOCK_MESSAGES: Record<RoutineRenameLockedReason, string> = {
  running: '루틴이 실행 중일 때는 변경할 수 없어요',
  today: '오늘 루틴에서는 이름을 변경할 수 없어요',
};

type Palette = ReturnType<typeof goalDetailSettingsPalette>;

export function RoutineTitleField({
  value,
  onChangeValue,
  fallback,
  allowRename,
  renameLockedReason = null,
  palette,
  size = 'large',
  placeholder = '루틴 이름 입력',
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
  const displayTitle = value.trim() || fallback;

  return (
    <View style={styles.listHeader}>
      {allowRename ? (
        <TextInput
          value={value}
          onChangeText={onChangeValue}
          placeholder={placeholder}
          placeholderTextColor={palette.outline}
          style={[titleInputStyle, { color: palette.onSurface }]}
          maxLength={40}
          returnKeyType="done"
        />
      ) : (
        <ThemedText
          style={[
            titleStyle,
            { color: renameLockedReason ? palette.onVariant : palette.onSurface },
          ]}>
          {displayTitle}
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
