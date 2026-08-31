import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';
import { ThemedText } from '@shared/ui/themed-text';

import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';

type Palette = StudyNoteDocumentPalette;

export type StudyToolbarAction =
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
      onTouchStart={onRetainKeyboardFocus}
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

function TextColorIcon({
  ink,
  barColor,
}: {
  ink: string;
  barColor: string;
}) {
  return (
    <View style={styles.textColorIcon} accessibilityElementsHidden>
      <ThemedText style={[styles.textColorLetter, { color: ink }]}>A</ThemedText>
      <View style={[styles.textColorBar, { backgroundColor: barColor }]} />
    </View>
  );
}

function ColorToolBtn({
  label,
  onPress,
  onRetainKeyboardFocus,
  palette,
  surfaceBg = '#F5F2EB',
  activeColor,
  active = false,
}: {
  label: string;
  onPress: () => void;
  onRetainKeyboardFocus?: () => void;
  palette: Palette;
  surfaceBg?: string;
  activeColor?: string;
  active?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onTouchStart={onRetainKeyboardFocus}
      onPressIn={onRetainKeyboardFocus}
      onPress={onPress}
      style={[
        styles.toolBtn,
        {
          borderColor: active ? palette.onSurface : palette.outlineVariant,
          backgroundColor: active ? 'rgba(0,0,0,0.06)' : surfaceBg,
        },
      ]}>
      <TextColorIcon
        ink={palette.onSurface}
        barColor={activeColor ?? palette.onSurface}
      />
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
  activeListKind = null,
  onAction,
  onRetainKeyboardFocus,
}: Props) {
  return (
    <View style={[styles.root, surfaceBg ? { backgroundColor: surfaceBg } : null]}>
      <View style={styles.row}>
        <ToolBtn
          label="실행 취소"
          icon="arrow.uturn.backward"
          palette={palette}
          surfaceBg={surfaceBg}
          disabled={!canUndo}
          onRetainKeyboardFocus={onRetainKeyboardFocus}
          onPress={() => onAction('undo')}
        />
        <ToolBtn
          label="다시 실행"
          icon="arrow.uturn.forward"
          palette={palette}
          surfaceBg={surfaceBg}
          disabled={!canRedo}
          onRetainKeyboardFocus={onRetainKeyboardFocus}
          onPress={() => onAction('redo')}
        />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn
          label="맨 위에 줄 추가"
          icon="arrow.up.to.line"
          palette={palette}
          surfaceBg={surfaceBg}
          onRetainKeyboardFocus={onRetainKeyboardFocus}
          onPress={() => onAction('insert-line-top')}
        />
        <ToolBtn
          label="맨 아래에 줄 추가"
          icon="arrow.down.to.line"
          palette={palette}
          surfaceBg={surfaceBg}
          onRetainKeyboardFocus={onRetainKeyboardFocus}
          onPress={() => onAction('insert-line-bottom')}
        />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn label="체크리스트" icon="checkmark.square" palette={palette} surfaceBg={surfaceBg} active={activeListKind === 'checklist'} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('checklist')} />
        <ToolBtn label="글머리 목록" icon="list.bullet" palette={palette} surfaceBg={surfaceBg} active={activeListKind === 'bullet'} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('bullet')} />
        <ToolBtn label="번호 목록" icon="list.number" palette={palette} surfaceBg={surfaceBg} active={activeListKind === 'numbered'} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('numbered')} />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn label="굵게" icon="bold" palette={palette} surfaceBg={surfaceBg} active={activeBold} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('bold')} />
        <ToolBtn label="밑줄" icon="underline" palette={palette} surfaceBg={surfaceBg} active={activeUnderline} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('underline')} />
        <ColorToolBtn
          label="글자 색"
          palette={palette}
          surfaceBg={surfaceBg}
          activeColor={activeTextColor}
          active={colorPickerOpen || Boolean(activeTextColor)}
          onRetainKeyboardFocus={onRetainKeyboardFocus}
          onPress={() => onAction('text-color')}
        />
        <ToolBtn label="링크" icon="link" palette={palette} surfaceBg={surfaceBg} active={linkPickerOpen} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('link')} />
        <ToolBtn label="표" icon="tablecells" palette={palette} surfaceBg={surfaceBg} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('table')} />
        <ToolBtn label="이미지" icon="photo" palette={palette} surfaceBg={surfaceBg} onRetainKeyboardFocus={onRetainKeyboardFocus} onPress={() => onAction('image')} />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn
          label="노트 전체 지우기"
          icon="arrow.counterclockwise"
          palette={palette}
          surfaceBg={surfaceBg}
          disabled={!canResetDocument}
          onRetainKeyboardFocus={onRetainKeyboardFocus}
          onPress={() => onAction('reset-document')}
        />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn
          label="키보드 내리기"
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
  textColorIcon: {
    width: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  textColorLetter: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 15,
    includeFontPadding: false,
  },
  textColorBar: {
    width: 14,
    height: 3,
    borderRadius: 1,
  },
});
