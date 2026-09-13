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
}: Props) {
  const { t } = useTranslation();
  return (
    <View style={[styles.root, surfaceBg ? { backgroundColor: surfaceBg } : null]}>
      <View style={styles.row}>
        <ToolBtn
          label={t('studyNote.undo')}
          icon="arrow.uturn.backward"
          palette={palette}
          surfaceBg={surfaceBg}
          disabled={!canUndo}
          onRetainKeyboardFocus={onRetainKeyboardFocus}
          onPress={() => onAction('undo')}
        />
        <ToolBtn
          label={t('studyNote.redo')}
          icon="arrow.uturn.forward"
          palette={palette}
          surfaceBg={surfaceBg}
          disabled={!canRedo}
          onRetainKeyboardFocus={onRetainKeyboardFocus}
          onPress={() => onAction('redo')}
        />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn label={t('studyNote.toolbarBullet')} icon="list.bullet" palette={palette} surfaceBg={surfaceBg} active={activeListKind === 'bullet'} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('bullet')} />
        <ToolBtn label={t('studyNote.toolbarNumbered')} icon="list.number" palette={palette} surfaceBg={surfaceBg} active={activeListKind === 'numbered'} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('numbered')} />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <LabelToolBtn
          label={t('studyNote.toolbarBodyText')}
          text="가"
          palette={palette}
          surfaceBg={surfaceBg}
          active={activeHeadingLevel == null}
          onRetainKeyboardFocus={onRetainKeyboardFocus}
          onPress={() => onAction('body-text')}
        />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn label={t('studyNote.toolbarLink')} icon="link" palette={palette} surfaceBg={surfaceBg} active={linkPickerOpen} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('link')} />
        <ToolBtn label={t('studyNote.toolbarImage')} icon="photo" palette={palette} surfaceBg={surfaceBg} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('image')} />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn
          label={t('studyNote.toolbarClearAll')}
          icon="arrow.counterclockwise"
          palette={palette}
          surfaceBg={surfaceBg}
          disabled={!canResetDocument}
          onRetainKeyboardFocus={onRetainKeyboardFocus}
          onPress={() => onAction('reset-document')}
        />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn
          label={t('studyNote.toolbarDismissKeyboard')}
          icon="keyboard.chevron.compact.down"
          palette={palette}
          surfaceBg={surfaceBg}
          onPress={() => onAction('dismiss-keyboard')}
        />
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
