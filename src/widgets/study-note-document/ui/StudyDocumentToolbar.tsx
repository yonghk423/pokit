import { Pressable, StyleSheet, View } from 'react-native';

import { useTranslation } from '@shared/lib/i18n';
import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';

type Palette = StudyNoteDocumentPalette;

export type StudyToolbarAction =
  | 'heading-1'
  | 'heading-2'
  | 'heading-3'
  | 'body-text'
  | 'checklist'
  | 'bullet'
  | 'numbered'
  | 'bold'
  | 'underline'
  | 'text-color'
  | 'link'
  | 'table'
  | 'image'
  | 'undo'
  | 'redo'
  | 'insert-line-top'
  | 'insert-line-bottom'
  | 'reset-document'
  | 'dismiss-keyboard';

type Props = {
  palette: Palette;
  surfaceBg?: string;
  canUndo: boolean;
  canRedo: boolean;
  canResetDocument: boolean;
  activeBold?: boolean;
  activeUnderline?: boolean;
  activeTextColor?: string;
  colorPickerOpen?: boolean;
  linkPickerOpen?: boolean;
  activeHeadingLevel?: 1 | 2 | 3 | null;
  activeListKind?: 'checklist' | 'bullet' | 'numbered' | null;
  onAction: (action: StudyToolbarAction) => void;
  /** 툴바 탭 시 본문 입력 포커스·키보드 유지 */
  onRetainKeyboardFocus?: () => void;
  /** `stack`: 오늘 탭 노트. 3행 3열로 플로트 버튼 위에 둔다. */
  layout?: 'bar' | 'stack';
};

function ToolBtn({
  label,
  icon,
  onPress,
  onRetainKeyboardFocus,
  palette,
  surfaceBg = '#F5F2EB',
  disabled = false,
  active = false,
}: {
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  onPress: () => void;
  onRetainKeyboardFocus?: () => void;
  palette: Palette;
  surfaceBg?: string;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPressIn={onRetainKeyboardFocus}
      onPress={onPress}
      style={[
        styles.toolBtn,
        {
          borderColor: active ? palette.onSurface : palette.outlineVariant,
          backgroundColor: active ? 'rgba(0,0,0,0.06)' : surfaceBg,
          opacity: disabled ? 0.35 : 1,
        },
      ]}>
      <IconSymbol name={icon} size={18} color={palette.onSurface} />
    </Pressable>
  );
}

function LabelToolBtn({
  label,
  text,
  onPress,
  onRetainKeyboardFocus,
  palette,
  surfaceBg = '#F5F2EB',
  active = false,
  textStyle,
}: {
  label: string;
  text: string;
  onPress: () => void;
  onRetainKeyboardFocus?: () => void;
  palette: Palette;
  surfaceBg?: string;
  active?: boolean;
  textStyle?: object;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => {
        onRetainKeyboardFocus?.();
        onPress();
      }}
      style={[
        styles.toolBtn,
        {
          borderColor: active ? palette.onSurface : palette.outlineVariant,
          backgroundColor: active ? 'rgba(0,0,0,0.06)' : surfaceBg,
        },
      ]}>
      <ThemedText style={[styles.labelBtnText, { color: palette.onSurface }, textStyle]}>{text}</ThemedText>
    </Pressable>
  );
}

export function StudyDocumentToolbar({
  palette,
  surfaceBg,
  canUndo,
  canRedo,
  canResetDocument,
  activeBold = false,
  activeUnderline = false,
  activeTextColor,
  colorPickerOpen = false,
  linkPickerOpen = false,
  activeHeadingLevel = null,
  activeListKind = null,
  onAction,
  onRetainKeyboardFocus,
  layout = 'bar',
}: Props) {
  const { t } = useTranslation();
  const undo = (
    <ToolBtn
      label={t('studyNote.undo')}
      icon="arrow.uturn.backward"
      palette={palette}
      surfaceBg={surfaceBg}
      disabled={!canUndo}
      onRetainKeyboardFocus={onRetainKeyboardFocus}
      onPress={() => onAction('undo')}
    />
  );
  const redo = (
    <ToolBtn
      label={t('studyNote.redo')}
      icon="arrow.uturn.forward"
      palette={palette}
      surfaceBg={surfaceBg}
      disabled={!canRedo}
      onRetainKeyboardFocus={onRetainKeyboardFocus}
      onPress={() => onAction('redo')}
    />
  );
  const bullet = (
    <ToolBtn
      label={t('studyNote.toolbarBullet')}
      icon="list.bullet"
      palette={palette}
      surfaceBg={surfaceBg}
      active={activeListKind === 'bullet'}
      onRetainKeyboardFocus={onRetainKeyboardFocus}
      onPress={() => onAction('bullet')}
    />
  );
  const numbered = (
    <ToolBtn
      label={t('studyNote.toolbarNumbered')}
      icon="list.number"
      palette={palette}
      surfaceBg={surfaceBg}
      active={activeListKind === 'numbered'}
      onRetainKeyboardFocus={onRetainKeyboardFocus}
      onPress={() => onAction('numbered')}
    />
  );
  const body = (
    <LabelToolBtn
      label={t('studyNote.toolbarBodyText')}
      text="가"
      palette={palette}
      surfaceBg={surfaceBg}
      active={activeHeadingLevel == null}
      onRetainKeyboardFocus={onRetainKeyboardFocus}
      onPress={() => onAction('body-text')}
    />
  );
  const reset = (
    <ToolBtn
      label={t('studyNote.toolbarClearAll')}
      icon="arrow.counterclockwise"
      palette={palette}
      surfaceBg={surfaceBg}
      disabled={!canResetDocument}
      onRetainKeyboardFocus={onRetainKeyboardFocus}
      onPress={() => onAction('reset-document')}
    />
  );
  const dismiss = (
    <ToolBtn
      label={t('studyNote.toolbarDismissKeyboard')}
      icon="keyboard.chevron.compact.down"
      palette={palette}
      surfaceBg={surfaceBg}
      onPress={() => onAction('dismiss-keyboard')}
    />
  );

  if (layout === 'stack') {
    return (
      <View style={styles.stack}>
        <View style={styles.stackRow}>
          {undo}
          {redo}
          {bullet}
        </View>
        <View style={styles.stackRow}>
          {numbered}
          {body}
          {reset}
        </View>
        <View style={styles.stackRow}>
          <View style={styles.stackSlot} />
          <View style={styles.stackSlot} />
          {dismiss}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, surfaceBg ? { backgroundColor: surfaceBg } : null]}>
      <View style={styles.row}>
        {undo}
        {redo}
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        {bullet}
        {numbered}
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        {body}
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        {reset}
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        {dismiss}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  stack: {
    alignItems: 'flex-end',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  stackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  stackSlot: {
    width: 34,
    height: 34,
  },
  toolBtn: {
    width: 34,
    height: 34,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 22,
    marginHorizontal: 1,
  },
  labelBtnText: {
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 13,
    includeFontPadding: false,
    letterSpacing: -0.2,
  },
});
