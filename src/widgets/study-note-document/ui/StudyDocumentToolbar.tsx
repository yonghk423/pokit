import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@shared/ui/icon-symbol';

import type { StudyNoteDocumentPalette } from '../lib/studyNoteDocumentPalette';

type Palette = StudyNoteDocumentPalette;

export type StudyToolbarAction =
  | 'checklist'
  | 'bullet'
  | 'numbered'
  | 'bold'
  | 'underline'
  | 'link'
  | 'table'
  | 'image'
  | 'undo'
  | 'redo'
  | 'reset-document';

type Props = {
  palette: Palette;
  surfaceBg?: string;
  canUndo: boolean;
  canRedo: boolean;
  canResetDocument: boolean;
  onAction: (action: StudyToolbarAction) => void;
};

function ToolBtn({
  label,
  icon,
  onPress,
  palette,
  surfaceBg = '#F5F2EB',
  disabled = false,
  active = false,
}: {
  label: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  onPress: () => void;
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

export function StudyDocumentToolbar({
  palette,
  surfaceBg,
  canUndo,
  canRedo,
  canResetDocument,
  onAction,
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
          onPress={() => onAction('undo')}
        />
        <ToolBtn
          label="다시 실행"
          icon="arrow.uturn.forward"
          palette={palette}
          surfaceBg={surfaceBg}
          disabled={!canRedo}
          onPress={() => onAction('redo')}
        />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn label="체크리스트" icon="checkmark.square" palette={palette} surfaceBg={surfaceBg} onPress={() => onAction('checklist')} />
        <ToolBtn label="글머리 목록" icon="list.bullet" palette={palette} surfaceBg={surfaceBg} onPress={() => onAction('bullet')} />
        <ToolBtn label="번호 목록" icon="list.number" palette={palette} surfaceBg={surfaceBg} onPress={() => onAction('numbered')} />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn label="굵게" icon="bold" palette={palette} surfaceBg={surfaceBg} onPress={() => onAction('bold')} />
        <ToolBtn label="밑줄" icon="underline" palette={palette} surfaceBg={surfaceBg} onPress={() => onAction('underline')} />
        <ToolBtn label="링크" icon="link" palette={palette} surfaceBg={surfaceBg} onPress={() => onAction('link')} />
        <ToolBtn label="표" icon="tablecells" palette={palette} surfaceBg={surfaceBg} onPress={() => onAction('table')} />
        <ToolBtn label="이미지" icon="photo" palette={palette} surfaceBg={surfaceBg} onPress={() => onAction('image')} />
        <View style={[styles.divider, { backgroundColor: palette.outlineVariant }]} />
        <ToolBtn
          label="노트 전체 지우기"
          icon="arrow.counterclockwise"
          palette={palette}
          surfaceBg={surfaceBg}
          disabled={!canResetDocument}
          onPress={() => onAction('reset-document')}
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
});
